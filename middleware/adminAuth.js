const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET + '_admin';

if (!process.env.ADMIN_JWT_SECRET) {
  console.warn('WARNING: ADMIN_JWT_SECRET not set. Using derived secret from JWT_SECRET. Set ADMIN_JWT_SECRET in environment for production security.');
}

async function adminAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No admin token provided' });
  }

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET);
    const result = await pool.query('SELECT id, email, name FROM admin_users WHERE id = $1 AND is_active = true', [decoded.adminId]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Admin not found' });
    }

    req.admin = result.rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid admin token' });
  }
}

module.exports = { adminAuth, ADMIN_JWT_SECRET };
