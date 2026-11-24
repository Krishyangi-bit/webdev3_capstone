const express = require('express');
const controller = require('../controllers/commentController');
const validate = require('../middleware/validate');
const { commentSchema, complaintIdSchema } = require('../validators/complaintValidators');

// Mounted at /api/complaints/:id/comments (authentication applied by the parent router).
const router = express.Router({ mergeParams: true });

router.get('/', validate(complaintIdSchema), controller.listComments);
router.post('/', validate(commentSchema), controller.addComment);

module.exports = router;
