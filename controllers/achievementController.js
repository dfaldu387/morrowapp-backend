const pool = require('../config/database');

// Achievement definitions (matches AchievementsStore.ts)
const ACHIEVEMENTS = [
  { id: 'first_step', name: 'First Step', emoji: '👣', description: 'Create your first habit' },
  { id: 'week_warrior', name: 'Week Warrior', emoji: '⚔️', description: 'Reach a 7-day streak on any habit' },
  { id: 'month_master', name: 'Month Master', emoji: '🏅', description: 'Reach a 30-day streak on any habit' },
  { id: 'century_club', name: 'Century Club', emoji: '💯', description: 'Complete 100 total habit completions' },
  { id: 'perfect_week', name: 'Perfect Week', emoji: '🌟', description: 'Complete all habits every day for a full week' },
  { id: 'habit_builder', name: 'Habit Builder', emoji: '🧱', description: 'Create 5 habits' },
  { id: 'streak_legend', name: 'Streak Legend', emoji: '🔥', description: 'Reach a 66-day streak on any habit' },
  { id: 'thousand_strong', name: 'Thousand Strong', emoji: '🏆', description: 'Reach 1,000 total habit completions' },
  { id: 'early_bird', name: 'Early Bird', emoji: '🐦', description: 'Complete a habit today' },
  { id: 'tenacious', name: 'Tenacious', emoji: '🧊', description: 'Use 3 streak freezes' },
];

// GET /api/achievements
exports.getAll = async (req, res, next) => {
  try {
    const unlocked = await pool.query(
      'SELECT achievement_id, unlocked_at FROM user_achievements WHERE user_id = $1',
      [req.user.id]
    );

    const unlockedMap = {};
    unlocked.rows.forEach(r => { unlockedMap[r.achievement_id] = r.unlocked_at; });

    const result = ACHIEVEMENTS.map(a => ({
      ...a,
      unlocked: !!unlockedMap[a.id],
      unlockedAt: unlockedMap[a.id] || null,
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
};

// POST /api/achievements/unlock
exports.unlock = async (req, res, next) => {
  try {
    const { achievementId } = req.body;

    if (!achievementId) {
      return res.status(400).json({ error: 'achievementId is required' });
    }

    const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!achievement) {
      return res.status(404).json({ error: 'Achievement not found' });
    }

    await pool.query(
      `INSERT INTO user_achievements (user_id, achievement_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, achievement_id) DO NOTHING`,
      [req.user.id, achievementId]
    );

    res.json({ message: 'Achievement unlocked', achievement });
  } catch (err) {
    next(err);
  }
};

// POST /api/achievements/check
exports.check = async (req, res, next) => {
  try {
    // Get user's habits with completions and freezes to check achievements server-side
    const habits = await pool.query('SELECT * FROM habits WHERE user_id = $1', [req.user.id]);
    const habitIds = habits.rows.map(h => h.id);

    let completions = [];
    let freezes = [];
    if (habitIds.length > 0) {
      const compResult = await pool.query(
        'SELECT habit_id, completed_date::text FROM habit_completions WHERE habit_id = ANY($1)',
        [habitIds]
      );
      completions = compResult.rows;

      const freezeResult = await pool.query(
        'SELECT habit_id, freeze_date::text FROM streak_freezes WHERE habit_id = ANY($1)',
        [habitIds]
      );
      freezes = freezeResult.rows;
    }

    // Build habit objects for checking
    const habitData = habits.rows.map(h => ({
      ...h,
      completedDates: completions.filter(c => c.habit_id === h.id).map(c => c.completed_date),
      streakFreezes: freezes.filter(f => f.habit_id === h.id).map(f => f.freeze_date),
    }));

    // Get already unlocked
    const unlocked = await pool.query(
      'SELECT achievement_id FROM user_achievements WHERE user_id = $1',
      [req.user.id]
    );
    const unlockedSet = new Set(unlocked.rows.map(r => r.achievement_id));

    // Check each achievement
    const newlyUnlocked = [];
    const totalCompletions = completions.length;
    const habitCount = habits.rows.length;

    for (const achievement of ACHIEVEMENTS) {
      if (unlockedSet.has(achievement.id)) continue;

      let earned = false;
      switch (achievement.id) {
        case 'first_step':
          earned = habitCount >= 1;
          break;
        case 'habit_builder':
          earned = habitCount >= 5;
          break;
        case 'century_club':
          earned = totalCompletions >= 100;
          break;
        case 'thousand_strong':
          earned = totalCompletions >= 1000;
          break;
        case 'early_bird': {
          const today = new Date().toISOString().split('T')[0];
          earned = completions.some(c => c.completed_date === today);
          break;
        }
        case 'tenacious':
          earned = freezes.length >= 3;
          break;
        case 'week_warrior':
          earned = habitData.some(h => getLongestStreak(h.completedDates) >= 7);
          break;
        case 'month_master':
          earned = habitData.some(h => getLongestStreak(h.completedDates) >= 30);
          break;
        case 'streak_legend':
          earned = habitData.some(h => getLongestStreak(h.completedDates) >= 66);
          break;
        case 'perfect_week':
          earned = false; // Complex check — handled client-side for now
          break;
      }

      if (earned) {
        await pool.query(
          'INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [req.user.id, achievement.id]
        );
        newlyUnlocked.push(achievement);
      }
    }

    res.json({ newlyUnlocked });
  } catch (err) {
    next(err);
  }
};

// Helper: calculate longest streak from sorted dates
function getLongestStreak(dates) {
  if (dates.length === 0) return 0;
  const sorted = [...dates].sort();
  let longest = 1;
  let current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (curr - prev) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      current++;
      if (current > longest) longest = current;
    } else if (diff > 1) {
      current = 1;
    }
  }
  return longest;
}
