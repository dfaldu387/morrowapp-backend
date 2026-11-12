const pool = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { ADMIN_JWT_SECRET } = require('../middleware/adminAuth');

// POST /api/admin/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const result = await pool.query('SELECT * FROM admin_users WHERE email = $1 AND is_active = true', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = result.rows[0];
    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await pool.query('UPDATE admin_users SET last_login = NOW() WHERE id = $1', [admin.id]);

    const token = jwt.sign({ adminId: admin.id }, ADMIN_JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, admin: { id: admin.id, email: admin.email, name: admin.name } });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/setup — create first admin (only if no admins exist)
exports.setup = async (req, res, next) => {
  try {
    const existing = await pool.query('SELECT COUNT(*) FROM admin_users');
    if (parseInt(existing.rows[0].count) > 0) {
      return res.status(403).json({ error: 'Admin already exists. Use login.' });
    }

    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const hashed = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO admin_users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name',
      [email, hashed, name || 'Admin', 'admin']
    );

    const admin = result.rows[0];
    const token = jwt.sign({ adminId: admin.id }, ADMIN_JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, admin });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/dashboard — overview stats
exports.dashboard = async (req, res, next) => {
  try {
    const [users, subscribers, messages, tokens, activeToday] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM ai_usage WHERE is_subscribed = true'),
      pool.query('SELECT COALESCE(SUM(total_messages), 0) as total FROM ai_usage'),
      pool.query('SELECT COALESCE(SUM(total_tokens), 0) as total_tokens, COALESCE(SUM(cost), 0) as total_cost FROM token_usage'),
      pool.query(`SELECT COUNT(DISTINCT user_id) FROM ai_chat_messages WHERE created_at >= CURRENT_DATE`),
    ]);

    // Monthly stats
    const monthlyTokens = await pool.query(
      `SELECT COALESCE(SUM(total_tokens), 0) as tokens, COALESCE(SUM(cost), 0) as cost
       FROM token_usage WHERE created_at >= date_trunc('month', CURRENT_DATE)`
    );

    // Daily message counts (last 30 days)
    const dailyMessages = await pool.query(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM ai_chat_messages
       WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY DATE(created_at) ORDER BY date`
    );

    res.json({
      totalUsers: parseInt(users.rows[0].count),
      totalSubscribers: parseInt(subscribers.rows[0].count),
      totalMessages: parseInt(messages.rows[0].total),
      totalTokens: parseInt(tokens.rows[0].total_tokens),
      totalCost: parseFloat(tokens.rows[0].total_cost),
      monthlyTokens: parseInt(monthlyTokens.rows[0].tokens),
      monthlyCost: parseFloat(monthlyTokens.rows[0].cost),
      activeToday: parseInt(activeToday.rows[0].count),
      dailyMessages: dailyMessages.rows,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/users — list all users with subscription & usage info
exports.getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let query = `
      SELECT u.id, u.name, u.email, u.created_at,
             COALESCE(a.total_messages, 0) as total_messages,
             COALESCE(a.period_messages, 0) as period_messages,
             COALESCE(a.is_subscribed, false) as is_subscribed,
             a.period_start,
             COALESCE(t.total_tokens, 0) as total_tokens,
             COALESCE(t.total_cost, 0) as total_cost,
             COALESCE(h.habit_count, 0) as habit_count
      FROM users u
      LEFT JOIN ai_usage a ON a.user_id = u.id
      LEFT JOIN (
        SELECT user_id, SUM(total_tokens) as total_tokens, SUM(cost) as total_cost
        FROM token_usage GROUP BY user_id
      ) t ON t.user_id = u.id
      LEFT JOIN (
        SELECT user_id, COUNT(*) as habit_count FROM habits WHERE archived = false GROUP BY user_id
      ) h ON h.user_id = u.id
    `;

    const params = [];
    if (search) {
      query += ` WHERE u.name ILIKE $1 OR u.email ILIKE $1`;
      params.push(`%${search}%`);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM users${search ? ` WHERE name ILIKE $1 OR email ILIKE $1` : ''}`;
    const countResult = await pool.query(countQuery, search ? [`%${search}%`] : []);
    const total = parseInt(countResult.rows[0].count);

    query += ` ORDER BY u.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      users: result.rows.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        createdAt: u.created_at,
        totalMessages: parseInt(u.total_messages),
        periodMessages: parseInt(u.period_messages),
        isSubscribed: u.is_subscribed,
        periodStart: u.period_start,
        totalTokens: parseInt(u.total_tokens),
        totalCost: parseFloat(u.total_cost),
        habitCount: parseInt(u.habit_count),
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/users/:id — single user detail
exports.getUserDetail = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [user, usage, tokens, habits, recentMessages] = await Promise.all([
      pool.query('SELECT id, name, email, created_at FROM users WHERE id = $1', [id]),
      pool.query('SELECT * FROM ai_usage WHERE user_id = $1', [id]),
      pool.query(
        `SELECT DATE(created_at) as date, SUM(prompt_tokens) as prompt, SUM(completion_tokens) as completion,
                SUM(total_tokens) as total, SUM(cost) as cost, COUNT(*) as requests
         FROM token_usage WHERE user_id = $1
         GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 30`,
        [id]
      ),
      pool.query('SELECT id, name, emoji, category, archived, created_at FROM habits WHERE user_id = $1 ORDER BY created_at', [id]),
      pool.query(
        'SELECT message, is_user, created_at FROM ai_chat_messages WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
        [id]
      ),
    ]);

    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const tokenSummary = await pool.query(
      'SELECT COALESCE(SUM(total_tokens), 0) as total_tokens, COALESCE(SUM(cost), 0) as total_cost FROM token_usage WHERE user_id = $1',
      [id]
    );

    res.json({
      user: user.rows[0],
      usage: usage.rows[0] || { total_messages: 0, period_messages: 0, is_subscribed: false },
      tokenSummary: {
        totalTokens: parseInt(tokenSummary.rows[0].total_tokens),
        totalCost: parseFloat(tokenSummary.rows[0].total_cost),
      },
      dailyTokens: tokens.rows,
      habits: habits.rows,
      recentMessages: recentMessages.rows.reverse(),
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/users/:id/subscription — toggle subscription
exports.updateSubscription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isSubscribed } = req.body;

    await pool.query(
      `INSERT INTO ai_usage (user_id, is_subscribed, period_messages, period_start)
       VALUES ($1, $2, 0, CURRENT_DATE)
       ON CONFLICT (user_id) DO UPDATE SET is_subscribed = $2, period_messages = 0, period_start = CURRENT_DATE, updated_at = NOW()`,
      [id, isSubscribed]
    );

    res.json({ message: `Subscription ${isSubscribed ? 'activated' : 'deactivated'}` });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/reset-subscriptions — reset all subscriptions
exports.resetSubscriptions = async (req, res, next) => {
  try {
    const result = await pool.query(
      `UPDATE ai_usage SET is_subscribed = false, updated_at = NOW() WHERE is_subscribed = true RETURNING user_id`
    );
    console.log(`[Admin] Reset ${result.rowCount} subscriptions`);
    res.json({ message: `Reset ${result.rowCount} subscriptions`, count: result.rowCount });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/token-usage — aggregated token usage
exports.getTokenUsage = async (req, res, next) => {
  try {
    const period = req.query.period || '30'; // days

    // Per-user totals
    const perUser = await pool.query(
      `SELECT t.user_id, u.name, u.email,
              SUM(t.prompt_tokens) as prompt_tokens,
              SUM(t.completion_tokens) as completion_tokens,
              SUM(t.total_tokens) as total_tokens,
              SUM(t.cost) as total_cost,
              COUNT(*) as request_count
       FROM token_usage t
       JOIN users u ON u.id = t.user_id
       WHERE t.created_at >= CURRENT_DATE - INTERVAL '1 day' * $1
       GROUP BY t.user_id, u.name, u.email
       ORDER BY total_cost DESC`,
      [parseInt(period)]
    );

    // Daily totals
    const daily = await pool.query(
      `SELECT DATE(created_at) as date,
              SUM(prompt_tokens) as prompt_tokens,
              SUM(completion_tokens) as completion_tokens,
              SUM(total_tokens) as total_tokens,
              SUM(cost) as cost,
              COUNT(*) as requests
       FROM token_usage
       WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' * $1
       GROUP BY DATE(created_at) ORDER BY date`,
      [parseInt(period)]
    );

    // Overall totals
    const totals = await pool.query(
      `SELECT COALESCE(SUM(total_tokens), 0) as total_tokens, COALESCE(SUM(cost), 0) as total_cost, COUNT(*) as total_requests
       FROM token_usage WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' * $1`,
      [parseInt(period)]
    );

    res.json({
      period: parseInt(period),
      totals: {
        totalTokens: parseInt(totals.rows[0].total_tokens),
        totalCost: parseFloat(totals.rows[0].total_cost),
        totalRequests: parseInt(totals.rows[0].total_requests),
      },
      perUser: perUser.rows,
      daily: daily.rows,
    });
  } catch (err) {
    next(err);
  }
};
