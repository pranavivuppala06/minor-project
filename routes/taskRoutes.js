const express = require('express');
const router = express.Router();
const Task = require('../models/task');
const multer = require('multer');
const path = require('path');

// Middleware to check authentication and role
function requireAuth(role) {
  return (req, res, next) => {
    if (req.session.userId && req.session.role === role) {
      return next();
    }
    return res.status(403).json({ message: 'Forbidden: Unauthorized access' });
  };
}

// Multer storage setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// ✅ Create a new task (CREATOR only)
router.post('/create-task', requireAuth('creator'), upload.single('file'), async (req, res) => {
  try {
    let { title, description, acceptedDate, endDate, biddingDeadline, minBid } = req.body;

    // Trim and validate inputs
    title = title?.trim();
    description = description?.trim();
    acceptedDate = acceptedDate?.trim();
    endDate = endDate?.trim();
    biddingDeadline = biddingDeadline?.trim();
    minBid = minBid ? minBid.trim() : '0';

    if (!title || !description || !acceptedDate || !endDate || !biddingDeadline) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const parsedAcceptedDate = new Date(acceptedDate);
    const parsedEndDate = new Date(endDate);
    const parsedDeadline = new Date(biddingDeadline);
    const parsedMinBid = Number(minBid);

    if (
      isNaN(parsedAcceptedDate.getTime()) ||
      isNaN(parsedEndDate.getTime()) ||
      isNaN(parsedDeadline.getTime())
    ) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    if (isNaN(parsedMinBid) || parsedMinBid < 0) {
      return res.status(400).json({ message: 'Minimum bid must be a positive number or 0' });
    }

    const filePath = req.file ? path.normalize(req.file.path).replace(/\\/g, '/') : null;

    const task = new Task({
      userId: req.session.userId,
      title,
      description,
      acceptedDate: parsedAcceptedDate,
      endDate: parsedEndDate,
      biddingDeadline: parsedDeadline,
      minBid: parsedMinBid,
      filePath,
      status: 'open',
    });

    await task.save();
    res.status(201).json({ message: 'Task created successfully', task });
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ message: 'Failed to create task' });
  }
});

// ✅ Get all tasks created by logged-in CREATOR
router.get('/my-tasks', requireAuth('creator'), async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.session.userId })
      .populate({
        path: 'assignedBidId',
        populate: {
          path: 'userId',
          select: 'name email',
        },
      })
      .sort({ createdAt: -1 });

    res.status(200).json(tasks);
  } catch (err) {
    console.error('Error fetching creator tasks:', err);
    res.status(500).json({ message: 'Failed to load tasks' });
  }
});

// ✅ Get all open tasks (BIDDER only)
router.get('/get-open-tasks', requireAuth('bidder'), async (req, res) => {
  try {
    const openTasks = await Task.find({ status: 'open' }).sort({ createdAt: -1 });
    res.status(200).json(openTasks);
  } catch (err) {
    console.error('Error fetching open tasks:', err);
    res.status(500).json({ message: 'Failed to fetch open tasks' });
  }
});

module.exports = router;
