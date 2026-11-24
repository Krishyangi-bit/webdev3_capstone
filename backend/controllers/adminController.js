const complaintService = require('../services/complaintService');
const userService = require('../services/userService');
const analyticsService = require('../services/analyticsService');
const { sendSuccess } = require('../utils/apiResponse');

async function getDashboard(req, res) {
  const data = await analyticsService.getAdminDashboard();
  return sendSuccess(res, { message: 'Admin dashboard', data });
}

async function listComplaints(req, res) {
  const { items, meta } = await complaintService.listAllComplaints(req.validated.query);
  return sendSuccess(res, { message: 'Complaints fetched', data: { complaints: items }, meta });
}

async function assignComplaint(req, res) {
  const complaint = await complaintService.assignComplaint(req.user, req.params.id, req.body);
  return sendSuccess(res, { message: `Complaint assigned to ${complaint.assignedTo.name}`, data: { complaint } });
}

async function closeComplaint(req, res) {
  const complaint = await complaintService.closeComplaintByAdmin(req.user, req.params.id, req.body);
  return sendSuccess(res, { message: 'Complaint closed', data: { complaint } });
}

async function listUsers(req, res) {
  const { items, meta } = await userService.listUsers(req.validated.query);
  return sendSuccess(res, { message: 'Users fetched', data: { users: items }, meta });
}

async function listStaff(req, res) {
  const staff = await userService.listStaffWithWorkload(req.validated.query);
  return sendSuccess(res, { message: 'Staff fetched', data: { staff } });
}

async function createStaff(req, res) {
  const staff = await userService.createStaff(req.body);
  return sendSuccess(res, { status: 201, message: 'Staff account created', data: { user: staff } });
}

async function updateUser(req, res) {
  const user = await userService.updateUserByAdmin(req.user, req.params.id, req.body);
  return sendSuccess(res, { message: 'User updated', data: { user } });
}

module.exports = { getDashboard, listComplaints, assignComplaint, closeComplaint, listUsers, listStaff, createStaff, updateUser };
