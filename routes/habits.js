const router = require('express').Router();
const auth = require('../middleware/auth');
const habitController = require('../controllers/habitController');

router.get('/', auth, habitController.getAll);
router.get('/:id', auth, habitController.getOne);
router.post('/', auth, habitController.create);
router.put('/reorder', auth, habitController.reorder);
router.put('/:id', auth, habitController.update);
router.delete('/:id', auth, habitController.remove);

router.post('/:id/toggle', auth, habitController.toggleDate);
router.put('/:id/note', auth, habitController.setNote);
router.post('/:id/freeze', auth, habitController.useStreakFreeze);

module.exports = router;
