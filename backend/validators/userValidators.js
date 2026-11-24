const { CATEGORIES, ROLES } = require('../utils/constants');
const { PASSWORD_RULE, PHONE_RULE, idParam, paginationQuery } = require('./common');

const updateProfileSchema = {
  body: {
    name: { type: 'string', minLength: 2, maxLength: 80, label: 'Name' },
    phone: PHONE_RULE,
    department: { type: 'string', maxLength: 80, label: 'Department' },
    hostel: { type: 'string', maxLength: 60, label: 'Hostel' },
    bio: { type: 'string', maxLength: 300, label: 'Bio' },
  },
};

const changePasswordSchema = {
  body: {
    currentPassword: { type: 'string', required: true, maxLength: 72, label: 'Current password' },
    newPassword: { ...PASSWORD_RULE, label: 'New password' },
  },
};

const listUsersSchema = {
  query: {
    ...paginationQuery,
    role: { type: 'string', enum: Object.values(ROLES) },
    status: { type: 'string', enum: ['active', 'inactive'] },
    search: { type: 'string', maxLength: 100 },
  },
};

const listStaffSchema = {
  query: {
    category: { type: 'string', enum: CATEGORIES },
    activeOnly: { type: 'boolean' },
  },
};

const createStaffSchema = {
  body: {
    name: { type: 'string', required: true, minLength: 2, maxLength: 80, label: 'Name' },
    email: { type: 'email', required: true, maxLength: 120, label: 'Email' },
    password: PASSWORD_RULE,
    phone: { ...PHONE_RULE, required: true },
    department: { type: 'string', maxLength: 80, label: 'Department' },
    designation: { type: 'string', required: true, maxLength: 60, label: 'Designation' },
    specializations: { type: 'array', required: true, maxItems: CATEGORIES.length, itemEnum: CATEGORIES, label: 'Specializations' },
  },
};

const updateUserSchema = {
  params: idParam,
  body: {
    name: { type: 'string', minLength: 2, maxLength: 80, label: 'Name' },
    phone: PHONE_RULE,
    department: { type: 'string', maxLength: 80, label: 'Department' },
    designation: { type: 'string', maxLength: 60, label: 'Designation' },
    specializations: { type: 'array', maxItems: CATEGORIES.length, itemEnum: CATEGORIES, label: 'Specializations' },
    studentId: { type: 'string', maxLength: 30, label: 'Student ID' },
    hostel: { type: 'string', maxLength: 60, label: 'Hostel' },
    isActive: { type: 'boolean', label: 'Active' },
  },
};

const analyticsSchema = {
  query: { days: { type: 'integer', enum: [7, 30, 90, 365] } },
};

module.exports = {
  updateProfileSchema,
  changePasswordSchema,
  listUsersSchema,
  listStaffSchema,
  createStaffSchema,
  updateUserSchema,
  analyticsSchema,
};
