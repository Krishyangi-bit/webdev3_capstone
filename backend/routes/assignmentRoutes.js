const express = require('express');
const controller = require('../controllers/assignmentController');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const { ROLES } = require('../utils/constants');
const v = require('../validators/assignmentValidators');

// Mounted at /api/staff - maintenance staff only.
const router = express.Router();

router.use(authenticate, authorize(ROLES.STAFF));

router.get('/dashboard', controller.getDashboard);
router.get('/assignments', validate(v.listAssignmentsSchema), controller.listAssignments);
router.get('/assignments/:id', validate(v.assignmentIdSchema), controller.getAssignment);
router.patch('/assignments/:id/accept', validate(v.acceptSchema), controller.acceptAssignment);
router.patch('/assignments/:id/reject', validate(v.rejectSchema), controller.rejectAssignment);
router.get('/work-history', validate(v.listAssignmentsSchema), controller.getWorkHistory);

module.exports = router;
