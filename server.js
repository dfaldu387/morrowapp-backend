require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const swaggerDoc = require('./swagger.json');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

// Swagger docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/habits', require('./routes/habits'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/achievements', require('./routes/achievements'));
app.use('/api/ai-coach', require('./routes/aiCoach'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/admin', require('./routes/admin'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Temp: reset all subs
app.post('/api/reset-all-subs', async (req, res) => {
  const p = require('./config/database');
  const r = await p.query("UPDATE ai_usage SET is_subscribed = false WHERE is_subscribed = true RETURNING user_id");
  res.json({ reset: r.rowCount, users: r.rows.map(r => r.user_id) });
});

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Morrow API running on port ${PORT}`);
});
