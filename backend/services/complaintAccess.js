const Assignment = require('../models/Assignment');
const Complaint = require('../models/Complaint');
const ApiError = require('../utils/ApiError');
const { ROLES } = require('../utils/constants');

const idOf = (value) => String(value?._id ?? value ?? '');

// Admins see everything; students see complaints they reported; staff see
// complaints currently assigned to them or that they worked on previously.
async function canUserViewComplaint(user, complaint) {
  if (user.role === ROLES.ADMIN) return true;
  if (user.role === ROLES.STUDENT) return idOf(complaint.reportedBy) === user.id;
  if (user.role === ROLES.STAFF) {
    if (idOf(complaint.assignedTo) === user.id) return true;
    return Boolean(await Assignment.exists({ complaint: complaint._id, assignedTo: user.id }));
  }
  return false;
}

async function getAccessibleComplaint(user, complaintId) {
  const complaint = await Complaint.findById(complaintId);
  if (!complaint) throw ApiError.notFound('Complaint not found');
  if (!(await canUserViewComplaint(user, complaint))) {
    throw ApiError.forbidden('You do not have access to this complaint');
  }
  return complaint;
}

module.exports = { canUserViewComplaint, getAccessibleComplaint, idOf };
