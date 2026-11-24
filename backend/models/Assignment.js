const mongoose = require('mongoose');
const { ASSIGNMENT_STATUS } = require('../utils/constants');

// One record per time a complaint is handed to a staff member. Keeping these
// separate from the complaint preserves the full assignment trail when a
// complaint is rejected or reassigned.
const assignmentSchema = new mongoose.Schema(
  {
    complaint: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', required: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignmentStatus: {
      type: String,
      enum: Object.values(ASSIGNMENT_STATUS),
      default: ASSIGNMENT_STATUS.PENDING,
    },
    assignedAt: { type: Date, default: Date.now },
    acceptedAt: { type: Date },
    rejectedAt: { type: Date },
    completedAt: { type: Date },
    remarks: { type: String, trim: true, maxlength: 500 }, // note from the admin
    responseNote: { type: String, trim: true, maxlength: 500 }, // staff rejection reason
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

assignmentSchema.index({ assignedTo: 1, assignmentStatus: 1, assignedAt: -1 });
assignmentSchema.index({ complaint: 1, assignedAt: -1 });

module.exports = mongoose.model('Assignment', assignmentSchema);
