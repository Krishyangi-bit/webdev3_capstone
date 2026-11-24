const express = require('express');
const controller = require('../controllers/adminController');
const analyticsRoutes = require('./analyticsRoutes');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const { ROLES } = require('../utils/constants');
const cv = require('../validators/complaintValidators');
const uv = require('../validators/userValidators');

// Mounted at /api/admin - administrators only.
const router = express.Router();

router.use(authenticate, authorize(ROLES.ADMIN));

router.get('/dashboard', controller.getDashboard);

router.get('/complaints', validate(cv.adminListSchema), controller.listComplaints);
router.patch('/complaints/:id/assign', validate(cv.assignSchema), controller.assignComplaint);
router.patch('/complaints/:id/close', validate(cv.closeSchema), controller.closeComplaint);

router.get('/users', validate(uv.listUsersSchema), controller.listUsers);
router.patch('/users/:id', validate(uv.updateUserSchema), controller.updateUser);
router.get('/staff', validate(uv.listStaffSchema), controller.listStaff);
router.post('/staff', validate(uv.createStaffSchema), controller.createStaff);

// GET /api/admin/analytics and /api/admin/staff-performance
router.use(analyticsRoutes);

module.exports = router;
