// Reusable rule fragments for the validate() middleware.

const PASSWORD_RULE = {
  type: 'string',
  required: true,
  minLength: 8,
  maxLength: 72, // bcrypt only uses the first 72 bytes
  pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/,
  patternMessage: 'Password must contain at least one letter and one number',
  label: 'Password',
};

const PHONE_RULE = {
  type: 'string',
  pattern: /^[0-9+\-\s]{7,15}$/,
  patternMessage: 'Phone number must be 7-15 digits',
  label: 'Phone',
};

const idParam = { id: { type: 'objectId', required: true, label: 'Id' } };

const paginationQuery = {
  page: { type: 'integer', min: 1 },
  limit: { type: 'integer', min: 1, max: 100 },
};

module.exports = { PASSWORD_RULE, PHONE_RULE, idParam, paginationQuery };
