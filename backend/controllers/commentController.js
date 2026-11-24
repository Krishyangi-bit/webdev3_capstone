const commentService = require('../services/commentService');
const { sendSuccess } = require('../utils/apiResponse');

async function listComments(req, res) {
  const comments = await commentService.listComments(req.user, req.params.id);
  return sendSuccess(res, { message: 'Comments fetched', data: { comments } });
}

async function addComment(req, res) {
  const comment = await commentService.addComment(req.user, req.params.id, req.body);
  return sendSuccess(res, { status: 201, message: 'Comment added', data: { comment } });
}

module.exports = { listComments, addComment };
