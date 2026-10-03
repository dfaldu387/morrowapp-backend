const pool = require('../config/database');

const HISTORY_RETENTION_DAYS = 7;

// Auto-delete messages older than 7 days
async function cleanOldMessages(userId) {
  await pool.query(
    `DELETE FROM ai_chat_messages WHERE user_id = $1 AND created_at < NOW() - INTERVAL '${HISTORY_RETENTION_DAYS} days'`,
    [userId]
  );
}

// GET /api/ai-coach/history
exports.getHistory = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    // Clean old messages first
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

    // Clean messages older than 7 days
    await cleanOldMessages(req.user.id);

    // Save user message
    await pool.query(
      'INSERT INTO ai_chat_messages (user_id, message, is_user) VALUES ($1, $2, true)',
      [req.user.id, message.trim()]
    );

    // Get user's habits for context
    const habits = await pool.query('SELECT * FROM habits WHERE user_id = $1 AND archived = false', [req.user.id]);
    const habitIds = habits.rows.map(h => h.id);

    let completions = [];
    if (habitIds.length > 0) {
      const compResult = await pool.query(
        'SELECT habit_id, completed_date::text FROM habit_completions WHERE habit_id = ANY($1)',
        [habitIds]
      );
      completions = compResult.rows;
    }

    const habitData = habits.rows.map(h => ({
      name: h.name,
      emoji: h.emoji,
      routine: h.routine,
      category: h.category,
      schedule: h.schedule || [],
      archived: h.archived,
      created_at: h.created_at,
      completedDates: completions.filter(c => c.habit_id === h.id).map(c => c.completed_date),
    }));

    // Generate AI response (full context-aware engine)
    const response = generateResponse(message, habitData);

    // Save AI response
    await pool.query(
      'INSERT INTO ai_chat_messages (user_id, message, is_user) VALUES ($1, $2, false)',
      [req.user.id, response.text]
    );

    res.json(response);
  } catch (err) {
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

// --- Full context-aware response engine ---

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

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

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function generateResponse(input, habits) {
  const lower = input.toLowerCase().trim();
  const today = formatDate(new Date());
  const hour = new Date().getHours();
  const active = habits.filter(h => !h.archived);
  const scheduled = active;
  const completed = scheduled.filter(h => h.completedDates.includes(today));
  const remaining = scheduled.filter(h => !h.completedDates.includes(today));

  let bestStreak = 0, longestStreak = 0, totalCompletions = 0;
  active.forEach(h => {
    const info = getStreakInfo(h.completedDates);
    if (info.current > bestStreak) bestStreak = info.current;
    if (info.longest > longestStreak) longestStreak = info.longest;
    totalCompletions += info.total;
  });

  // --- Greeting ---
  if (/^(h(i|ello|ey|owdy)|yo+|sup|what'?s?\s*up|good\s*(morning|afternoon|evening|night)|greetings|gm|morning)\b/i.test(lower)) {
    if (completed.length === scheduled.length && scheduled.length > 0) {
      return { text: `Hey! You've already completed all **${scheduled.length}** habits today. You're crushing it!` };
    }
    if (remaining.length > 0) {
      return { text: pickRandom([
        `Hey! You've got **${remaining.length}** habit${remaining.length > 1 ? 's' : ''} left today. ${remaining.length <= 2 ? 'Almost there!' : "Let's knock them out!"}`,
        `Hi there! You're at **${completed.length}/${scheduled.length}** for today. ${completed.length > 0 ? 'Nice progress so far!' : "Ready to get started?"}`,
      ]) };
    }
    return { text: "Hey! I'm **Ducky**, your habit coach. I can help you build habits, track progress, get motivated, and more. What's on your mind?" };
  }

  // --- Thanks ---
  if (/\b(thanks?|thank\s*you|thx|appreciate\s*it|cheers)\b/i.test(lower) && lower.length < 60) {
    return { text: pickRandom([
      "You're welcome! Remember, showing up is half the battle. I'm here whenever you need a boost!",
      "Anytime! Keep going — consistency beats perfection every time.",
      "Happy to help! You're doing great by actively working on your habits.",
    ]) };
  }

  // --- Goodbye ---
  if (/\b(bye|goodbye|see\s*y(ou|a)|later|that'?s\s*all|done|gotta\s*go|gtg|good\s*night|night|cya)\b/i.test(lower) && lower.length < 50) {
    return { text: pickRandom([
      "See you later! Remember: even a 1% effort day beats a 0% day.",
      "Bye! Come back anytime. Your habits are waiting for you!",
      "Take care! I'll be here when you need me. Keep showing up!",
    ]) };
  }

  // --- Help / Capabilities ---
  if (/\b(help|what (can|do) you do|how does this work|capabilities|features|options|what are you|who are you|menu|commands)\b/i.test(lower)) {
    return { text: "I'm **Ducky**, your AI habit coach! Here's what I can do:\n\n- **Track progress** — ask \"How am I doing?\"\n- **Motivate you** — say \"Give me motivation\"\n- **Find quick wins** — ask \"What's the easiest habit?\"\n- **Suggest habits** — say \"Suggest a new habit\"\n- **Show stats** — ask \"Show my streaks\"\n- **Set goals** — say \"Help me plan a goal\"\n- **Coach you** — ask \"Tips to improve\"\n\nOr just tell me how you're feeling — I'll help from there!" };
  }

  // --- Easiest / Quick win ---
  if (/\b(easiest|easy|quick(est)?|simple(st)?|fast(est)?|low(est)?\s*effort|small(est)?|short(est)?|which\s*one|what\s*should\s*i\s*do|do\s*first|start\s*with|one\s*thing|least\s*effort|no\s*brainer|can\s*do\s*now)\b/i.test(lower)) {
    if (remaining.length === 0) {
      return { text: "You've already completed all your habits for today! Nothing left to do but celebrate." };
    }
    const sorted = [...remaining].sort((a, b) => b.completedDates.length - a.completedDates.length);
    const easiest = sorted[0];
    return {
      text: `Your most consistent incomplete habit is **${easiest.emoji} ${easiest.name}** — you've done it **${easiest.completedDates.length}** times total. Since you're already good at it, this should be a quick win!\n\nGo do it and come back to check it off.`,
    };
  }

  // --- Motivation / Feeling down ---
  if (/\b(motivat|unmotivat|inspir|encourag|pump\s*me|feel(ing)?\s*(down|low|bad|sad|lazy|tired|unmotivated|blah|meh)|can'?t\s*be\s*bothered|no\s*energy|exhaust|don'?t\s*(want|feel\s*like)|need\s*a\s*(push|boost|kick)|cheer\s*me|pick\s*me\s*up|pep\s*talk)/i.test(lower)) {
    const msgs = [
      totalCompletions > 0
        ? `You've completed **${totalCompletions}** habit check-ins total. Every single one was a choice to show up for yourself.`
        : 'Today is the perfect day to start. One check-in is all it takes to begin building momentum.',
      bestStreak > 0
        ? `Your current best streak is **${bestStreak}** days. Don't break the chain!`
        : "Start today and build a streak you'll be proud of.",
      pickRandom([
        "Remember: you don't have to be perfect. You just have to be **consistent**. Small steps compound into massive change.",
        "The person you want to become is built one habit at a time. Every small action matters.",
        "Motivation fades, but **discipline** carries you through. Just start — the rest follows.",
        "Think about future you — they'll thank you for showing up today, even when it was hard.",
      ]),
    ];
    return { text: msgs.join('\n\n') };
  }

  // --- Struggle / Overwhelm ---
  if (/(struggl|difficult|can'?t\s*keep\s*up|failing|behind|overwhelm|stress|anxious|too\s*much|burn(t|ed)?\s*out|give\s*up|quit|impossible|frustrat|hopeless|lost|stuck|confused|don'?t\s*know\s*(what|how|where))/i.test(lower)) {
    const habitCount = active.length;
    const advice = habitCount > 5
      ? `You have **${habitCount}** active habits — that might be too many at once. Research shows starting with **2-3 habits** is ideal. Consider archiving some and focusing on the ones that matter most.`
      : habitCount > 0
        ? `You have **${habitCount}** active habit${habitCount > 1 ? 's' : ''}. That's manageable! The key is to make each one **so small** it's almost impossible to skip.`
        : "Starting fresh is perfectly fine! Let's set up just **one** habit — something so small it takes less than 2 minutes.";
    return { text: `I hear you — building habits is genuinely hard, and struggling doesn't mean you're failing. It means you're trying.\n\n${advice}\n\n${pickRandom([
      '**Tip:** On tough days, give yourself permission to do the bare minimum. A 1-minute meditation still counts.',
      '**Tip:** Never miss twice in a row. Missing once is human — missing twice starts a new pattern.',
      '**Tip:** If a habit feels impossible, make it smaller. "Read 1 page" beats "Read 30 minutes" on a hard day.',
    ])}` };
  }

  // --- Celebrate / Proud ---
  if (/\b(celebrat|proud|achievement|milestone|yay|amazing|awesome|great job|nailed|crush(ed|ing)?|did\s*it|killed?\s*it|perfect|woohoo|woo|smash|aced|boom|on\s*fire|winning|victory)\b/i.test(lower)) {
    return { text: pickRandom([
      `That's awesome! You should be proud — you've logged **${totalCompletions}** total completions. Every one of those is proof that you show up.`,
      `Celebration is fuel for habits! ${bestStreak > 0 ? `Your **${bestStreak}-day** streak is seriously impressive. ` : ''}Keep riding this wave!`,
      `YES! This energy is exactly what builds lasting habits. Remember this feeling next time it's hard to start — you always feel better after.`,
    ]) };
  }

  // --- Suggest / Recommend ---
  if (/\b(suggest|recommend|new\s*habit|what\s*should\s*i\s*(add|try|start|track)|idea|add\s*a|create\s*a|give\s*me\s*a|another\s*habit|more\s*habits|what\s*else|something\s*new)\b/i.test(lower)) {
    const existingNames = new Set(active.map(h => h.name.toLowerCase()));
    const allSuggestions = [
      { name: 'Morning stretch routine', emoji: '🧘' },
      { name: 'No phone for first hour', emoji: '📵' },
      { name: "Write 3 things you're grateful for", emoji: '🙏' },
      { name: 'Walk for 20 minutes', emoji: '🚶' },
      { name: 'Drink a glass of water on waking', emoji: '💧' },
      { name: 'Read for 15 minutes before bed', emoji: '📚' },
      { name: 'Take a 5-minute breathing break', emoji: '🌬️' },
      { name: 'Write in a journal for 10 minutes', emoji: '📝' },
      { name: 'Do 10 push-ups', emoji: '💪' },
      { name: 'Practice a skill for 15 minutes', emoji: '🎯' },
      { name: 'Tidy one area of your space', emoji: '🧹' },
      { name: 'Connect with a friend or family', emoji: '💬' },
    ].filter(s => !existingNames.has(s.name.toLowerCase()));
    const shuffled = [...allSuggestions].sort(() => Math.random() - 0.5).slice(0, 3);
    const suggestionText = shuffled.map(s => `- ${s.emoji} ${s.name}`).join('\n');
    return {
      text: active.length === 0
        ? `Let's get you started! Here are some popular habits that are easy to begin with:\n\n${suggestionText}`
        : `Based on your **${active.length}** current habit${active.length > 1 ? 's' : ''}, here are some great additions:\n\n${suggestionText}`,
      suggestions: shuffled.map((s, i) => ({ id: `s${i}`, ...s })),
    };
  }

  // --- Progress / Stats ---
  if (/\b(progress|stats?|how\s*(am\s*i|'?s\s*(it|my|everything)|is\s*it)|streak|overview|summary|score|report|doing|performance|track(ing)?|history|check[\s-]?in|results?|numbers?|data|dashboard|review)\b/i.test(lower)) {
    const todayRate = scheduled.length > 0 ? Math.round((completed.length / scheduled.length) * 100) : 0;
    return {
      text: `Here's your snapshot:\n\n- **Active habits:** ${active.length}\n- **Today:** ${completed.length}/${scheduled.length} completed (${todayRate}%)\n- **Current best streak:** ${bestStreak} days\n- **All-time best streak:** ${longestStreak} days\n- **Total completions:** ${totalCompletions}\n\n${
        todayRate === 100 ? "Perfect day! You've completed everything!" :
        todayRate >= 75 ? 'Almost there — finish strong!' :
        todayRate >= 50 ? 'Solid progress! Keep going!' :
        todayRate > 0 ? 'Good start — every habit counts!' :
        bestStreak > 5 ? "Your streak history shows you can do this. Let's get today going!" :
        'Every journey starts with day one. Let\'s go!'
      }`,
    };
  }

  // --- Reschedule / Skip ---
  if (/\b(reschedul|tonight|move\s*(to|them|it|my)|postpone|skip|push\s*(back|to)|defer|not\s*(now|right\s*now|today)|busy|no\s*time|ran\s*out|too\s*late|can'?t\s*today|missed|didn'?t\s*do)\b/i.test(lower)) {
    if (remaining.length === 0) {
      return { text: "All your habits are already done for today! Nothing to reschedule." };
    }
    return {
      text: `No worries! You have **${remaining.length}** habit${remaining.length > 1 ? 's' : ''} remaining:\n\n${remaining.map(h => `- ${h.emoji} ${h.name}`).join('\n')}\n\n${pickRandom([
        'Focus on just the one that matters most tonight.',
        'Even completing one is better than zero. Pick your favorite!',
        'Try the quickest one first — momentum is powerful.',
      ])}`,
    };
  }

  // --- Tips / Improve ---
  if (/\b(improve|better|tips?|advice|hack|tricks?|optimi[zs]|how\s*(to|do\s*i)|strateg|technique|method|system|level\s*up|upgrade|what\s*works|best\s*practice|science|research)\b/i.test(lower)) {
    const tipSets = [
      '1. **Start small** — begin with just 2 minutes per habit\n2. **Stack habits** — attach new ones to existing routines\n3. **Never miss twice** — one missed day is fine, two is a pattern\n4. **Environment design** — make good habits easy, bad habits hard\n5. **Track daily** — what gets measured gets managed',
      '1. **Identity-based habits** — don\'t say "I want to run", say "I am a runner"\n2. **Implementation intention** — decide "I will [habit] at [time] in [location]"\n3. **Reward yourself** — celebrate small wins immediately\n4. **Accountability** — tell someone about your habits\n5. **Reduce friction** — lay out gym clothes the night before',
      '1. **The 2-minute rule** — any habit should start with a 2-minute version\n2. **Habit stacking** — "After I [current habit], I will [new habit]"\n3. **Visual cues** — put reminders where you\'ll see them\n4. **Forgive yourself** — self-compassion predicts better habit recovery\n5. **Focus on systems** — goals set direction, systems make progress',
    ];
    return { text: `Here are my top coaching tips:\n\n${pickRandom(tipSets)}\n\nWhich one resonates most with you?` };
  }

  // --- Plan / Goal ---
  if (/\b(plan|goal|break\s*(it\s*|them\s*)?down|roadmap|strateg|want\s*to\s*(achieve|accomplish|do|be|become|start|learn|get|run|lose|gain|build|read|write|save|quit|stop|eat|sleep|exercise|train|practice)|long[\s-]?term|big\s*goal|dream|aspir|ambition|resolution|target|vision|purpose|life\s*change)\b/i.test(lower)) {
    return {
      text: "I can help you break down a big goal into daily habits!\n\nTell me your goal (e.g., \"I want to run a 5K\", \"I want to read 20 books this year\", \"I want to be more mindful\") and I'll create a habit plan for you.\n\n**The secret?** Big goals are just small habits done consistently.",
    };
  }

  // --- Morning / Evening routine / What's next ---
  if (/\b(morning\s*routine|evening\s*routine|night\s*routine|bedtime|what'?s?\s*next|what\s*now|what\s*should\s*i\s*do\s*(now|next|first|today)|schedule|order|routine|remaining|left\s*to\s*do|what'?s?\s*left)\b/i.test(lower)) {
    if (remaining.length === 0) {
      return { text: "You've completed everything for today! Rest up and come back tomorrow ready to go." };
    }
    const morningRemaining = remaining.filter(h => h.routine === 'morning');
    const eveningRemaining = remaining.filter(h => h.routine === 'evening');
    let suggestion;
    if (hour < 12 && morningRemaining.length > 0) {
      suggestion = `It's still morning — perfect time for:\n${morningRemaining.map(h => `- ${h.emoji} ${h.name}`).join('\n')}`;
    } else if (hour >= 17 && eveningRemaining.length > 0) {
      suggestion = `Evening's here — great time for:\n${eveningRemaining.map(h => `- ${h.emoji} ${h.name}`).join('\n')}`;
    } else {
      suggestion = `Here's what's remaining:\n${remaining.map(h => `- ${h.emoji} ${h.name}`).join('\n')}`;
    }
    return { text: `${suggestion}\n\nI'd suggest tackling them from quickest to longest. Build that momentum!` };
  }

  // --- Specific habit mention ---
  const mentionedHabit = active.find(h => lower.includes(h.name.toLowerCase()));
  if (mentionedHabit) {
    const info = getStreakInfo(mentionedHabit.completedDates);
    const isCompletedToday = mentionedHabit.completedDates.includes(today);
    return {
      text: `Here's how **${mentionedHabit.emoji} ${mentionedHabit.name}** is going:\n\n- **Current streak:** ${info.current} days\n- **Best streak:** ${info.longest} days\n- **Total completions:** ${info.total}\n- **Today:** ${isCompletedToday ? 'Done!' : 'Not yet'}\n\n${
        info.current > 7 ? "You're on an incredible streak! Don't break the chain!" :
        info.current > 0 ? 'Nice streak building! Keep showing up!' :
        info.total > 0 ? "You've done this before — you can pick it back up!" :
        'Just getting started — every master was once a beginner!'
      }`,
    };
  }

  // --- Smart fallback ---
  if (remaining.length > 0) {
    const easiest = [...remaining].sort((a, b) => b.completedDates.length - a.completedDates.length)[0];
    return {
      text: `I'm not sure I fully understood that, but here's what I know: you've got **${remaining.length}** habit${remaining.length > 1 ? 's' : ''} left today.${easiest ? ` **${easiest.emoji} ${easiest.name}** would be a great next step!` : ''}\n\nYou can ask me about your progress, get motivation, find the easiest habit, or get tips for improvement.`,
    };
  }

  if (completed.length === scheduled.length && scheduled.length > 0) {
    return {
      text: `I didn't quite catch that, but I can see you've completed all **${scheduled.length}** habits today — amazing!\n\nWant me to suggest new habits, show your stats, or share some tips?`,
    };
  }

  if (active.length === 0) {
    return {
      text: "I'd love to help! It looks like you haven't set up any habits yet. Want me to suggest some to get you started?\n\nJust say \"suggest a habit\" and I'll give you some ideas!",
    };
  }

  return {
    text: `I'm here to help! Here's what I can do:\n\n- **"How am I doing?"** — see your stats\n- **"Motivate me"** — get a boost\n- **"What's the easiest habit?"** — find a quick win\n- **"Suggest a habit"** — get new ideas\n- **"Tips"** — improve your habit game\n- **"Help me plan a goal"** — break down big goals\n\nOr just tell me what's on your mind!`,
  };
}
