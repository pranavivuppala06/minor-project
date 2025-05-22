const Bid = require('../models/bid');
const Task = require('../models/task');

// ✅ 1. Place a bid (no amount check)
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

    const bid = new Bid({ taskId, userId, amount });
    await bid.save();

    res.status(201).json({ message: 'Bid placed successfully!', bid });
  } catch (err) {
    console.error('Error placing bid:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ✅ 2. View all bids for a task
exports.getBidsForTask = async (req, res) => {
  try {
    const bids = await Bid.find({ taskId: req.params.taskId }).sort({ amount: 1 }).populate('userId', 'name');
    res.status(200).json({ bids });
  } catch (err) {
    console.error('Error fetching bids:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ✅ 3. Manually accept a specific bid
exports.acceptBid = async (req, res) => {
  const { taskId, bidId } = req.body;

  try {
    const task = await Task.findById(taskId);
    if (!task || task.status !== 'open') {
      return res.status(400).json({ message: 'Task is not open' });
    }

    const bid = await Bid.findById(bidId);
    if (!bid) return res.status(404).json({ message: 'Bid not found' });

    task.status = 'in-progress';
    task.bidderId = bid.userId;
    await task.save();

    res.status(200).json({ message: 'Bid accepted', winner: bid });
  } catch (err) {
    console.error('Error accepting bid:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ✅ 4. Automatically accept the lowest bid (when bidding closes)
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

    const lowestBid = await Bid.findOne({ taskId }).sort({ amount: 1 });
    if (!lowestBid) {
      return res.status(404).json({ message: 'No bids available' });
    }

    task.status = 'in-progress';
    task.bidderId = lowestBid.userId;
    await task.save();

    res.status(200).json({ message: 'Lowest bid accepted', winner: lowestBid });
  } catch (err) {
    console.error('Error accepting lowest bid:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ✅ 5. View current lowest bid
exports.getLowestBid = async (req, res) => {
  try {
    const bid = await Bid.findOne({ taskId: req.params.taskId }).sort({ amount: 1 }).populate('userId', 'name');
    if (!bid) return res.status(404).json({ message: 'No bids found' });
    res.status(200).json({ lowestBid: bid });
  } catch (err) {
    console.error('Error fetching lowest bid:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
