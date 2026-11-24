const { PASSWORD_RULE, PHONE_RULE } = require('./common');

const registerSchema = {
  body: {
    name: { type: 'string', required: true, minLength: 2, maxLength: 80, label: 'Name' },
    email: { type: 'email', required: true, maxLength: 120, label: 'Email' },
    password: PASSWORD_RULE,
    department: { type: 'string', required: true, maxLength: 80, label: 'Department' },
    studentId: { type: 'string', required: true, maxLength: 30, label: 'Student ID' },
    phone: PHONE_RULE,
    hostel: { type: 'string', maxLength: 60, label: 'Hostel' },
  },
};

const loginSchema = {
  body: {
    email: { type: 'email', required: true, label: 'Email' },
    password: { type: 'string', required: true, maxLength: 72, label: 'Password' },
  },
};

module.exports = { registerSchema, loginSchema };
