require('dotenv').config({ path: __dirname + '/../.env' });
const pool = require('../config/database');

const defaultCategories = [
  { name: 'Health', emoji: '❤️', sort_order: 1 },
  { name: 'Fitness', emoji: '💪', sort_order: 2 },
  { name: 'Mindfulness', emoji: '🧘', sort_order: 3 },
  { name: 'Learning', emoji: '📚', sort_order: 4 },
  { name: 'Productivity', emoji: '⚡', sort_order: 5 },
  { name: 'Self-Care', emoji: '🌿', sort_order: 6 },
  { name: 'Finance', emoji: '💰', sort_order: 7 },
  { name: 'Social', emoji: '👥', sort_order: 8 },
  { name: 'Creative', emoji: '🎨', sort_order: 9 },
];

async function seed() {
  try {
    for (const cat of defaultCategories) {
      await pool.query(
        `INSERT INTO categories (name, emoji, sort_order) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING`,
        [cat.name, cat.emoji, cat.sort_order]
      );
    }
    console.log('Default categories seeded successfully');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
