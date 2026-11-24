const mongoose = require('mongoose');
const { STATUSES } = require('../utils/constants');

// Append-only audit trail of every status change on a complaint.
const statusHistorySchema = new mongoose.Schema(
  {
    complaint: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', required: true },
    previousStatus: { type: String, enum: [...STATUSES, null], default: null }, // null on creation
    newStatus: { type: String, enum: STATUSES, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    remarks: { type: String, trim: true, maxlength: 500 },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'statushistories',
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

statusHistorySchema.index({ complaint: 1, createdAt: 1 });

module.exports = mongoose.model('StatusHistory', statusHistorySchema);
