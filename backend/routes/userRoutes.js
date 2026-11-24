const express = require('express');
const controller = require('../controllers/userController');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { updateProfileSchema, changePasswordSchema } = require('../validators/userValidators');

// Mounted at /api/users - the signed-in user's own profile (any role).
const router = express.Router();

router.use(authenticate);

router.get('/me', controller.getProfile);
router.patch('/me', validate(updateProfileSchema), controller.updateProfile);
router.patch('/me/password', validate(changePasswordSchema), controller.changePassword);

module.exports = router;
