const Task = require('../models/task');  // Assuming you have a Task model
const Bid = require('../models/bid');    // Assuming you have a Bid model

// Controller to get current task
exports.getCurrentTask = async (req, res) => {
  try {
    const task = await Task.findOne({ status: 'active' }); // Example: Get active task
    if (!task) {
      return res.status(404).json({ message: 'No active task found.' });
    }
    res.status(200).json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Controller to create a task
exports.createTask = async (req, res) => {
  const { title, description, dueDate } = req.body;

  try {
    const newTask = new Task({
      title,
      description,
      dueDate,
      status: 'active',  // Initially set the status to active
    });
    await newTask.save();
    res.status(201).json(newTask);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Controller to update task details
exports.updateTask = async (req, res) => {
  const { id } = req.params;
  const { title, description, dueDate, status } = req.body;

  try {
    const updatedTask = await Task.findByIdAndUpdate(id, { title, description, dueDate, status }, { new: true });
    if (!updatedTask) {
      return res.status(404).json({ message: 'Task not found.' });
    }
    res.status(200).json(updatedTask);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Controller to delete a task
exports.deleteTask = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedTask = await Task.findByIdAndDelete(id);
    if (!deletedTask) {
      return res.status(404).json({ message: 'Task not found.' });
    }
    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
