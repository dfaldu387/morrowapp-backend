const router = require('express').Router();
const auth = require('../middleware/auth');
const settingsController = require('../controllers/settingsController');

router.get('/', auth, settingsController.get);
router.put('/', auth, settingsController.update);

module.exports = router;
