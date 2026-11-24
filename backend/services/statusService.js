const StatusHistory = require('../models/StatusHistory');
const ApiError = require('../utils/ApiError');
const { STATUS_TRANSITIONS } = require('../utils/constants');

function canTransition(from, to) {
  return (STATUS_TRANSITIONS[from] || []).includes(to);
}

function assertTransition(from, to) {
  if (!canTransition(from, to)) {
    throw ApiError.unprocessable(`A complaint cannot move from "${from}" to "${to}"`);
  }
}

// Changes the status on the complaint document, saves it and appends a history entry.
async function changeStatus(complaint, newStatus, actorId, remarks) {
  const previousStatus = complaint.status;
  assertTransition(previousStatus, newStatus);
  complaint.status = newStatus;
  await complaint.save();
  await StatusHistory.create({
    complaint: complaint._id,
    previousStatus,
    newStatus,
    changedBy: actorId,
    remarks,
  });
  return previousStatus;
}

function getHistory(complaintId) {
  return StatusHistory.find({ complaint: complaintId })
    .sort({ createdAt: 1 })
    .populate('changedBy', 'name role');
}

module.exports = { canTransition, assertTransition, changeStatus, getHistory };
