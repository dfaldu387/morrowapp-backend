require('dotenv').config({ path: __dirname + '/../.env' });
const pool = require('../config/database');

const migration = `
  -- Users table
  CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(255) NOT NULL,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password      VARCHAR(255) NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
  );

  -- Habits table
  CREATE TABLE IF NOT EXISTS habits (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name          VARCHAR(255) NOT NULL,
    color         VARCHAR(20) NOT NULL DEFAULT '#FE8DA1',
    emoji         VARCHAR(10) NOT NULL DEFAULT '✅',
    category      VARCHAR(100) NOT NULL DEFAULT 'Other',
    schedule      INTEGER[] DEFAULT '{}',
    goal_type     VARCHAR(20) NOT NULL DEFAULT 'daily',
    goal_target   INTEGER NOT NULL DEFAULT 1,
    streak_goal   INTEGER NOT NULL DEFAULT 0,
    routine       VARCHAR(20) NOT NULL DEFAULT 'none',
    archived      BOOLEAN DEFAULT FALSE,
    sort_order    INTEGER DEFAULT 0,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
  );

  -- Habit completions (replaces completedDates array)
  CREATE TABLE IF NOT EXISTS habit_completions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id      UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    completed_date DATE NOT NULL,
    note          TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(habit_id, completed_date)
  );

  -- Streak freezes
  CREATE TABLE IF NOT EXISTS streak_freezes (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id      UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    freeze_date   DATE NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(habit_id, freeze_date)
  );

  -- User settings
  CREATE TABLE IF NOT EXISTS user_settings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    view_mode           VARCHAR(20) DEFAULT 'cards',
    selected_category   VARCHAR(100) DEFAULT 'all',
    show_completed_today BOOLEAN DEFAULT TRUE,
    theme_mode          VARCHAR(20) DEFAULT 'dark',
    week_start_day      VARCHAR(20) DEFAULT 'monday',
    haptic_feedback     BOOLEAN DEFAULT TRUE,
    reminders_enabled   BOOLEAN DEFAULT FALSE,
    reminder_time       VARCHAR(5) DEFAULT '09:00',
    auto_theme          BOOLEAN DEFAULT FALSE,
    updated_at          TIMESTAMPTZ DEFAULT NOW()
  );

  -- Achievements unlocked by user
  CREATE TABLE IF NOT EXISTS user_achievements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id  VARCHAR(100) NOT NULL,
    unlocked_at     TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
  );

  -- Notifications
  CREATE TABLE IF NOT EXISTS notifications (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title         VARCHAR(255) NOT NULL,
    body          TEXT NOT NULL,
    type          VARCHAR(50) NOT NULL DEFAULT 'general',
    read          BOOLEAN DEFAULT FALSE,
    data          JSONB,
    created_at    TIMESTAMPTZ DEFAULT NOW()
  );

  -- AI Coach chat history
  CREATE TABLE IF NOT EXISTS ai_chat_messages (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message       TEXT NOT NULL,
    is_user       BOOLEAN NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW()
  );

  -- Categories (admin-managed)
  CREATE TABLE IF NOT EXISTS categories (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(100) NOT NULL UNIQUE,
    emoji         VARCHAR(10) NOT NULL DEFAULT '📌',
    is_active     BOOLEAN DEFAULT TRUE,
    sort_order    INTEGER DEFAULT 0,
    created_at    TIMESTAMPTZ DEFAULT NOW()
  );

  -- User selected categories (onboarding)
  CREATE TABLE IF NOT EXISTS user_categories (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id   UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, category_id)
  );

  -- Indexes
  CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);
  CREATE INDEX IF NOT EXISTS idx_habit_completions_habit_id ON habit_completions(habit_id);
  CREATE INDEX IF NOT EXISTS idx_habit_completions_date ON habit_completions(completed_date);
  CREATE INDEX IF NOT EXISTS idx_streak_freezes_habit_id ON streak_freezes(habit_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
  CREATE INDEX IF NOT EXISTS idx_ai_chat_user_id ON ai_chat_messages(user_id);
  CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
  CREATE INDEX IF NOT EXISTS idx_user_categories_user_id ON user_categories(user_id);
  CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);
`;

async function migrate() {
  try {
    await pool.query(migration);
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
