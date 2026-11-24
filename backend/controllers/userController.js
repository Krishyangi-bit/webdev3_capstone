const userService = require('../services/userService');
const { sendSuccess } = require('../utils/apiResponse');

async function getProfile(req, res) {
  return sendSuccess(res, { message: 'Profile', data: { user: req.user.doc } });
}

async function updateProfile(req, res) {
  const user = await userService.updateOwnProfile(req.user, req.body);
  return sendSuccess(res, { message: 'Profile updated', data: { user } });
}

async function changePassword(req, res) {
  await userService.changePassword(req.user, req.body);
  return sendSuccess(res, { message: 'Password changed. Other devices have been signed out.' });
}

module.exports = { getProfile, updateProfile, changePassword };
