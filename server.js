require('dotenv').config();

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`FATAL: ${envVar} environment variable is not set`);
    process.exit(1);
  }
}
if (!process.env.ADMIN_JWT_SECRET) {
  console.warn('WARNING: ADMIN_JWT_SECRET not set — using derived key. Set it in production.');
}

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

// Simple rate limiter
const rateLimits = new Map();
function rateLimit(windowMs, max, keyFn) {
  return (req, res, next) => {
    const key = keyFn ? keyFn(req) : req.ip;
    const now = Date.now();
    const record = rateLimits.get(key) || { count: 0, resetAt: now + windowMs };
    if (now > record.resetAt) {
      record.count = 0;
      record.resetAt = now + windowMs;
    }
    record.count++;
    rateLimits.set(key, record);
    if (record.count > max) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    next();
  };
}

// Clean up rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimits) {
    if (now > record.resetAt) rateLimits.delete(key);
  }
}, 60000);

// Routes
app.use('/api/auth', rateLimit(15 * 60 * 1000, 20, req => req.ip), require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/habits', require('./routes/habits'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/achievements', require('./routes/achievements'));
app.use('/api/ai-coach', rateLimit(60 * 1000, 30, req => req.headers.authorization || req.ip), require('./routes/aiCoach'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/admin', rateLimit(15 * 60 * 1000, 50, req => req.ip), require('./routes/admin'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Morrow API running on port ${PORT}`);
});
