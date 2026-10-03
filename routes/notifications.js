const router = require('express').Router();
const auth = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

router.get('/', auth, notificationController.getAll);
router.get('/unread-count', auth, notificationController.getUnreadCount);
router.post('/', auth, notificationController.create);
router.put('/read-all', auth, notificationController.markAllRead);
router.put('/:id/read', auth, notificationController.markRead);
router.delete('/:id', auth, notificationController.remove);

module.exports = router;
