const express = require('express');
const controller = require('../controllers/notificationController');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { notificationListSchema, assignmentIdSchema } = require('../validators/assignmentValidators');

// Mounted at /api/notifications - every user sees only their own notifications.
const router = express.Router();

router.use(authenticate);

router.get('/', validate(notificationListSchema), controller.listNotifications);
router.get('/unread-count', controller.getUnreadCount);
router.patch('/read-all', controller.markAllAsRead);
router.patch('/:id/read', validate(assignmentIdSchema), controller.markAsRead);

module.exports = router;
