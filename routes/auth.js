const express = require('express');
const router = express.Router();
const User = require('../models/user');  // Your user model path
const bcrypt = require('bcryptjs');

// Registration route
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;  // role included

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'Please fill all required fields' });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email already registered' });

    const user = new User({ name, email, password, role });
    await user.save();

    res.status(201).json({ message: 'Registration successful' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login route
router.post('/login', async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ message: 'Please fill all required fields' });
  }

  try {
    const user = await User.findOne({ email, role });
    if (!user) return res.status(401).json({ message: 'Invalid email, password, or role' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid email, password, or role' });

    req.session.userId = user._id;
    req.session.role = user.role;

    res.json({ message: 'Login successful', role: user.role });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

module.exports = router;
