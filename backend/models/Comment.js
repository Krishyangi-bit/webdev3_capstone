const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    complaint: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: [true, 'Message is required'], trim: true, minlength: 1, maxlength: 1000 },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

commentSchema.index({ complaint: 1, createdAt: 1 });

module.exports = mongoose.model('Comment', commentSchema);
