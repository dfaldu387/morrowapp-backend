const router = require('express').Router();
const admin = require('../controllers/adminController');
const { adminAuth } = require('../middleware/adminAuth');

// Public routes
router.post('/login', admin.login);
router.post('/setup', admin.setup);

// Protected routes
router.get('/dashboard', adminAuth, admin.dashboard);
router.get('/users', adminAuth, admin.getUsers);
router.get('/users/:id', adminAuth, admin.getUserDetail);
router.put('/users/:id/subscription', adminAuth, admin.updateSubscription);
router.post('/reset-subscriptions', adminAuth, admin.resetSubscriptions);
router.get('/token-usage', adminAuth, admin.getTokenUsage);

module.exports = router;
