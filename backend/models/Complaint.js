const mongoose = require('mongoose');
const Counter = require('./Counter');
const { CATEGORIES, PRIORITIES, STATUSES, STATUS } = require('../utils/constants');

const feedbackSchema = new mongoose.Schema(
  {
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, trim: true, maxlength: 500 },
    submittedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const complaintSchema = new mongoose.Schema(
  {
    complaintCode: { type: String, unique: true },
    title: { type: String, required: [true, 'Title is required'], trim: true, minlength: 5, maxlength: 120 },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: 15,
      maxlength: 2000,
    },
    category: { type: String, enum: CATEGORIES, required: true },
    priority: { type: String, enum: PRIORITIES, default: 'Medium' },
    status: { type: String, enum: STATUSES, default: STATUS.SUBMITTED },

    // Where the problem is. `location` holds a landmark or extra detail
    // ("near the east staircase"), the other fields pinpoint the room.
    building: { type: String, required: [true, 'Building is required'], trim: true, maxlength: 80 },
    block: { type: String, trim: true, maxlength: 40 },
    floor: { type: String, required: [true, 'Floor is required'], trim: true, maxlength: 20 },
    roomNumber: { type: String, trim: true, maxlength: 20 },
    location: { type: String, trim: true, maxlength: 160 },

    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    images: [{ type: String }], // public paths under /uploads/complaints
    resolutionNotes: { type: String, trim: true, maxlength: 1000 },

    resolvedAt: { type: Date },
    closedAt: { type: Date },
    reopenCount: { type: Number, default: 0 },
    feedback: { type: feedbackSchema, default: undefined },
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

complaintSchema.index({ reportedBy: 1, createdAt: -1 });
complaintSchema.index({ assignedTo: 1, status: 1 });
complaintSchema.index({ status: 1, priority: 1, createdAt: -1 });
complaintSchema.index({ category: 1 });
complaintSchema.index({ building: 1 });
complaintSchema.index({ title: 'text', description: 'text', location: 'text' });

// Runs after validation so a rejected complaint does not consume a sequence number.
complaintSchema.pre('save', async function assignComplaintCode() {
  if (this.complaintCode) return;
  const year = (this.createdAt || new Date()).getFullYear();
  const seq = await Counter.next(`complaint-${year}`);
  this.complaintCode = `CF-${year}-${String(seq).padStart(5, '0')}`;
});

module.exports = mongoose.model('Complaint', complaintSchema);
