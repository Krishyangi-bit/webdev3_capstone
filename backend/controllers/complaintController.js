const complaintService = require('../services/complaintService');
const { sendSuccess } = require('../utils/apiResponse');

async function createComplaint(req, res) {
  const complaint = await complaintService.createComplaint(req.user, req.body);
  return sendSuccess(res, { status: 201, message: 'Complaint submitted successfully', data: { complaint } });
}

async function listMyComplaints(req, res) {
  const { items, meta } = await complaintService.listStudentComplaints(req.user, req.validated.query);
  return sendSuccess(res, { message: 'Complaints fetched', data: { complaints: items }, meta });
}

async function getMySummary(req, res) {
  const summary = await complaintService.getStudentSummary(req.user);
  return sendSuccess(res, { message: 'Dashboard summary', data: summary });
}

async function getComplaint(req, res) {
  const details = await complaintService.getComplaintDetails(req.user, req.params.id);
  return sendSuccess(res, { message: 'Complaint details', data: details });
}

async function getHistory(req, res) {
  const history = await complaintService.getComplaintHistory(req.user, req.params.id);
  return sendSuccess(res, { message: 'Status history', data: { history } });
}

async function updateStatus(req, res) {
  const complaint = await complaintService.updateStatusByStaff(req.user, req.params.id, req.body);
  return sendSuccess(res, { message: `Complaint marked as ${complaint.status}`, data: { complaint } });
}

async function reopenComplaint(req, res) {
  const complaint = await complaintService.reopenComplaint(req.user, req.params.id, req.body);
  return sendSuccess(res, { message: 'Complaint reopened', data: { complaint } });
}

async function submitFeedback(req, res) {
  const complaint = await complaintService.submitFeedback(req.user, req.params.id, req.body);
  return sendSuccess(res, { message: 'Thank you for your feedback', data: { complaint } });
}

module.exports = {
  createComplaint,
  listMyComplaints,
  getMySummary,
  getComplaint,
  getHistory,
  updateStatus,
  reopenComplaint,
  submitFeedback,
};
