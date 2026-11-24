const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const env = require('../config/env');
const { ROLES, CATEGORIES } = require('../utils/constants');

const refreshSessionSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    userAgent: { type: String, maxlength: 300 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, minlength: 2, maxlength: 80 },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email is invalid'],
    },
    password: { type: String, required: [true, 'Password is required'], minlength: 8, select: false },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.STUDENT },
    department: { type: String, trim: true, maxlength: 80 },
    phone: { type: String, trim: true, match: [/^[0-9+\-\s]{7,15}$/, 'Phone number is invalid'] },

    // Profile information. Which fields apply depends on the role.
    studentId: { type: String, trim: true, maxlength: 30 }, // students
    hostel: { type: String, trim: true, maxlength: 60 }, // students
    designation: { type: String, trim: true, maxlength: 60 }, // staff
    specializations: [{ type: String, enum: CATEGORIES }], // staff
    bio: { type: String, trim: true, maxlength: 300 },

    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },

    // Hashed refresh tokens, one per signed-in device. Never returned by the API.
    refreshSessions: { type: [refreshSessionSchema], select: false, default: [] },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.refreshSessions;
        delete ret.__v;
        return ret;
      },
    },
  }
);

userSchema.index({ role: 1, isActive: 1 });

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, env.bcryptSaltRounds);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
