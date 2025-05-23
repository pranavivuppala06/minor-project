const Task = require('../models/task');
const Bid = require('../models/bid');

// ✅ Get a list of all open tasks (for bidders to choose from)
exports.getOpenTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ status: 'open' });
    res.status(200).json(tasks);
  } catch (err) {
    console.error('Error fetching open tasks:', err);
    res.status(500).json({ message: 'Server error fetching tasks' });
  }
};

// ✅ Get current active task (used for admin or bidding dashboard)
exports.getCurrentTask = async (req, res) => {
  try {
    const task = await Task.findOne({ status: 'open' });
    if (!task) {
      return res.status(404).json({ message: 'No active task found.' });
    }
    res.status(200).json(task);
  } catch (err) {
    console.error('Error fetching current task:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ Create a new task
exports.createTask = async (req, res) => {
  const {
    title,
    description,
    acceptedDate,
    endDate,
    biddingDeadline,
    minBid,
    filePath
  } = req.body;

  try {
    const newTask = new Task({
      userId: req.session.userId || req.user?.userId, // Handles both session and JWT auth
      title,
      description,
      acceptedDate,
      endDate,
      biddingDeadline,
      minBid,
      filePath,
      status: 'open'
    });

    await newTask.save();
    res.status(201).json({ message: 'Task created successfully', task: newTask });
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ message: 'Server error creating task' });
  }
};

// ✅ Update an existing task
exports.updateTask = async (req, res) => {
  const { id } = req.params;
  const {
    title,
    description,
    acceptedDate,
    endDate,
    biddingDeadline,
    minBid,
    filePath,
    status
  } = req.body;

  try {
    const updatedTask = await Task.findByIdAndUpdate(
      id,
      {
        title,
        description,
        acceptedDate,
        endDate,
        biddingDeadline,
        minBid,
        filePath,
        status
      },
      { new: true }
    );

    if (!updatedTask) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    res.status(200).json(updatedTask);
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ message: 'Server error updating task' });
  }
};

// ✅ Delete a task
exports.deleteTask = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedTask = await Task.findByIdAndDelete(id);

    if (!deletedTask) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({ message: 'Server error deleting task' });
  }
};
