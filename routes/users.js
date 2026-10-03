const router = require('express').Router();
const auth = require('../middleware/auth');
const userController = require('../controllers/userController');

router.get('/me', auth, userController.getProfile);
router.put('/me', auth, userController.updateProfile);
router.put('/me/password', auth, userController.changePassword);
router.delete('/me', auth, userController.deleteAccount);

module.exports = router;
