const Comment = require('../models/Comment');
const ApiError = require('../utils/ApiError');
const { STATUS } = require('../utils/constants');
const { complaintEvents, COMPLAINT_EVENTS } = require('../events/complaintEvents');
const { getAccessibleComplaint } = require('./complaintAccess');

async function listComments(user, complaintId) {
  const complaint = await getAccessibleComplaint(user, complaintId);
  return Comment.find({ complaint: complaint._id }).sort({ createdAt: 1 }).populate('author', 'name role');
}

async function addComment(user, complaintId, { message }) {
  const complaint = await getAccessibleComplaint(user, complaintId);
  if (complaint.status === STATUS.CLOSED) {
    throw ApiError.unprocessable('This complaint is closed. Comments are no longer accepted.');
  }
  const comment = await Comment.create({ complaint: complaint._id, author: user.id, message });
  await comment.populate('author', 'name role');

  complaintEvents.emit(COMPLAINT_EVENTS.COMMENT_ADDED, {
    complaint,
    comment,
    actor: { id: user.id, name: user.name, role: user.role },
  });
  return comment;
}

module.exports = { listComments, addComment };
