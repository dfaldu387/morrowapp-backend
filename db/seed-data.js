require('dotenv').config({ path: __dirname + '/../.env' });
const pool = require('../config/database');

const seedSQL = `
-- Create extra tables
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id SERIAL PRIMARY KEY,
  admin_email VARCHAR(255),
  action VARCHAR(100),
  details TEXT,
  target_type VARCHAR(50),
  target_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  role VARCHAR(50) DEFAULT 'viewer',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feedback (
  id SERIAL PRIMARY KEY,
  user_id UUID,
  type VARCHAR(50) DEFAULT 'general',
  subject VARCHAR(255),
  message TEXT,
  status VARCHAR(50) DEFAULT 'open',
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS habit_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE,
  emoji VARCHAR(10),
  color VARCHAR(20),
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suggested_habits (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  emoji VARCHAR(10),
  category VARCHAR(100),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Clear existing data
TRUNCATE ai_chat_messages, habit_completions, streak_freezes, user_achievements,
         user_categories, user_settings, notifications, habits, categories, users CASCADE;

-- Users
INSERT INTO users (id, name, email, password, created_at, updated_at) VALUES ('ba996efa-e6ba-4855-807a-d4689a9843d9', 'Guest', 'guest_1791016819586@morrow.app', '$2b$12$GYnHnuh1HgW/2wGbbNtlDeNFebxk9ZPYeLIssVXGDBNFsCCBBos5q', '2026-10-03T08:40:19.768Z', '2026-10-03T08:40:19.768Z');
INSERT INTO users (id, name, email, password, created_at, updated_at) VALUES ('c8203888-4ed3-470c-a7fa-673be637c9c5', 'Guest', 'guest_1791016840130@morrow.app', '$2b$12$RN.vsVvy4hJkjkU81BHBFuGY8jS2S4cnsc1KnyAzSpm5hI9Ptl4s2', '2026-10-03T08:40:40.309Z', '2026-10-03T08:40:40.309Z');
INSERT INTO users (id, name, email, password, created_at, updated_at) VALUES ('9b381e1f-7bc0-42b2-82e2-e3a1838f76b2', 'Guest', 'guest_1791265052079@morrow.app', '$2b$12$U78dI3TdEBaFOt8zYisdyugRm2u9B35clNbEU37wEgZOu8prUxcTe', '2026-10-06T05:37:32.260Z', '2026-10-06T05:37:32.260Z');
INSERT INTO users (id, name, email, password, created_at, updated_at) VALUES ('adf40802-3453-4e8f-8fe6-31a95d39345c', 'Guest', 'guest_1791265101338@morrow.app', '$2b$12$Z9C0mx.AI6q7HXmYaj/QHuVXFtHnmvJ2tKRFYtjllQKeSEcezIpwi', '2026-10-06T05:38:21.512Z', '2026-10-06T05:38:21.512Z');
INSERT INTO users (id, name, email, password, created_at, updated_at) VALUES ('bec70c47-9dd3-4a49-9d24-8c1f05b326bd', 'Guest', 'guest_1791265143874@morrow.app', '$2b$12$91DTphWihcsa7AixXLzQjerOgI6UrVpJVt07Rff07cu7cNW8t05C2', '2026-10-06T05:39:04.053Z', '2026-10-06T05:39:04.053Z');
INSERT INTO users (id, name, email, password, created_at, updated_at) VALUES ('b375c1f9-8ffe-46e7-9f0b-d20e9196a103', 'Guest', 'guest_1791269137952@morrow.app', '$2b$12$nd8ZEKCxFo0tD.jM4PWg6Ot7y5BFNG9T1fsBw0.HrDZzYFPMMWnPi', '2026-10-06T06:45:38.120Z', '2026-10-06T06:45:38.120Z');
INSERT INTO users (id, name, email, password, created_at, updated_at) VALUES ('11d0893a-3f51-4508-b147-932d4c694184', 'Guest', 'guest_1791283371346@morrow.app', '$2b$12$Hr0o1sHa2kMZfihGsf/itu6EBxzghGCaI561nkTtO3tNXttIdvBUy', '2026-10-06T10:42:51.526Z', '2026-10-06T10:42:51.526Z');
INSERT INTO users (id, name, email, password, created_at, updated_at) VALUES ('9d7f192d-3fe9-4985-890c-682d10cf60f8', 'Guest', 'guest_1791351514530@morrow.app', '$2b$12$I0VKFWqN.yxlWC9Oge/iIeQ74vqCKKdzsaFnVN5pZfaLiqo/r.b/q', '2026-10-07T05:38:34.734Z', '2026-10-07T05:38:34.734Z');
INSERT INTO users (id, name, email, password, created_at, updated_at) VALUES ('1e31aed1-231d-4893-815e-17ce643bf758', 'Guest', 'guest_1791352101053@morrow.app', '$2b$12$PgVhF48/UeM6d5RFmwesM.sC91vyeLjHGaboNBi2sdovug19jb8mq', '2026-10-07T05:48:21.230Z', '2026-10-07T05:48:21.230Z');
INSERT INTO users (id, name, email, password, created_at, updated_at) VALUES ('28f00124-1258-46b3-9a57-241190c13969', 'Test', 'test@yopmail.com', '$2b$12$xggk7YtwnrbEwTqo7RZHs.t/GPoXVzxCvu/kyJm.PH7W1voiEilFy', '2026-10-02T06:49:09.955Z', '2026-10-02T10:12:52.626Z');
INSERT INTO users (id, name, email, password, created_at, updated_at) VALUES ('125a271a-abfd-4bbb-8a27-1070f13f3bf9', 'Guest', 'guest_1790942501424@morrow.app', '$2b$12$i2BLlEjEPBL/YJI/p7Fx1uiBiSjFu7tBsZORyPNzDuABxGhoLw/SC', '2026-10-02T12:01:41.611Z', '2026-10-02T12:01:41.611Z');
INSERT INTO users (id, name, email, password, created_at, updated_at) VALUES ('b50dd6f0-4203-47dd-ac03-060c5d0e0cae', 'Guest', 'guest_1790942503538@morrow.app', '$2b$12$5MpBOXa0pezMb71j2Qi.r.0Klw9stftyPI32fYI/cCU0ojIQYnD5W', '2026-10-02T12:01:43.722Z', '2026-10-02T12:01:43.722Z');
INSERT INTO users (id, name, email, password, created_at, updated_at) VALUES ('f5d07ff4-5c1f-4bef-ba49-f4af2db6b2a0', 'Guest', 'guest_1791012450951@morrow.app', '$2b$12$mM5GSPG1cP45wavjyoau3upc7dLOKMt7HsiK8exIatEEnmHScotG2', '2026-10-03T07:27:31.146Z', '2026-10-03T07:27:31.146Z');
INSERT INTO users (id, name, email, password, created_at, updated_at) VALUES ('47c2275c-cc66-4726-8f0c-488aeef98cda', 'Guest', 'guest_1791015564966@morrow.app', '$2b$12$HH9epBstM2SAWZ01SGDCje8THc2nkReQZXyYJ8k0znRwKOdgkyxRa', '2026-10-03T08:19:25.156Z', '2026-10-03T08:19:25.156Z');

-- Categories
INSERT INTO categories (id, name, emoji, is_active, sort_order, created_at) VALUES ('55950365-826a-48d9-9c1f-3711bc4966a6', 'Mindfulness', '🧘', true, 3, '2026-10-06T06:20:31.060Z');
INSERT INTO categories (id, name, emoji, is_active, sort_order, created_at) VALUES ('664ab6f5-fcf0-4d57-8b6c-cbcebc643bb8', 'Learning', '📚', true, 4, '2026-10-06T06:20:31.060Z');
INSERT INTO categories (id, name, emoji, is_active, sort_order, created_at) VALUES ('8c839fc7-5394-406d-88b6-66436d15c4d4', 'Productivity', '⚡', true, 5, '2026-10-06T06:20:31.061Z');
INSERT INTO categories (id, name, emoji, is_active, sort_order, created_at) VALUES ('f6353038-6262-44a0-b636-12d8cc879cff', 'Self-Care', '🌿', true, 6, '2026-10-06T06:20:31.061Z');
INSERT INTO categories (id, name, emoji, is_active, sort_order, created_at) VALUES ('375226b1-b4e0-4cd4-9c5d-688bc4693f6d', 'Social', '👥', true, 8, '2026-10-06T06:20:31.062Z');
INSERT INTO categories (id, name, emoji, is_active, sort_order, created_at) VALUES ('37918c2e-4c85-4531-91b9-778930a83991', 'Creative', '🎨', true, 9, '2026-10-06T06:20:31.062Z');
INSERT INTO categories (id, name, emoji, is_active, sort_order, created_at) VALUES ('ab8ea040-29b5-4158-8cfc-42ac2412898c', 'Health', '❤️', false, 1, '2026-10-06T06:20:31.056Z');
INSERT INTO categories (id, name, emoji, is_active, sort_order, created_at) VALUES ('2b2fb327-9d35-47b9-a285-e7f6120fc786', 'Finance', '💰', false, 7, '2026-10-06T06:20:31.062Z');
INSERT INTO categories (id, name, emoji, is_active, sort_order, created_at) VALUES ('f8edfb1b-97c1-4604-ac6e-733878a75b77', 'Running', '🏃', true, 7, '2026-10-07T05:53:07.823Z');

-- Habits
INSERT INTO habits (id, user_id, name, color, emoji, category, schedule, goal_type, goal_target, streak_goal, routine, archived, sort_order, created_at, updated_at) VALUES ('1b3a7cd6-be36-4537-8077-8b61587f7a41', '1e31aed1-231d-4893-815e-17ce643bf758', 'Drink Water', '#5B9BD5', '💧', 'Health', '{0,1,2,3,4,5,6}', 'daily', 1, 2, 'none', false, 0, '2026-10-07T05:48:57.334Z', '2026-10-07T05:48:57.334Z');
INSERT INTO habits (id, user_id, name, color, emoji, category, schedule, goal_type, goal_target, streak_goal, routine, archived, sort_order, created_at, updated_at) VALUES ('a5d05822-4e27-4d01-8a63-01ba3295f6ab', '28f00124-1258-46b3-9a57-241190c13969', 'Drink Water', '#2574f5', '💧', 'Self-Care', '{0,1,2,3,4,5,6}', 'daily', 1, 7, 'none', true, 0, '2026-10-02T06:54:36.866Z', '2026-10-02T11:30:29.697Z');
INSERT INTO habits (id, user_id, name, color, emoji, category, schedule, goal_type, goal_target, streak_goal, routine, archived, sort_order, created_at, updated_at) VALUES ('135ab179-4831-4ac5-a6ee-06b62a2e5a70', 'f5d07ff4-5c1f-4bef-ba49-f4af2db6b2a0', 'Drink Water', '#5B9BD5', '💧', 'Health', '{}', 'daily', 1, 0, 'none', false, 0, '2026-10-03T07:27:48.662Z', '2026-10-03T07:27:48.662Z');
INSERT INTO habits (id, user_id, name, color, emoji, category, schedule, goal_type, goal_target, streak_goal, routine, archived, sort_order, created_at, updated_at) VALUES ('7f81d18e-fd9a-4fdd-95f5-1914c8ad9da8', 'f5d07ff4-5c1f-4bef-ba49-f4af2db6b2a0', 'Meditate', '#5DB8A3', '🧘', 'Mindfulness', '{}', 'daily', 1, 0, 'none', false, 0, '2026-10-05T08:02:39.397Z', '2026-10-05T08:02:39.397Z');
INSERT INTO habits (id, user_id, name, color, emoji, category, schedule, goal_type, goal_target, streak_goal, routine, archived, sort_order, created_at, updated_at) VALUES ('61395ed4-6ec1-4cec-8251-2eedb24c64eb', '28f00124-1258-46b3-9a57-241190c13969', 'Drink Water', '#5B9BD5', '💧', 'Health', '{}', 'daily', 1, 0, 'none', true, 0, '2026-10-06T05:47:26.299Z', '2026-10-06T05:53:34.588Z');

-- Habit Completions
INSERT INTO habit_completions (id, habit_id, completed_date, note, created_at) VALUES ('5dc35d80-c545-4ce4-98a8-d4e5d7a192f5', '135ab179-4831-4ac5-a6ee-06b62a2e5a70', '2026-10-03', 'test', '2026-10-05T08:14:49.336Z');
INSERT INTO habit_completions (id, habit_id, completed_date, note, created_at) VALUES ('04998d38-5754-4e98-853c-92257edbf003', '135ab179-4831-4ac5-a6ee-06b62a2e5a70', '2026-10-04', 'test', '2026-10-05T08:14:53.854Z');
INSERT INTO habit_completions (id, habit_id, completed_date, note, created_at) VALUES ('50826c39-41d6-457e-9fd5-bfb754445a55', '7f81d18e-fd9a-4fdd-95f5-1914c8ad9da8', '2026-10-05', NULL, '2026-10-05T08:20:51.556Z');
INSERT INTO habit_completions (id, habit_id, completed_date, note, created_at) VALUES ('ad077624-a786-4dd2-8047-0ef394ee8912', '61395ed4-6ec1-4cec-8251-2eedb24c64eb', '2026-10-06', NULL, '2026-10-06T05:47:38.811Z');
INSERT INTO habit_completions (id, habit_id, completed_date, note, created_at) VALUES ('2dfb4ce9-4d51-4cf5-8e30-9bacace68445', '61395ed4-6ec1-4cec-8251-2eedb24c64eb', '2026-10-01', NULL, '2026-10-06T05:47:46.860Z');
INSERT INTO habit_completions (id, habit_id, completed_date, note, created_at) VALUES ('1d0b7c7c-abe2-40ac-a37c-5b333fbd2723', '61395ed4-6ec1-4cec-8251-2eedb24c64eb', '2025-12-08', 'Test', '2026-10-06T05:53:18.645Z');
INSERT INTO habit_completions (id, habit_id, completed_date, note, created_at) VALUES ('4518e257-96f9-401a-ab0c-28d4821ba871', '1b3a7cd6-be36-4537-8077-8b61587f7a41', '2026-10-07', NULL, '2026-10-07T05:49:06.500Z');

-- Notifications
INSERT INTO notifications (id, user_id, title, body, type, read, data, created_at) VALUES ('40d39b5d-4a88-42c5-b9f7-446af0682ff0', '28f00124-1258-46b3-9a57-241190c13969', 'Welcome!', 'Welcome to Morrow! Start building great habits today.', 'update', false, NULL, '2026-10-03T06:32:15.261Z');
INSERT INTO notifications (id, user_id, title, body, type, read, data, created_at) VALUES ('ece90df0-27a5-4993-94cb-312ff67daf22', '28f00124-1258-46b3-9a57-241190c13969', 'Welcome to Morrow!', 'Start building great habits today. We''re glad to have you here.', 'info', false, NULL, '2026-10-03T06:41:08.639Z');
INSERT INTO notifications (id, user_id, title, body, type, read, data, created_at) VALUES ('abd9e9c6-55ff-4046-a290-c9aacbc9e63c', '28f00124-1258-46b3-9a57-241190c13969', 'New Update Available', 'We''ve added exciting new features! Check out the latest improvements.', 'update', false, NULL, '2026-10-03T06:41:08.639Z');
INSERT INTO notifications (id, user_id, title, body, type, read, data, created_at) VALUES ('57b1246a-b1f8-4450-bbe6-4a84de202b25', '28f00124-1258-46b3-9a57-241190c13969', 'Keep Your Streak!', 'Don''t forget to complete your habits today and keep your streak alive!', 'info', false, NULL, '2026-10-03T06:41:08.639Z');
INSERT INTO notifications (id, user_id, title, body, type, read, data, created_at) VALUES ('7432dcdb-10bf-42a9-af9b-4ae0d7d359ac', '28f00124-1258-46b3-9a57-241190c13969', 'You''re Doing Great!', 'Your consistency is paying off. Keep pushing towards your goals!', 'promotion', false, NULL, '2026-10-03T06:41:08.639Z');
INSERT INTO notifications (id, user_id, title, body, type, read, data, created_at) VALUES ('a07b453e-d132-43e5-b84c-8d469add6c04', '28f00124-1258-46b3-9a57-241190c13969', 'Scheduled Maintenance', 'We''ll be performing maintenance tonight at 2 AM. The app may be briefly unavailable.', 'alert', false, NULL, '2026-10-03T06:41:08.639Z');
INSERT INTO notifications (id, user_id, title, body, type, read, data, created_at) VALUES ('9d1cd372-da71-43ce-b7fe-8c0476cd2619', '125a271a-abfd-4bbb-8a27-1070f13f3bf9', 'Welcome to Morrow!', 'Start building great habits today.', 'info', false, NULL, '2026-10-03T06:41:08.639Z');
INSERT INTO notifications (id, user_id, title, body, type, read, data, created_at) VALUES ('1426e92f-676c-4ad4-8331-9845b0504ef4', 'b50dd6f0-4203-47dd-ac03-060c5d0e0cae', 'Welcome to Morrow!', 'Start building great habits today.', 'info', false, NULL, '2026-10-03T06:41:08.639Z');
INSERT INTO notifications (id, user_id, title, body, type, read, data, created_at) VALUES ('690043f6-2c2b-4269-b501-d476b21f3aa1', '28f00124-1258-46b3-9a57-241190c13969', 'Test', 'Test Message', 'info', false, NULL, '2026-10-07T05:53:31.203Z');

-- AI Chat Messages
INSERT INTO ai_chat_messages (id, user_id, message, is_user, created_at) VALUES ('17d984d5-e86e-4d98-955f-312b557139e5', '28f00124-1258-46b3-9a57-241190c13969', 'How am I doing?', true, '2026-10-02T07:02:02.392Z');
INSERT INTO ai_chat_messages (id, user_id, message, is_user, created_at) VALUES ('dc12895e-39e8-435d-b1ee-352d0a36781c', '28f00124-1258-46b3-9a57-241190c13969', E'Here''s your snapshot:\n\n- **Active habits:** 1\n- **Today:** 0/1 completed (0%)\n- **Current best streak:** 0 days\n- **All-time best streak:** 0 days\n- **Total completions:** 0\n\nEvery journey starts with day one. Let''s go!', false, '2026-10-02T07:02:02.395Z');
INSERT INTO ai_chat_messages (id, user_id, message, is_user, created_at) VALUES ('af6d66ea-cdfd-4690-8dc0-417a4ce0e713', 'f5d07ff4-5c1f-4bef-ba49-f4af2db6b2a0', 'How am I doing?', true, '2026-10-03T09:31:29.211Z');
INSERT INTO ai_chat_messages (id, user_id, message, is_user, created_at) VALUES ('1dc8f39e-9319-4c49-8799-527c791ba0ad', '28f00124-1258-46b3-9a57-241190c13969', 'I do not understand still', true, '2026-10-02T07:02:18.523Z');
INSERT INTO ai_chat_messages (id, user_id, message, is_user, created_at) VALUES ('a0f5e56c-bc15-43ee-ade3-6071ec676e57', '28f00124-1258-46b3-9a57-241190c13969', E'I''m not sure I fully understood that, but here''s what I know: you''ve got **1** habit left today. **💧 Drink Water** would be a great next step!\n\nYou can ask me about your progress, get motivation, find the easiest habit, or get tips for improvement.', false, '2026-10-02T07:02:18.526Z');
INSERT INTO ai_chat_messages (id, user_id, message, is_user, created_at) VALUES ('7fffac6f-199e-4e96-901c-2804383a937d', '28f00124-1258-46b3-9a57-241190c13969', '?', true, '2026-10-02T07:02:34.552Z');
INSERT INTO ai_chat_messages (id, user_id, message, is_user, created_at) VALUES ('29778348-bd68-40df-82f7-6688b91cca36', '28f00124-1258-46b3-9a57-241190c13969', E'I''m not sure I fully understood that, but here''s what I know: you''ve got **1** habit left today. **💧 Drink Water** would be a great next step!\n\nYou can ask me about your progress, get motivation, find the easiest habit, or get tips for improvement.', false, '2026-10-02T07:02:34.554Z');
INSERT INTO ai_chat_messages (id, user_id, message, is_user, created_at) VALUES ('093d3b41-04dd-44d1-bdf9-05310877c1c7', '28f00124-1258-46b3-9a57-241190c13969', 'Is this right way?', true, '2026-10-02T07:03:10.571Z');
INSERT INTO ai_chat_messages (id, user_id, message, is_user, created_at) VALUES ('3c216fb4-f07a-4998-ab41-2dc3e840e666', '28f00124-1258-46b3-9a57-241190c13969', E'I''m not sure I fully understood that, but here''s what I know: you''ve got **1** habit left today. **💧 Drink Water** would be a great next step!\n\nYou can ask me about your progress, get motivation, find the easiest habit, or get tips for improvement.', false, '2026-10-02T07:03:10.573Z');
INSERT INTO ai_chat_messages (id, user_id, message, is_user, created_at) VALUES ('00afde2f-902b-4bb7-8f59-d7038d82c381', 'f5d07ff4-5c1f-4bef-ba49-f4af2db6b2a0', E'Here''s your snapshot:\n\n- **Active habits:** 1\n- **Today:** 0/1 completed (0%)\n- **Current best streak:** 0 days\n- **All-time best streak:** 0 days\n- **Total completions:** 0\n\nEvery journey starts with day one. Let''s go!', false, '2026-10-03T09:31:29.216Z');
INSERT INTO ai_chat_messages (id, user_id, message, is_user, created_at) VALUES ('9f395744-6b3d-4466-9617-0e65304d995e', 'f5d07ff4-5c1f-4bef-ba49-f4af2db6b2a0', 'How am I doing overall?', true, '2026-10-05T07:46:55.595Z');
INSERT INTO ai_chat_messages (id, user_id, message, is_user, created_at) VALUES ('368da84f-1a26-47be-9235-e2a9d7ce68d4', 'f5d07ff4-5c1f-4bef-ba49-f4af2db6b2a0', E'Here''s your snapshot:\n\n- **Active habits:** 1\n- **Today:** 1/1 completed (100%)\n- **Current best streak:** 1 days\n- **All-time best streak:** 1 days\n- **Total completions:** 1\n\nPerfect day! You''ve completed everything!', false, '2026-10-05T07:46:55.599Z');
INSERT INTO ai_chat_messages (id, user_id, message, is_user, created_at) VALUES ('30036e05-5457-42d2-ae3c-d68e97bfe6d7', 'f5d07ff4-5c1f-4bef-ba49-f4af2db6b2a0', 'Suggest some new habits for me', true, '2026-10-05T08:02:31.004Z');
INSERT INTO ai_chat_messages (id, user_id, message, is_user, created_at) VALUES ('6306ce19-72e6-4a51-9fa6-70e8f5c423c9', 'f5d07ff4-5c1f-4bef-ba49-f4af2db6b2a0', E'Based on your **1** current habit, here are some great additions:\n\n- 💬 Connect with a friend or family\n- 📝 Write in a journal for 10 minutes\n- 🧹 Tidy one area of your space', false, '2026-10-05T08:02:31.008Z');
INSERT INTO ai_chat_messages (id, user_id, message, is_user, created_at) VALUES ('e7409e5a-6c87-49e9-b156-186433afb71c', 'f5d07ff4-5c1f-4bef-ba49-f4af2db6b2a0', 'Suggest some new habits for me', true, '2026-10-05T08:02:33.868Z');
INSERT INTO ai_chat_messages (id, user_id, message, is_user, created_at) VALUES ('36deee08-8181-4a6f-8c92-818d980776ed', 'f5d07ff4-5c1f-4bef-ba49-f4af2db6b2a0', E'Based on your **1** current habit, here are some great additions:\n\n- 💪 Do 10 push-ups\n- 📝 Write in a journal for 10 minutes\n- 🧘 Morning stretch routine', false, '2026-10-05T08:02:33.870Z');
INSERT INTO ai_chat_messages (id, user_id, message, is_user, created_at) VALUES ('72b6dc77-9cea-4192-a14e-7b0c4b19eb0c', '1e31aed1-231d-4893-815e-17ce643bf758', 'How am I doing?', true, '2026-10-07T05:49:15.441Z');
INSERT INTO ai_chat_messages (id, user_id, message, is_user, created_at) VALUES ('68dc990a-430a-451b-8d64-d0cdca8e7d5b', '1e31aed1-231d-4893-815e-17ce643bf758', E'Here''s your snapshot:\n\n- **Active habits:** 1\n- **Today:** 1/1 completed (100%)\n- **Current best streak:** 1 days\n- **All-time best streak:** 1 days\n- **Total completions:** 1\n\nPerfect day! You''ve completed everything!', false, '2026-10-07T05:49:15.445Z');

-- User Categories
INSERT INTO user_categories (id, user_id, category_id, created_at) VALUES ('0852845e-9d28-43c2-91bb-e7c649c3b117', 'b375c1f9-8ffe-46e7-9f0b-d20e9196a103', '375226b1-b4e0-4cd4-9c5d-688bc4693f6d', '2026-10-06T06:45:45.913Z');
INSERT INTO user_categories (id, user_id, category_id, created_at) VALUES ('880f5e94-b669-4ace-b920-9c9c0e5c6579', 'b375c1f9-8ffe-46e7-9f0b-d20e9196a103', '2b2fb327-9d35-47b9-a285-e7f6120fc786', '2026-10-06T06:45:45.913Z');
INSERT INTO user_categories (id, user_id, category_id, created_at) VALUES ('d8c47b0f-fe40-4d06-88a8-7675c7a2136b', '1e31aed1-231d-4893-815e-17ce643bf758', '55950365-826a-48d9-9c1f-3711bc4966a6', '2026-10-07T05:48:26.296Z');
INSERT INTO user_categories (id, user_id, category_id, created_at) VALUES ('2dbf4d14-a5be-4715-8eb8-6b84b27c9c12', '1e31aed1-231d-4893-815e-17ce643bf758', '664ab6f5-fcf0-4d57-8b6c-cbcebc643bb8', '2026-10-07T05:48:26.296Z');
INSERT INTO user_categories (id, user_id, category_id, created_at) VALUES ('6ea0b415-8269-42f3-81e6-6f111e47b67f', '1e31aed1-231d-4893-815e-17ce643bf758', 'f6353038-6262-44a0-b636-12d8cc879cff', '2026-10-07T05:48:26.296Z');

-- User Settings
INSERT INTO user_settings (id, user_id, view_mode, selected_category, show_completed_today, theme_mode, week_start_day, haptic_feedback, reminders_enabled, reminder_time, auto_theme, updated_at) VALUES ('ccd1a51b-37e2-413e-951d-0a3182d1161d', 'f5d07ff4-5c1f-4bef-ba49-f4af2db6b2a0', 'cards', 'Mindfulness', true, 'light', 'sunday', true, false, '09:00', false, '2026-10-05T10:22:29.692Z');
INSERT INTO user_settings (id, user_id, view_mode, selected_category, show_completed_today, theme_mode, week_start_day, haptic_feedback, reminders_enabled, reminder_time, auto_theme, updated_at) VALUES ('f130fdba-cd7c-427b-a858-3e3f2e2f85d7', '9b381e1f-7bc0-42b2-82e2-e3a1838f76b2', 'cards', 'all', true, 'dark', 'monday', true, false, '09:00', false, '2026-10-06T05:37:32.265Z');
INSERT INTO user_settings (id, user_id, view_mode, selected_category, show_completed_today, theme_mode, week_start_day, haptic_feedback, reminders_enabled, reminder_time, auto_theme, updated_at) VALUES ('7c04503a-bdd9-4f36-a641-ec5f25195e73', 'adf40802-3453-4e8f-8fe6-31a95d39345c', 'cards', 'all', true, 'light', 'monday', true, false, '09:00', false, '2026-10-06T05:38:35.105Z');
INSERT INTO user_settings (id, user_id, view_mode, selected_category, show_completed_today, theme_mode, week_start_day, haptic_feedback, reminders_enabled, reminder_time, auto_theme, updated_at) VALUES ('465fd213-3f91-4014-a838-6e45aa1c1994', 'bec70c47-9dd3-4a49-9d24-8c1f05b326bd', 'cards', 'all', true, 'dark', 'monday', true, false, '09:00', false, '2026-10-06T05:39:04.055Z');
INSERT INTO user_settings (id, user_id, view_mode, selected_category, show_completed_today, theme_mode, week_start_day, haptic_feedback, reminders_enabled, reminder_time, auto_theme, updated_at) VALUES ('0da42a4c-78ea-4c9a-a4fc-cc371115f206', '125a271a-abfd-4bbb-8a27-1070f13f3bf9', 'cards', 'all', true, 'dark', 'monday', true, false, '09:00', false, '2026-10-02T12:01:41.614Z');
INSERT INTO user_settings (id, user_id, view_mode, selected_category, show_completed_today, theme_mode, week_start_day, haptic_feedback, reminders_enabled, reminder_time, auto_theme, updated_at) VALUES ('9a314b3a-e332-45b1-80e6-1fa1503f4537', 'b50dd6f0-4203-47dd-ac03-060c5d0e0cae', 'cards', 'all', true, 'dark', 'monday', true, false, '09:00', false, '2026-10-02T12:01:43.724Z');
INSERT INTO user_settings (id, user_id, view_mode, selected_category, show_completed_today, theme_mode, week_start_day, haptic_feedback, reminders_enabled, reminder_time, auto_theme, updated_at) VALUES ('653ba55a-a691-462e-bd8f-91d1b40ee489', '28f00124-1258-46b3-9a57-241190c13969', 'cards', 'all', true, 'light', 'monday', true, false, '09:00', true, '2026-10-06T05:47:36.409Z');
INSERT INTO user_settings (id, user_id, view_mode, selected_category, show_completed_today, theme_mode, week_start_day, haptic_feedback, reminders_enabled, reminder_time, auto_theme, updated_at) VALUES ('e010a94d-fb74-47e7-9bf0-b08e7e9853e5', '47c2275c-cc66-4726-8f0c-488aeef98cda', 'cards', 'all', true, 'dark', 'monday', true, false, '09:00', false, '2026-10-03T08:19:25.159Z');
INSERT INTO user_settings (id, user_id, view_mode, selected_category, show_completed_today, theme_mode, week_start_day, haptic_feedback, reminders_enabled, reminder_time, auto_theme, updated_at) VALUES ('f117a2b7-1a6f-4888-b719-0f8f336cd370', 'ba996efa-e6ba-4855-807a-d4689a9843d9', 'cards', 'all', true, 'dark', 'monday', true, false, '09:00', false, '2026-10-03T08:40:19.769Z');
INSERT INTO user_settings (id, user_id, view_mode, selected_category, show_completed_today, theme_mode, week_start_day, haptic_feedback, reminders_enabled, reminder_time, auto_theme, updated_at) VALUES ('316c5953-2731-4fbd-a7a7-d9aa6ed63cc7', 'c8203888-4ed3-470c-a7fa-673be637c9c5', 'cards', 'all', true, 'dark', 'monday', true, false, '09:00', false, '2026-10-03T08:40:40.312Z');
INSERT INTO user_settings (id, user_id, view_mode, selected_category, show_completed_today, theme_mode, week_start_day, haptic_feedback, reminders_enabled, reminder_time, auto_theme, updated_at) VALUES ('c3a1e5e5-9794-4eb6-845b-658c3936105e', 'b375c1f9-8ffe-46e7-9f0b-d20e9196a103', 'cards', 'all', true, 'light', 'monday', true, false, '09:00', false, '2026-10-06T07:44:07.276Z');
INSERT INTO user_settings (id, user_id, view_mode, selected_category, show_completed_today, theme_mode, week_start_day, haptic_feedback, reminders_enabled, reminder_time, auto_theme, updated_at) VALUES ('906f7db3-8546-4827-92e1-eee99607a9d3', '11d0893a-3f51-4508-b147-932d4c694184', 'cards', 'all', true, 'dark', 'monday', true, false, '09:00', false, '2026-10-06T10:42:51.529Z');
INSERT INTO user_settings (id, user_id, view_mode, selected_category, show_completed_today, theme_mode, week_start_day, haptic_feedback, reminders_enabled, reminder_time, auto_theme, updated_at) VALUES ('32203376-8023-4544-8fa3-58e45be1639a', '9d7f192d-3fe9-4985-890c-682d10cf60f8', 'cards', 'all', true, 'light', 'monday', true, false, '09:00', false, '2026-10-07T05:38:45.991Z');
INSERT INTO user_settings (id, user_id, view_mode, selected_category, show_completed_today, theme_mode, week_start_day, haptic_feedback, reminders_enabled, reminder_time, auto_theme, updated_at) VALUES ('66c3bb46-a8a5-4c3c-a3c7-ac3d38f66d56', '1e31aed1-231d-4893-815e-17ce643bf758', 'cards', 'all', true, 'dark', 'monday', true, false, '09:00', false, '2026-10-07T05:48:21.232Z');
`;

async function seedData() {
  try {
    await pool.query(seedSQL);
    console.log('Data seeded successfully');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
}

seedData();
