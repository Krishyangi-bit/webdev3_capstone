const { idParam, paginationQuery } = require('./common');

const listAssignmentsSchema = {
  query: {
    ...paginationQuery,
    view: { type: 'string', enum: ['current', 'pending', 'active', 'completed', 'history'] },
  },
};

const assignmentIdSchema = { params: idParam };

const acceptSchema = {
  params: idParam,
  body: { remarks: { type: 'string', maxLength: 500, label: 'Remarks' } },
};

const rejectSchema = {
  params: idParam,
  body: { reason: { type: 'string', required: true, minLength: 10, maxLength: 500, label: 'Reason' } },
};

const notificationListSchema = {
  query: { ...paginationQuery, unread: { type: 'boolean' } },
};

module.exports = { listAssignmentsSchema, assignmentIdSchema, acceptSchema, rejectSchema, notificationListSchema };
