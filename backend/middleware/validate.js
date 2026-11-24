const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');

/*
 * Declarative request validation.
 *
 *   validate({
 *     params: { id: { type: 'objectId', required: true } },
 *     body:   { title: { type: 'string', required: true, minLength: 5 } },
 *     query:  { page: { type: 'integer', min: 1 } },
 *   })
 *
 * Only declared fields survive: unknown body fields are dropped so a client
 * cannot slip in properties such as `role` or `isActive`.
 * Cleaned values are available on req.validated.{body,query,params};
 * req.body is also replaced with the cleaned body.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function coerce(value, rule, source) {
  if (rule.type === 'string' || rule.type === 'email') {
    if (typeof value !== 'string') return { error: 'must be a string' };
    const trimmed = value.trim();
    return { value: rule.type === 'email' ? trimmed.toLowerCase() : trimmed };
  }
  if (rule.type === 'number' || rule.type === 'integer') {
    const number = source === 'body' ? value : Number(value);
    if (typeof number !== 'number' || Number.isNaN(number)) return { error: 'must be a number' };
    if (rule.type === 'integer' && !Number.isInteger(number)) return { error: 'must be a whole number' };
    return { value: number };
  }
  if (rule.type === 'boolean') {
    if (typeof value === 'boolean') return { value };
    if (source !== 'body' && (value === 'true' || value === 'false')) return { value: value === 'true' };
    return { error: 'must be true or false' };
  }
  if (rule.type === 'objectId') {
    if (typeof value !== 'string' || !mongoose.isValidObjectId(value)) return { error: 'must be a valid id' };
    return { value };
  }
  if (rule.type === 'array') {
    if (!Array.isArray(value)) return { error: 'must be a list' };
    return { value };
  }
  return { value };
}

function checkField(name, rawValue, rule, source) {
  const isEmpty = rawValue === undefined || rawValue === null || rawValue === '';
  if (isEmpty) {
    if (rule.required) return { error: `${rule.label || name} is required` };
    return { skip: true };
  }

  const { value, error } = coerce(rawValue, rule, source);
  const label = rule.label || name;
  if (error) return { error: `${label} ${error}` };

  if (typeof value === 'string') {
    if (rule.required && value.length === 0) return { error: `${label} is required` };
    if (rule.minLength && value.length < rule.minLength)
      return { error: `${label} must be at least ${rule.minLength} characters` };
    if (rule.maxLength && value.length > rule.maxLength)
      return { error: `${label} must be at most ${rule.maxLength} characters` };
    if (rule.type === 'email' && !EMAIL_PATTERN.test(value)) return { error: `${label} must be a valid email` };
    if (rule.pattern && !rule.pattern.test(value)) return { error: rule.patternMessage || `${label} is invalid` };
  }
  if (typeof value === 'number') {
    if (rule.min !== undefined && value < rule.min) return { error: `${label} must be at least ${rule.min}` };
    if (rule.max !== undefined && value > rule.max) return { error: `${label} must be at most ${rule.max}` };
  }
  if (Array.isArray(value)) {
    if (rule.maxItems !== undefined && value.length > rule.maxItems)
      return { error: `${label} can have at most ${rule.maxItems} items` };
    if (rule.itemEnum && value.some((item) => !rule.itemEnum.includes(item)))
      return { error: `${label} contains an invalid value` };
  }
  if (rule.enum && !rule.enum.includes(value)) {
    return { error: `${label} must be one of: ${rule.enum.join(', ')}` };
  }
  if (rule.custom) {
    const message = rule.custom(value);
    if (message) return { error: message };
  }
  return { value };
}

function validateSource(input = {}, rules, source, errors) {
  const cleaned = {};
  for (const [name, rule] of Object.entries(rules)) {
    const result = checkField(name, input[name], rule, source);
    if (result.error) errors.push({ field: name, message: result.error });
    else if (!result.skip) cleaned[name] = result.value;
  }
  return cleaned;
}

function validate(schema) {
  return (req, res, next) => {
    const errors = [];
    const validated = {};
    for (const source of ['params', 'query', 'body']) {
      if (schema[source]) validated[source] = validateSource(req[source], schema[source], source, errors);
    }
    if (errors.length > 0) {
      return next(ApiError.badRequest(errors[0].message, errors));
    }
    req.validated = { ...req.validated, ...validated };
    if (validated.body) req.body = validated.body;
    next();
  };
}

module.exports = validate;
