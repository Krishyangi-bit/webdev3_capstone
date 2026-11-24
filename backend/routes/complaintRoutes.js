const express = require('express');
const controller = require('../controllers/complaintController');
const commentRoutes = require('./commentRoutes');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const { ROLES } = require('../utils/constants');
const v = require('../validators/complaintValidators');

const router = express.Router();

router.use(authenticate);

// Student workspace
router.get('/my-complaints', authorize(ROLES.STUDENT), validate(v.studentListSchema), controller.listMyComplaints);
router.get('/my-summary', authorize(ROLES.STUDENT), controller.getMySummary);
router.post('/', authorize(ROLES.STUDENT), validate(v.createComplaintSchema), controller.createComplaint);
router.post('/:id/reopen', authorize(ROLES.STUDENT), validate(v.reopenSchema), controller.reopenComplaint);
router.post('/:id/feedback', authorize(ROLES.STUDENT), validate(v.feedbackSchema), controller.submitFeedback);

// Staff progress updates
router.patch('/:id/status', authorize(ROLES.STAFF), validate(v.staffStatusSchema), controller.updateStatus);

// Any participant (ownership / assignment checked in the service)
router.get('/:id', validate(v.complaintIdSchema), controller.getComplaint);
router.get('/:id/history', validate(v.complaintIdSchema), controller.getHistory);
router.use('/:id/comments', commentRoutes);

module.exports = router;
