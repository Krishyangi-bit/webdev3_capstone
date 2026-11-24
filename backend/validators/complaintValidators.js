const { CATEGORIES, PRIORITIES, STATUSES, BUILDINGS, STATUS } = require('../utils/constants');
const { idParam, paginationQuery } = require('./common');
const { MAX_IMAGES } = require('../utils/imageStorage');

const createComplaintSchema = {
  body: {
    title: { type: 'string', required: true, minLength: 5, maxLength: 120, label: 'Title' },
    description: { type: 'string', required: true, minLength: 15, maxLength: 2000, label: 'Description' },
    category: { type: 'string', required: true, enum: CATEGORIES, label: 'Category' },
    priority: { type: 'string', required: true, enum: PRIORITIES, label: 'Priority' },
    building: { type: 'string', required: true, enum: BUILDINGS, label: 'Building' },
    block: { type: 'string', maxLength: 40, label: 'Block / wing' },
    floor: { type: 'string', required: true, maxLength: 20, label: 'Floor' },
    roomNumber: { type: 'string', maxLength: 20, label: 'Room number' },
    location: { type: 'string', maxLength: 160, label: 'Location details' },
    images: { type: 'array', maxItems: MAX_IMAGES, label: 'Images' },
  },
};

const studentListSchema = {
  query: {
    ...paginationQuery,
    status: { type: 'string', enum: STATUSES },
    category: { type: 'string', enum: CATEGORIES },
    search: { type: 'string', maxLength: 100 },
  },
};

const adminListSchema = {
  query: {
    ...paginationQuery,
    status: { type: 'string', enum: STATUSES },
    category: { type: 'string', enum: CATEGORIES },
    priority: { type: 'string', enum: PRIORITIES },
    building: { type: 'string', enum: BUILDINGS },
    assignedTo: {
      type: 'string',
      pattern: /^([0-9a-fA-F]{24}|unassigned)$/,
      patternMessage: 'assignedTo must be a staff id or "unassigned"',
    },
    open: { type: 'boolean' },
    overdue: { type: 'boolean' },
    search: { type: 'string', maxLength: 100 },
    sort: { type: 'string', enum: ['newest', 'oldest', 'updated', 'priority'] },
  },
};

const complaintIdSchema = { params: idParam };

const staffStatusSchema = {
  params: idParam,
  body: {
    status: { type: 'string', required: true, enum: [STATUS.IN_PROGRESS, STATUS.RESOLVED], label: 'Status' },
    remarks: { type: 'string', maxLength: 500, label: 'Remarks' },
    resolutionNotes: { type: 'string', minLength: 10, maxLength: 1000, label: 'Resolution notes' },
  },
};

const reopenSchema = {
  params: idParam,
  body: { reason: { type: 'string', required: true, minLength: 10, maxLength: 500, label: 'Reason' } },
};

const feedbackSchema = {
  params: idParam,
  body: {
    rating: { type: 'integer', required: true, min: 1, max: 5, label: 'Rating' },
    comment: { type: 'string', maxLength: 500, label: 'Comment' },
  },
};

const assignSchema = {
  params: idParam,
  body: {
    staffId: { type: 'objectId', required: true, label: 'Staff member' },
    remarks: { type: 'string', maxLength: 500, label: 'Remarks' },
  },
};

const closeSchema = {
  params: idParam,
  body: { remarks: { type: 'string', required: true, minLength: 5, maxLength: 500, label: 'Reason for closing' } },
};

const commentSchema = {
  params: idParam,
  body: { message: { type: 'string', required: true, minLength: 1, maxLength: 1000, label: 'Comment' } },
};

module.exports = {
  createComplaintSchema,
  studentListSchema,
  adminListSchema,
  complaintIdSchema,
  staffStatusSchema,
  reopenSchema,
  feedbackSchema,
  assignSchema,
  closeSchema,
  commentSchema,
};
