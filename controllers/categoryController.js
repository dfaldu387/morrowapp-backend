const pool = require('../config/database');

// Get all active categories (for the app)
exports.getActive = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, emoji, sort_order FROM categories WHERE is_active = true ORDER BY sort_order, name'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('getActive categories error:', err);
    res.status(500).json({ error: 'Failed to load categories' });
  }
};

// Get all categories including inactive (for admin)
exports.getAll = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, emoji, is_active, sort_order, created_at FROM categories ORDER BY sort_order, name'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('getAll categories error:', err);
    res.status(500).json({ error: 'Failed to load categories' });
  }
};

// Create category
exports.create = async (req, res) => {
  try {
    const { name, emoji, sort_order } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const result = await pool.query(
      'INSERT INTO categories (name, emoji, sort_order) VALUES ($1, $2, $3) RETURNING *',
      [name.trim(), emoji || '📌', sort_order || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Category already exists' });
    }
    console.error('create category error:', err);
    res.status(500).json({ error: 'Failed to create category' });
  }
};

// Update category
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, emoji, is_active, sort_order } = req.body;

    const result = await pool.query(
      `UPDATE categories SET
        name = COALESCE($1, name),
        emoji = COALESCE($2, emoji),
        is_active = COALESCE($3, is_active),
        sort_order = COALESCE($4, sort_order)
      WHERE id = $5 RETURNING *`,
      [name, emoji, is_active, sort_order, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Category name already exists' });
    }
    console.error('update category error:', err);
    res.status(500).json({ error: 'Failed to update category' });
  }
};

// Delete category
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json({ message: 'Category deleted' });
  } catch (err) {
    console.error('delete category error:', err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
};

// Save user's selected categories (onboarding)
exports.saveUserCategories = async (req, res) => {
  try {
    const userId = req.user.id;
    const { categoryIds } = req.body;

    if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
      return res.status(400).json({ error: 'categoryIds array is required' });
    }

    // Clear existing selections
    await pool.query('DELETE FROM user_categories WHERE user_id = $1', [userId]);

    // Insert new selections
    const values = categoryIds.map((cid, i) => `($1, $${i + 2})`).join(', ');
    await pool.query(
      `INSERT INTO user_categories (user_id, category_id) VALUES ${values} ON CONFLICT DO NOTHING`,
      [userId, ...categoryIds]
    );

    res.json({ message: 'Categories saved', count: categoryIds.length });
  } catch (err) {
    console.error('saveUserCategories error:', err);
    res.status(500).json({ error: 'Failed to save categories' });
  }
};

// Get user's selected categories
exports.getUserCategories = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT c.id, c.name, c.emoji, c.sort_order
       FROM user_categories uc
       JOIN categories c ON c.id = uc.category_id
       WHERE uc.user_id = $1 AND c.is_active = true
       ORDER BY c.sort_order, c.name`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('getUserCategories error:', err);
    res.status(500).json({ error: 'Failed to load user categories' });
  }
};
