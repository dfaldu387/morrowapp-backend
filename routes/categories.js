const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const categoryController = require('../controllers/categoryController');

// Public: get active categories (no auth needed for onboarding)
router.get('/', categoryController.getActive);

// Admin: get all categories
router.get('/all', categoryController.getAll);

// Admin: create category
router.post('/', categoryController.create);

// Admin: update category
router.put('/:id', categoryController.update);

// Admin: delete category
router.delete('/:id', categoryController.remove);

// User: save selected categories (onboarding)
router.post('/user-select', auth, categoryController.saveUserCategories);

// User: get selected categories
router.get('/user-selected', auth, categoryController.getUserCategories);

module.exports = router;
