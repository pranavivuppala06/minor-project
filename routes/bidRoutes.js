const express = require('express');
const router = express.Router();
const {
  createBid,
  getBidsForTask,
  acceptBid,
  acceptLowestBid,
  getLowestBid
} = require('../controllers/bidController');
const authenticate = require('../middleware/authenticate');

// Place a bid
router.post('/bid', authenticate, createBid);

// Get all bids for a task
router.get('/bids/:taskId', authenticate, getBidsForTask);

// Accept a specific bid manually
router.post('/accept-bid', authenticate, acceptBid);

// Accept the lowest bid automatically
router.post('/accept-lowest', authenticate, acceptLowestBid);

// Get current lowest bid
router.get('/lowest-bid/:taskId', authenticate, getLowestBid);

module.exports = router;
