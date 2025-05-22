const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const MongoStore = require('connect-mongo');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/userAuthDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Models
const User = require('./models/user');
const Task = require('./models/task');
const Bid = require('./models/bid');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: 'mongodb://localhost:27017/userAuthDB' }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
}));

// File Upload Setup
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Auth Middleware Helpers
function isAuthenticated(req, res, next) {
  if (req.session.userId) return next();
  return res.status(401).json({ message: 'Unauthorized' });
}

function requireAuth(role) {
  return function (req, res, next) {
    if (req.session.userId && req.session.role === role) return next();
    return res.status(403).send('Forbidden');
  };
}

// Routes
app.get('/', (_, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/register.html', (_, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/creatordashboard.html', requireAuth('creator'), (_, res) => res.sendFile(path.join(__dirname, 'public', 'creatordashboard.html')));
app.get('/bidderdashboard.html', requireAuth('bidder'), (_, res) => res.sendFile(path.join(__dirname, 'public', 'bidderdashboard.html')));
app.get('/auction.html', isAuthenticated, (_, res) => res.sendFile(path.join(__dirname, 'public', 'auction.html')));

// Registration
app.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
    if (existingUser) return res.status(400).json({ message: 'Email already registered' });

    const newUser = new User({ name, email: email.trim().toLowerCase(), password, role });
    await newUser.save();

    res.status(201).json({ message: 'Registration successful' });
  } catch (err) {
    console.error('Register Error:', err);
    res.status(500).json({ message: 'Registration failed' });
  }
});

// Login (Plain Text Password)
app.post('/login', async (req, res) => {
  const { email, password, role } = req.body;

  try {
    if (!email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) return res.status(400).json({ message: 'Invalid email or password' });

    if (user.password !== password) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    if (user.role !== role) {
      return res.status(400).json({ message: 'Role does not match our records' });
    }

    req.session.userId = user._id;
    req.session.role = user.role;

    res.json({ message: 'Login successful', role: user.role });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).send('Logout failed');
    res.redirect('/');
  });
});

// Profile
app.get('/profile', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('name role');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch user info' });
  }
});


app.post('/task', requireAuth('creator'), upload.single('file'), async (req, res) => {
  try {
    console.log('Task creation request:', {
      userId: req.session.userId,
      body: req.body,
      file: req.file,
    });

    const { title, description, acceptedDate, dueDate, biddingDeadline, minBid } = req.body;

    if (!title || !description || !dueDate || !biddingDeadline) {
      return res.status(400).json({ message: 'Title, description, due date, and bidding deadline are required' });
    }

    const task = new Task({
      userId: req.session.userId,
      title: title.trim(),
      description: description.trim(),
      acceptedDate: acceptedDate ? new Date(acceptedDate) : null,
      dueDate: new Date(dueDate),
      biddingDeadline: new Date(biddingDeadline),
      minBid: minBid ? Number(minBid) : 0,
      filePath: req.file ? req.file.path : null,
      status: 'open',
    });

    await task.save();

    console.log('Task saved:', task);

    res.status(201).json({ message: 'Task created successfully', task });
  } catch (err) {
    console.error('Task creation error:', err);
    res.status(500).json({ message: 'Failed to create task', error: err.message });
  }
});




// Get Creator's Tasks
app.get('/my-tasks', requireAuth('creator'), async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.session.userId }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load tasks' });
  }
});

// Get Open Tasks for Bidders
app.get('/get-open-tasks', requireAuth('bidder'), async (req, res) => {
  try {
    const now = new Date();
    const tasks = await Task.find({
      status: 'open',
      biddingDeadline: { $gte: now }
    }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load open tasks' });
  }
});

// Place a Bid
app.post('/place-bid', requireAuth('bidder'), async (req, res) => {
  const { taskId, amount } = req.body;

  if (!taskId || !amount) {
    return res.status(400).json({ message: 'Task ID and amount are required' });
  }

  try {
    const task = await Task.findById(taskId);
    if (!task || task.status !== 'open') return res.status(400).json({ message: 'Task is not open for bidding' });

    if (task.biddingDeadline && new Date() > task.biddingDeadline) {
      return res.status(400).json({ message: 'Bidding deadline has passed' });
    }

    if (amount < (task.minBid || 0)) {
      return res.status(400).json({ message: `Bid must be at least ${task.minBid}` });
    }

    const bid = new Bid({
      taskId,
      userId: req.session.userId,
      amount
    });

    await bid.save();
    res.json({ message: 'Bid placed successfully' });
  } catch (err) {
    console.error('Place Bid Error:', err);
    res.status(500).json({ message: 'Failed to place bid' });
  }
});

// Get My Bids
app.get('/my-bids', requireAuth('bidder'), async (req, res) => {
  try {
    const bids = await Bid.find({ userId: req.session.userId }).sort({ createdAt: -1 });
    const populated = await Promise.all(bids.map(async (bid) => {
      const task = await Task.findById(bid.taskId);
      return { ...bid.toObject(), taskTitle: task?.title || 'Unknown' };
    }));
    res.json({ bids: populated });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load bids' });
  }
});

// Get All Bids for a Task
app.get('/get-bids/:taskId', isAuthenticated, async (req, res) => {
  try {
    const bids = await Bid.find({ taskId: req.params.taskId }).sort({ amount: 1 });
    res.json({ bids });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch bids' });
  }
});

// Cron Job: Auto-assign lowest bid to expired tasks
cron.schedule('*/5 * * * *', async () => {
  try {
    const now = new Date();
    const expiredTasks = await Task.find({
      status: 'open',
      biddingDeadline: { $lte: now }
    });

    for (let task of expiredTasks) {
      const bids = await Bid.find({ taskId: task._id }).sort({ amount: 1 });
      if (bids.length > 0) {
        task.assignedBidId = bids[0]._id;
        task.status = 'assigned';
        await task.save();
      }
    }
  } catch (err) {
    console.error('Cron job error:', err);
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});

