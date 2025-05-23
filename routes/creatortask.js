const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Task = require('../models/task');

// Directory to store uploaded files
const uploadDir = path.join(__dirname, '..', 'uploads');

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage });

router.post('/create-task', upload.single('file'), async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Unauthorized. Please log in.' });
    }

    // Destructure and trim inputs
    let { title, description, acceptedDate, endDate, biddingDeadline, minBid } = req.body;

    title = title?.trim();
    description = description?.trim();
    acceptedDate = acceptedDate?.trim();
    endDate = endDate?.trim();
    biddingDeadline = biddingDeadline?.trim();
    minBid = minBid ? minBid.trim() : '0';

    // Validate required fields
    if (!title || !description || !acceptedDate || !endDate || !biddingDeadline) {
      return res.status(400).json({ message: 'Title, description, accepted date, end date, and bidding deadline are required.' });
    }

    // Parse dates and minBid
    const acceptedDateParsed = new Date(acceptedDate);
    const endDateParsed = new Date(endDate);
    const biddingDeadlineParsed = new Date(biddingDeadline);
    const minBidParsed = Number(minBid);

    // Validate dates and minBid
    if (isNaN(acceptedDateParsed.getTime())) {
      return res.status(400).json({ message: 'Invalid accepted date format.' });
    }
    if (isNaN(endDateParsed.getTime())) {
      return res.status(400).json({ message: 'Invalid end date format.' });
    }
    if (isNaN(biddingDeadlineParsed.getTime())) {
      return res.status(400).json({ message: 'Invalid bidding deadline format.' });
    }
    if (isNaN(minBidParsed) || minBidParsed < 0) {
      return res.status(400).json({ message: 'Minimum bid must be a positive number or zero.' });
    }

    // Prepare file path if file uploaded
    const filePath = req.file
      ? path.relative(path.join(__dirname, '..'), req.file.path).replace(/\\/g, '/')
      : null;

    // Create new Task document
    const newTask = new Task({
      userId: req.session.userId,
      title,
      description,
      acceptedDate: acceptedDateParsed,
      endDate: endDateParsed,
      biddingDeadline: biddingDeadlineParsed,
      minBid: minBidParsed,
      filePath,
      status: 'open'
    });

    await newTask.save();

    // Respond with success
    res.status(201).json({ message: 'Task created successfully', task: newTask });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ message: 'Server error creating task.' });
  }
});

module.exports = router;
