const analyticsService = require('../services/analyticsService');
const { sendSuccess } = require('../utils/apiResponse');

async function getAnalytics(req, res) {
  const data = await analyticsService.getAnalytics(req.validated.query);
  return sendSuccess(res, { message: 'Analytics', data });
}

async function getStaffPerformance(req, res) {
  const staff = await analyticsService.getStaffPerformance(req.validated.query);
  return sendSuccess(res, { message: 'Staff performance', data: { staff } });
}

module.exports = { getAnalytics, getStaffPerformance };
