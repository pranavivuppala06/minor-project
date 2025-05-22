// creatortask.js
const express = require('express');
const router = express.Router();
const Task = require('../models/task');
const Bid = require('../models/bid');

// Middleware to check if user is a creator
function isCreator(req, res, next) {
  if (req.session.userRole === 'creator') {
    next();
  } else {
    res.status(403).json({ message: 'Forbidden: Not a creator' });
  }
}

// Get all tasks created by logged-in creator
router.get('/my-tasks', isCreator, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.session.userId }).lean();

    // Optionally add number of bids per task
    for (let task of tasks) {
      task.bids = await Bid.countDocuments({ taskId: task._id });
    }

    res.json(tasks);
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ message: 'Server error fetching tasks' });
  }
});

// Create a new task
router.post('/create-task', isCreator, async (req, res) => {
  try {
    const { description, acceptedDate, dueDate, biddingDeadline, filePath } = req.body;

    const newTask = new Task({
      userId: req.session.userId,
      description,
      acceptedDate,
      dueDate,
      biddingDeadline,
      filePath,
      status: 'open'
    });

    await newTask.save();
    res.status(201).json({ message: 'Task created successfully', task: newTask });
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ message: 'Server error creating task' });
  }
});

// View bids for a specific task
router.get('/task/:taskId/bids', isCreator, async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (task.userId.toString() !== req.session.userId) {
      return res.status(403).json({ message: 'Not authorized to view bids for this task' });
    }

    const bids = await Bid.find({ taskId: req.params.taskId }).sort({ amount: 1 }).lean();
    res.json(bids);
  } catch (err) {
    console.error('Error fetching bids:', err);
    res.status(500).json({ message: 'Server error fetching bids' });
  }
});

// Accept a bid for a task
router.post('/task/:taskId/accept-bid', isCreator, async (req, res) => {
  const { bidId } = req.body;
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (task.userId.toString() !== req.session.userId) {
      return res.status(403).json({ message: 'Not authorized to accept bids for this task' });
    }
    if (task.status !== 'open') {
      return res.status(400).json({ message: 'Task is not open for accepting bids' });
    }

    const bid = await Bid.findById(bidId);
    if (!bid) return res.status(404).json({ message: 'Bid not found' });

    task.status = 'in-progress';
    task.bidderId = bid.userId;
    await task.save();

    res.json({ message: 'Bid accepted', winner: bid });
  } catch (err) {
    console.error('Error accepting bid:', err);
    res.status(500).json({ message: 'Server error accepting bid' });
  }
});

module.exports = router;
