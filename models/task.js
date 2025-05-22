const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  acceptedDate: {
    type: Date,
    default: null
  },
  dueDate: {
    type: Date,
    required: true
  },
  biddingDeadline: {
    type: Date,
    required: true
  },
  minBid: {
    type: Number,
    default: 0,
    min: 0
  },
  filePath: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['open', 'assigned', 'completed', 'canceled'],
    default: 'open'
  },
  assignedBidId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bid',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
