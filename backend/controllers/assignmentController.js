const assignmentService = require('../services/assignmentService');
const { sendSuccess } = require('../utils/apiResponse');

async function getDashboard(req, res) {
  const data = await assignmentService.getStaffDashboard(req.user);
  return sendSuccess(res, { message: 'Staff dashboard', data });
}

async function listAssignments(req, res) {
  const { items, meta } = await assignmentService.listForStaff(req.user, req.validated.query);
  return sendSuccess(res, { message: 'Assignments fetched', data: { assignments: items }, meta });
}

async function getAssignment(req, res) {
  const assignment = await assignmentService.getAssignment(req.user, req.params.id);
  return sendSuccess(res, { message: 'Assignment details', data: { assignment } });
}

async function acceptAssignment(req, res) {
  const assignment = await assignmentService.acceptAssignment(req.user, req.params.id, req.body);
  return sendSuccess(res, { message: 'Assignment accepted', data: { assignment } });
}

async function rejectAssignment(req, res) {
  const assignment = await assignmentService.rejectAssignment(req.user, req.params.id, req.body);
  return sendSuccess(res, { message: 'Assignment declined', data: { assignment } });
}

async function getWorkHistory(req, res) {
  const { items, meta, stats } = await assignmentService.getWorkHistory(req.user, req.validated.query);
  return sendSuccess(res, { message: 'Work history', data: { assignments: items, stats }, meta });
}

module.exports = { getDashboard, listAssignments, getAssignment, acceptAssignment, rejectAssignment, getWorkHistory };
