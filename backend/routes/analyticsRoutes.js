const express = require('express');
const controller = require('../controllers/analyticsController');
const validate = require('../middleware/validate');
const { analyticsSchema } = require('../validators/userValidators');

// Mounted inside adminRoutes (/api/admin), which already applies
// authenticate + authorize('admin') to every route.
const router = express.Router();

router.get('/analytics', validate(analyticsSchema), controller.getAnalytics);
router.get('/staff-performance', validate(analyticsSchema), controller.getStaffPerformance);

module.exports = router;
