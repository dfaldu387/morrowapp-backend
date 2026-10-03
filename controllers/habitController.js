const pool = require('../config/database');

// Helper: format habit row from DB to API response
function formatHabit(row, completions = [], freezes = []) {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    emoji: row.emoji,
    category: row.category,
    schedule: row.schedule || [],
    goalType: row.goal_type,
    goalTarget: row.goal_target,
    streakGoal: row.streak_goal,
    routine: row.routine,
    archived: row.archived,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    completedDates: completions.map(c => c.completed_date),
    notes: completions.reduce((acc, c) => {
      if (c.note) acc[c.completed_date] = c.note;
      return acc;
    }, {}),
    streakFreezes: freezes.map(f => f.freeze_date),
  };
}

// GET /api/habits
exports.getAll = async (req, res, next) => {
  try {
    const habits = await pool.query(
      'SELECT * FROM habits WHERE user_id = $1 ORDER BY sort_order ASC, created_at ASC',
      [req.user.id]
    );

    const habitIds = habits.rows.map(h => h.id);

    let completions = [];
    let freezes = [];

    if (habitIds.length > 0) {
      const compResult = await pool.query(
        'SELECT habit_id, completed_date::text, note FROM habit_completions WHERE habit_id = ANY($1) ORDER BY completed_date',
        [habitIds]
      );
      completions = compResult.rows;

      const freezeResult = await pool.query(
        'SELECT habit_id, freeze_date::text FROM streak_freezes WHERE habit_id = ANY($1)',
        [habitIds]
      );
      freezes = freezeResult.rows;
    }

    const result = habits.rows.map(h => {
      const hCompletions = completions.filter(c => c.habit_id === h.id);
      const hFreezes = freezes.filter(f => f.habit_id === h.id);
      return formatHabit(h, hCompletions, hFreezes);
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
};

// GET /api/habits/:id
exports.getOne = async (req, res, next) => {
  try {
    const habit = await pool.query(
      'SELECT * FROM habits WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (habit.rows.length === 0) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    const completions = await pool.query(
      'SELECT completed_date::text, note FROM habit_completions WHERE habit_id = $1 ORDER BY completed_date',
      [req.params.id]
    );

    const freezes = await pool.query(
      'SELECT freeze_date::text FROM streak_freezes WHERE habit_id = $1',
      [req.params.id]
    );

    res.json(formatHabit(habit.rows[0], completions.rows, freezes.rows));
  } catch (err) {
    next(err);
  }
};

// POST /api/habits
exports.create = async (req, res, next) => {
  try {
    const { name, color, emoji, category, schedule, goalType, goalTarget, streakGoal, routine } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = await pool.query(
      `INSERT INTO habits (user_id, name, color, emoji, category, schedule, goal_type, goal_target, streak_goal, routine)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        req.user.id,
        name,
        color || '#FE8DA1',
        emoji || '✅',
        category || 'Other',
        schedule || [],
        goalType || 'daily',
        goalTarget || 1,
        streakGoal || 0,
        routine || 'none',
      ]
    );

    res.status(201).json(formatHabit(result.rows[0]));
  } catch (err) {
    next(err);
  }
};

// PUT /api/habits/:id
exports.update = async (req, res, next) => {
  try {
    const { name, color, emoji, category, schedule, goalType, goalTarget, streakGoal, routine, archived } = req.body;

    // Verify ownership
    const existing = await pool.query('SELECT id FROM habits WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    const updates = [];
    const values = [];
    let i = 1;

    if (name !== undefined) { updates.push(`name = $${i++}`); values.push(name); }
    if (color !== undefined) { updates.push(`color = $${i++}`); values.push(color); }
    if (emoji !== undefined) { updates.push(`emoji = $${i++}`); values.push(emoji); }
    if (category !== undefined) { updates.push(`category = $${i++}`); values.push(category); }
    if (schedule !== undefined) { updates.push(`schedule = $${i++}`); values.push(schedule); }
    if (goalType !== undefined) { updates.push(`goal_type = $${i++}`); values.push(goalType); }
    if (goalTarget !== undefined) { updates.push(`goal_target = $${i++}`); values.push(goalTarget); }
    if (streakGoal !== undefined) { updates.push(`streak_goal = $${i++}`); values.push(streakGoal); }
    if (routine !== undefined) { updates.push(`routine = $${i++}`); values.push(routine); }
    if (archived !== undefined) { updates.push(`archived = $${i++}`); values.push(archived); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(req.params.id);

    const result = await pool.query(
      `UPDATE habits SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );

    const completions = await pool.query(
      'SELECT completed_date::text, note FROM habit_completions WHERE habit_id = $1',
      [req.params.id]
    );

    const freezes = await pool.query(
      'SELECT freeze_date::text FROM streak_freezes WHERE habit_id = $1',
      [req.params.id]
    );

    res.json(formatHabit(result.rows[0], completions.rows, freezes.rows));
  } catch (err) {
    next(err);
  }
};

// DELETE /api/habits/:id
exports.remove = async (req, res, next) => {
  try {
    const result = await pool.query(
      'DELETE FROM habits WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    res.json({ message: 'Habit deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// POST /api/habits/:id/toggle
exports.toggleDate = async (req, res, next) => {
  try {
    const { date } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'Date is required (YYYY-MM-DD)' });
    }

    // Verify ownership
    const habit = await pool.query('SELECT id FROM habits WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (habit.rows.length === 0) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    // Check if already completed
    const existing = await pool.query(
      'SELECT id FROM habit_completions WHERE habit_id = $1 AND completed_date = $2',
      [req.params.id, date]
    );

    if (existing.rows.length > 0) {
      // Remove completion and note
      await pool.query('DELETE FROM habit_completions WHERE habit_id = $1 AND completed_date = $2', [req.params.id, date]);
      res.json({ completed: false, date });
    } else {
      // Add completion
      await pool.query(
        'INSERT INTO habit_completions (habit_id, completed_date) VALUES ($1, $2)',
        [req.params.id, date]
      );
      res.json({ completed: true, date });
    }
  } catch (err) {
    next(err);
  }
};

// PUT /api/habits/:id/note
exports.setNote = async (req, res, next) => {
  try {
    const { date, note } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    // Verify ownership
    const habit = await pool.query('SELECT id FROM habits WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (habit.rows.length === 0) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    if (note && note.trim()) {
      // Upsert note on existing completion
      await pool.query(
        `INSERT INTO habit_completions (habit_id, completed_date, note)
         VALUES ($1, $2, $3)
         ON CONFLICT (habit_id, completed_date) DO UPDATE SET note = $3`,
        [req.params.id, date, note.trim()]
      );
    } else {
      // Clear note
      await pool.query(
        'UPDATE habit_completions SET note = NULL WHERE habit_id = $1 AND completed_date = $2',
        [req.params.id, date]
      );
    }

    res.json({ message: 'Note updated' });
  } catch (err) {
    next(err);
  }
};

// POST /api/habits/:id/freeze
exports.useStreakFreeze = async (req, res, next) => {
  try {
    const { date } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const habit = await pool.query('SELECT id FROM habits WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (habit.rows.length === 0) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    await pool.query(
      `INSERT INTO streak_freezes (habit_id, freeze_date)
       VALUES ($1, $2)
       ON CONFLICT (habit_id, freeze_date) DO NOTHING`,
      [req.params.id, date]
    );

    res.json({ message: 'Streak freeze applied' });
  } catch (err) {
    next(err);
  }
};

// PUT /api/habits/reorder
exports.reorder = async (req, res, next) => {
  try {
    const { orderedIds } = req.body;

    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ error: 'orderedIds array is required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < orderedIds.length; i++) {
        await client.query(
          'UPDATE habits SET sort_order = $1 WHERE id = $2 AND user_id = $3',
          [i, orderedIds[i], req.user.id]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.json({ message: 'Habits reordered' });
  } catch (err) {
    next(err);
  }
};
