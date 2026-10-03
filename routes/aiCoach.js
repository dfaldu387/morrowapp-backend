const router = require('express').Router();
const auth = require('../middleware/auth');
const aiCoachController = require('../controllers/aiCoachController');

router.get('/history', auth, aiCoachController.getHistory);
router.post('/message', auth, aiCoachController.sendMessage);
router.delete('/history', auth, aiCoachController.clearHistory);

module.exports = router;
