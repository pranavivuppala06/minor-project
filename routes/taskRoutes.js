const express = require('express');
const router = express.Router();
const TaskController = require('../controllers/taskController');
const authenticate = require('../middleware/authenticate');

// Route to get the current task
router.get('/task/current-task', authenticate, TaskController.getCurrentTask);

// Route to create a task
router.post('/task', authenticate, TaskController.createTask);

// Route to manage tasks (update task)
router.put('/task/:id', authenticate, TaskController.updateTask);

// Route to delete a task
router.delete('/task/:id', authenticate, TaskController.deleteTask);

module.exports = router;
