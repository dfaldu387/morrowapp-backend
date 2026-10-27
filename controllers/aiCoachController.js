const pool = require('../config/database');
const OpenAI = require('openai');

const HISTORY_RETENTION_DAYS = 7;

let openai = null;
function getOpenAI() {
  if (!openai && process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('your-openai')) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

// Auto-delete messages older than 7 days
async function cleanOldMessages(userId) {
  await pool.query(
    `DELETE FROM ai_chat_messages WHERE user_id = $1 AND created_at < NOW() - INTERVAL '${HISTORY_RETENTION_DAYS} days'`,
    [userId]
  );
}

// Helper: format date as YYYY-MM-DD
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Helper: calculate streak info
function getStreakInfo(completedDates) {
  const total = completedDates.length;
  if (total === 0) return { current: 0, longest: 0, total: 0 };
  const sorted = [...completedDates].sort();
  const today = new Date();
  const todayStr = formatDate(today);
  let current = 0;

  if (completedDates.includes(todayStr)) {
    current = 1;
    const d = new Date(today);
    while (true) {
      d.setDate(d.getDate() - 1);
      if (completedDates.includes(formatDate(d))) { current++; } else { break; }
    }
  } else {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (completedDates.includes(formatDate(yesterday))) {
      current = 1;
      const d = new Date(yesterday);
      while (true) {
        d.setDate(d.getDate() - 1);
        if (completedDates.includes(formatDate(d))) { current++; } else { break; }
      }
    }
  }

  let longest = 1, streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (curr - prev) / (1000 * 60 * 60 * 24);
    if (diff === 1) { streak++; if (streak > longest) longest = streak; }
    else if (diff > 1) { streak = 1; }
  }
  longest = Math.max(longest, streak);
  return { current, longest, total };
}

// Get user context for AI: habits, categories, completions, streaks
async function getUserContext(userId) {
  const habits = await pool.query('SELECT * FROM habits WHERE user_id = $1 AND archived = false', [userId]);
  const habitIds = habits.rows.map(h => h.id);

  let completions = [];
  if (habitIds.length > 0) {
    const compResult = await pool.query(
      'SELECT habit_id, completed_date::text FROM habit_completions WHERE habit_id = ANY($1)',
      [habitIds]
    );
    completions = compResult.rows;
  }

  // Get user's selected categories
  const categories = await pool.query(
    `SELECT c.name, c.emoji FROM user_categories uc
     JOIN categories c ON c.id = uc.category_id
     WHERE uc.user_id = $1 AND c.is_active = true
     ORDER BY c.sort_order`,
    [userId]
  );

  // Get recent chat history for conversation context
  const recentMessages = await pool.query(
    'SELECT message, is_user FROM ai_chat_messages WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
    [userId]
  );

  const today = formatDate(new Date());
  const hour = new Date().getHours();

  const habitData = habits.rows.map(h => {
    const dates = completions.filter(c => c.habit_id === h.id).map(c => c.completed_date);
    const streakInfo = getStreakInfo(dates);
    return {
      name: h.name,
      emoji: h.emoji,
      category: h.category,
      routine: h.routine,
      schedule: h.schedule || [],
      completedToday: dates.includes(today),
      currentStreak: streakInfo.current,
      longestStreak: streakInfo.longest,
      totalCompletions: streakInfo.total,
    };
  });

  const completed = habitData.filter(h => h.completedToday);
  const remaining = habitData.filter(h => !h.completedToday);
  const totalCompletions = habitData.reduce((sum, h) => sum + h.totalCompletions, 0);
  const bestStreak = Math.max(0, ...habitData.map(h => h.currentStreak));

  return {
    habits: habitData,
    categories: categories.rows,
    completed,
    remaining,
    totalCompletions,
    bestStreak,
    today,
    hour,
    chatHistory: recentMessages.rows.reverse(),
  };
}

// Build system prompt with full user context
function buildSystemPrompt(ctx) {
  const timeOfDay = ctx.hour < 12 ? 'morning' : ctx.hour < 17 ? 'afternoon' : 'evening';

  let habitSummary = 'No habits set up yet.';
  if (ctx.habits.length > 0) {
    habitSummary = ctx.habits.map(h =>
      `- ${h.emoji} ${h.name} (${h.category}) — streak: ${h.currentStreak}d, total: ${h.totalCompletions}, today: ${h.completedToday ? 'done' : 'not done'}`
    ).join('\n');
  }

  let categorySummary = 'No categories selected.';
  if (ctx.categories.length > 0) {
    categorySummary = ctx.categories.map(c => `${c.emoji} ${c.name}`).join(', ');
  }

  return `You are Ducky, a friendly and supportive AI habit coach in the Morrow app. You help users build positive habits, stay motivated, and track their progress.

Personality:
- Warm, encouraging, and concise
- Use casual tone but be genuinely helpful
- Use markdown bold (**text**) for emphasis
- Keep responses short (2-4 sentences usually, longer only when giving stats or tips)
- Use emojis sparingly and naturally

Current context:
- Time: ${timeOfDay} (${ctx.hour}:00)
- Date: ${ctx.today}

User's selected interest categories: ${categorySummary}

User's habits:
${habitSummary}

Today's progress: ${ctx.completed.length}/${ctx.habits.length} completed
${ctx.remaining.length > 0 ? `Remaining today: ${ctx.remaining.map(h => `${h.emoji} ${h.name}`).join(', ')}` : 'All habits completed today!'}
Total all-time completions: ${ctx.totalCompletions}
Best current streak: ${ctx.bestStreak} days

Guidelines:
- Reference the user's actual habits, streaks, and progress in your responses
- If they ask for suggestions, base them on their selected categories and existing habits
- If they seem overwhelmed, suggest focusing on fewer habits
- Celebrate their wins and streaks
- If they have no habits yet, help them get started based on their categories
- Never make up data — only reference the stats provided above
- When suggesting new habits, make them specific, small, and actionable`;
}

// GET /api/ai-coach/history
exports.getHistory = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    await cleanOldMessages(req.user.id);

    const result = await pool.query(
      'SELECT id, message, is_user, created_at FROM ai_chat_messages WHERE user_id = $1 ORDER BY created_at ASC LIMIT $2 OFFSET $3',
      [req.user.id, limit, offset]
    );

    res.json(result.rows.map(r => ({
      id: r.id,
      text: r.message,
      isUser: r.is_user,
      timestamp: r.created_at,
    })));
  } catch (err) {
    next(err);
  }
};

// POST /api/ai-coach/message
exports.sendMessage = async (req, res, next) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    await cleanOldMessages(req.user.id);

    // Save user message
    await pool.query(
      'INSERT INTO ai_chat_messages (user_id, message, is_user) VALUES ($1, $2, true)',
      [req.user.id, message.trim()]
    );

    // Get full user context
    const ctx = await getUserContext(req.user.id);

    const ai = getOpenAI();
    if (!ai) {
      // No OpenAI key — return a friendly message
      const responseText = "Ducky AI is not configured yet. Please add your OpenAI API key to the backend .env file.";
      await pool.query(
        'INSERT INTO ai_chat_messages (user_id, message, is_user) VALUES ($1, $2, false)',
        [req.user.id, responseText]
      );
      return res.json({ text: responseText });
    }

    // Build conversation messages for OpenAI
    const messages = [
      { role: 'system', content: buildSystemPrompt(ctx) },
    ];

    // Add recent chat history for conversation continuity
    for (const msg of ctx.chatHistory) {
      messages.push({
        role: msg.is_user ? 'user' : 'assistant',
        content: msg.message,
      });
    }

    // Add current message
    messages.push({ role: 'user', content: message.trim() });

    // Call OpenAI
    const completion = await ai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    const responseText = completion.choices[0].message.content || "I'm here to help! What would you like to know about your habits?";

    // Save AI response
    await pool.query(
      'INSERT INTO ai_chat_messages (user_id, message, is_user) VALUES ($1, $2, false)',
      [req.user.id, responseText]
    );

    res.json({ text: responseText });
  } catch (err) {
    if (err.status === 401 || err.code === 'invalid_api_key') {
      console.error('OpenAI API key is invalid or missing');
      return res.status(500).json({ error: 'AI service is not configured. Please add a valid OpenAI API key.' });
    }
    console.error('AI Coach error:', err.message);
    next(err);
  }
};

// DELETE /api/ai-coach/history
exports.clearHistory = async (req, res, next) => {
  try {
    await pool.query('DELETE FROM ai_chat_messages WHERE user_id = $1', [req.user.id]);
    res.json({ message: 'Chat history cleared' });
  } catch (err) {
    next(err);
  }
};

// GET /api/ai-coach/suggestions
// Returns suggested questions based on user's categories, habits, and progress
exports.getSuggestions = async (req, res, next) => {
  try {
    const ctx = await getUserContext(req.user.id);

    const suggestions = [];

    // Based on habits progress
    if (ctx.habits.length === 0) {
      // No habits — suggest based on categories
      if (ctx.categories.length > 0) {
        const catNames = ctx.categories.map(c => c.name);
        suggestions.push(`Suggest habits for ${catNames.slice(0, 2).join(' and ')}`);
        suggestions.push('Help me create my first habit');
        suggestions.push('What habits should a beginner start with?');
      } else {
        suggestions.push('Help me get started with habits');
        suggestions.push('What are the best habits for productivity?');
        suggestions.push('Suggest some easy daily habits');
      }
    } else if (ctx.remaining.length > 0) {
      // Has remaining habits today
      suggestions.push("What's the easiest habit I can do right now?");
      suggestions.push('Give me motivation to finish today');
      if (ctx.remaining.length > 2) {
        suggestions.push('I feel overwhelmed, help me prioritize');
      } else {
        suggestions.push('How am I doing today?');
      }
    } else if (ctx.completed.length === ctx.habits.length && ctx.habits.length > 0) {
      // All done today
      suggestions.push('Show me my progress and stats');
      suggestions.push('Suggest a new habit to add');
      if (ctx.bestStreak >= 7) {
        suggestions.push(`How do I keep my ${ctx.bestStreak}-day streak going?`);
      } else {
        suggestions.push('Tips to build longer streaks');
      }
    }

    // Category-specific suggestions
    if (ctx.categories.length > 0) {
      const catMap = {
        'Health': 'What are the best health habits for my routine?',
        'Fitness': 'Help me build a workout habit',
        'Mindfulness': 'How can I be more mindful daily?',
        'Productivity': 'Tips to be more productive every day',
        'Learning': 'How can I learn something new daily?',
        'Finance': 'What daily finance habits should I build?',
        'Social': 'How can I improve my social habits?',
        'Creativity': 'Suggest creative habits I can start',
        'Self-Care': 'What self-care habits do you recommend?',
      };
      for (const cat of ctx.categories) {
        if (catMap[cat.name] && suggestions.length < 6) {
          suggestions.push(catMap[cat.name]);
        }
      }
    }

    // Streak-based suggestions
    if (ctx.bestStreak > 0 && suggestions.length < 6) {
      suggestions.push('How do streaks help build habits?');
    }

    // Limit to 5 suggestions
    res.json({ suggestions: suggestions.slice(0, 5) });
  } catch (err) {
    next(err);
  }
};
