const Bid = require('../models/bid');
const Task = require('../models/task');
const User = require('../models/user');

// Place a bid
exports.createBid = async (req, res) => {
  const { taskId, amount } = req.body;
  const userId = req.user.userId;

  try {
    const task = await Task.findById(taskId);
    if (!task || task.status !== 'open') {
      return res.status(400).json({ message: 'Task is not open for bidding' });
    }

    if (task.biddingDeadline && new Date() > task.biddingDeadline) {
      return res.status(400).json({ message: 'Bidding period has ended' });
    }

    if (amount < (task.minBid || 0)) {
      return res.status(400).json({ message: `Bid amount must be at least ₹${task.minBid}` });
    }

    const bid = new Bid({ taskId, userId, amount });
    await bid.save();

    res.status(201).json({ message: 'Bid placed successfully!', bid });
  } catch (err) {
    console.error('Error placing bid:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ✅ Get all bids for tasks created by the logged-in creator
exports.getBidsForCreatorTasks = async (req, res) => {
  try {
    const creatorId = req.user.userId;

    const tasks = await Task.find({ userId: creatorId });

    const taskIds = tasks.map(task => task._id);

    const bids = await Bid.find({ taskId: { $in: taskIds } })
      .populate('userId', 'name')
      .populate('taskId', 'title')
      .sort({ createdAt: 1 });

    const formattedBids = bids.map(bid => ({
      bidId: bid._id,
      taskTitle: bid.taskId.title,
      bidderName: bid.userId.name,
      amount: bid.amount,
      placedOn: bid.createdAt,
      taskId: bid.taskId._id
    }));

    res.status(200).json({ bids: formattedBids });
  } catch (err) {
    console.error('Error fetching bids for creator:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Accept a specific bid manually
exports.acceptBid = async (req, res) => {
  const { taskId, bidId } = req.body;

  try {
    const task = await Task.findById(taskId);
    if (!task || task.status !== 'open') {
      return res.status(400).json({ message: 'Task is not open' });
    }

    const bid = await Bid.findById(bidId).populate('userId', 'name');
    if (!bid) return res.status(404).json({ message: 'Bid not found' });

    const acceptedDate = new Date();

    task.status = 'assigned';
    task.assignedBidId = bid._id;
    task.acceptedDate = acceptedDate;
    await task.save();

    res.status(200).json({
      message: `Task assigned to ${bid.userId.name} on ${acceptedDate.toLocaleString()}`,
      assignedTo: bid.userId.name,
      acceptedDate
    });
  } catch (err) {
    console.error('Error accepting bid:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Automatically accept the lowest bid when bidding closes
exports.acceptLowestBid = async (req, res) => {
  const { taskId } = req.body;

  try {
    const task = await Task.findById(taskId);
    if (!task || task.status !== 'open') {
      return res.status(400).json({ message: 'Task is not open' });
    }

    if (task.biddingDeadline && new Date() < task.biddingDeadline) {
      return res.status(400).json({ message: 'Bidding is still ongoing' });
    }

    const lowestBid = await Bid.findOne({ taskId }).sort({ amount: 1 }).populate('userId', 'name');
    if (!lowestBid) {
      return res.status(404).json({ message: 'No bids available' });
    }

    const acceptedDate = new Date();

    task.status = 'assigned';
    task.assignedBidId = lowestBid._id;
    task.acceptedDate = acceptedDate;
    await task.save();

    res.status(200).json({
      message: `Task assigned to ${lowestBid.userId.name} on ${acceptedDate.toLocaleString()}`,
      winner: lowestBid.userId.name,
      acceptedDate
    });
  } catch (err) {
    console.error('Error accepting lowest bid:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get current lowest bid for a task
exports.getLowestBid = async (req, res) => {
  try {
    const bid = await Bid.findOne({ taskId: req.params.taskId })
      .sort({ amount: 1 })
      .populate('userId', 'name');
    if (!bid) return res.status(404).json({ message: 'No bids found' });
    res.status(200).json({ lowestBid: bid });
  } catch (err) {
    console.error('Error fetching lowest bid:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get bids placed by the logged-in user along with populated task info
exports.getUserBids = async (req, res) => {
  try {
    const bids = await Bid.find({ userId: req.user.userId })
      .populate('taskId', 'title description acceptedDate endDate biddingDeadline minBid')
      .sort({ createdAt: -1 });

    res.status(200).json({ bids });
  } catch (err) {
    console.error('Error fetching user bids:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
