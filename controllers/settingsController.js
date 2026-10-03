const pool = require('../config/database');

// GET /api/settings
exports.get = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM user_settings WHERE user_id = $1', [req.user.id]);

    if (result.rows.length === 0) {
      // Create default settings
      const inserted = await pool.query(
        'INSERT INTO user_settings (user_id) VALUES ($1) RETURNING *',
        [req.user.id]
      );
      return res.json(formatSettings(inserted.rows[0]));
    }

    res.json(formatSettings(result.rows[0]));
  } catch (err) {
    next(err);
  }
};

// PUT /api/settings
exports.update = async (req, res, next) => {
  try {
    const {
      viewMode, selectedCategory, showCompletedToday, themeMode,
      weekStartDay, hapticFeedback, remindersEnabled, reminderTime, autoTheme,
    } = req.body;

    const updates = [];
    const values = [];
    let i = 1;

    if (viewMode !== undefined) { updates.push(`view_mode = $${i++}`); values.push(viewMode); }
    if (selectedCategory !== undefined) { updates.push(`selected_category = $${i++}`); values.push(selectedCategory); }
    if (showCompletedToday !== undefined) { updates.push(`show_completed_today = $${i++}`); values.push(showCompletedToday); }
    if (themeMode !== undefined) { updates.push(`theme_mode = $${i++}`); values.push(themeMode); }
    if (weekStartDay !== undefined) { updates.push(`week_start_day = $${i++}`); values.push(weekStartDay); }
    if (hapticFeedback !== undefined) { updates.push(`haptic_feedback = $${i++}`); values.push(hapticFeedback); }
    if (remindersEnabled !== undefined) { updates.push(`reminders_enabled = $${i++}`); values.push(remindersEnabled); }
    if (reminderTime !== undefined) { updates.push(`reminder_time = $${i++}`); values.push(reminderTime); }
    if (autoTheme !== undefined) { updates.push(`auto_theme = $${i++}`); values.push(autoTheme); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(req.user.id);

    const result = await pool.query(
      `UPDATE user_settings SET ${updates.join(', ')} WHERE user_id = $${i} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      // Settings row doesn't exist yet, create it
      values.pop(); // remove user_id from end
      const inserted = await pool.query(
        'INSERT INTO user_settings (user_id) VALUES ($1) RETURNING *',
        [req.user.id]
      );
      return res.json(formatSettings(inserted.rows[0]));
    }

    res.json(formatSettings(result.rows[0]));
  } catch (err) {
    next(err);
  }
};

function formatSettings(row) {
  return {
    viewMode: row.view_mode,
    selectedCategory: row.selected_category,
    showCompletedToday: row.show_completed_today,
    themeMode: row.theme_mode,
    weekStartDay: row.week_start_day,
    hapticFeedback: row.haptic_feedback,
    remindersEnabled: row.reminders_enabled,
    reminderTime: row.reminder_time,
    autoTheme: row.auto_theme,
  };
}
