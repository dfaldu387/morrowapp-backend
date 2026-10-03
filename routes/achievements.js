const router = require('express').Router();
const auth = require('../middleware/auth');
const achievementController = require('../controllers/achievementController');

router.get('/', auth, achievementController.getAll);
router.post('/unlock', auth, achievementController.unlock);
router.post('/check', auth, achievementController.check);

module.exports = router;
