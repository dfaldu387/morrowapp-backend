const router = require('express').Router();
const auth = require('../middleware/auth');
const aiCoachController = require('../controllers/aiCoachController');

router.get('/history', auth, aiCoachController.getHistory);
router.get('/usage', auth, aiCoachController.getUsage);
router.get('/suggestions', auth, aiCoachController.getSuggestions);
router.post('/message', auth, aiCoachController.sendMessage);
router.get('/subscribe-nonce', auth, aiCoachController.getSubscribeNonce);
router.post('/subscribe', auth, aiCoachController.subscribe);
router.post('/unsubscribe', auth, aiCoachController.unsubscribe);
router.delete('/history', auth, aiCoachController.clearHistory);

module.exports = router;
