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

// Session setup with MongoDB store
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: 'mongodb://localhost:27017/userAuthDB' }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
}));

// File Upload Setup with multer
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
    return res.status(403).json({ message: 'Forbidden' });
  };
}

// Static Pages
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

    const newUser = new User({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,  // Plain text (not recommended for production)
      role
    });

    await newUser.save();

    res.status(201).json({ message: 'Registration successful' });
  } catch (err) {
    console.error('Register Error:', err);
    res.status(500).json({ message: 'Registration failed' });
  }
});

// Login
app.post('/login', async (req, res) => {
  const { email, password, role } = req.body;

  try {
    if (!email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user || user.password !== password || user.role !== role) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    req.session.userId = user._id.toString();
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

// Get logged-in user info
app.get('/get-user', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('name role email');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch user info' });
  }
});

// Create Task (Creator only)
app.post('/task', requireAuth('creator'), upload.single('file'), async (req, res) => {
  try {
    const { title, description, acceptedDate, endDate, biddingDeadline, minBid } = req.body;

    if (!title || !description || !acceptedDate || !endDate || !biddingDeadline) {
      return res.status(400).json({ message: 'Title, description, accepted date, end date, and bidding deadline are required' });
    }

    const task = new Task({
      userId: req.session.userId,         // Creator's userId
      title: title.trim(),
      description: description.trim(),
      acceptedDate: new Date(acceptedDate),
      endDate: new Date(endDate),
      biddingDeadline: new Date(biddingDeadline),
      minBid: minBid ? Number(minBid) : 0,
      filePath: req.file ? req.file.path : null,
      status: 'open',
    });

    await task.save();
    res.status(201).json({ message: 'Task created successfully', task });
  } catch (err) {
    console.error('Task creation error:', err);
    res.status(500).json({ message: 'Failed to create task' });
  }
});

// Get creator's tasks with assigned bid info
app.get('/my-tasks', requireAuth('creator'), async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.session.userId })
      .populate({
        path: 'assignedBidId',
        populate: {
          path: 'userId',
          select: 'name email'
        }
      })
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load tasks' });
  }
});

// Get open tasks (for bidders)
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

// Place bid (bidder only)
app.post('/place-bid', requireAuth('bidder'), async (req, res) => {
  const { taskId, amount } = req.body;

  try {
    const task = await Task.findById(taskId);
    if (!task || task.status !== 'open') {
      return res.status(400).json({ message: 'Task is not open for bidding' });
    }

    if (new Date() > task.biddingDeadline) {
      return res.status(400).json({ message: 'Bidding deadline passed' });
    }

    if (amount < (task.minBid || 0)) {
      return res.status(400).json({ message: `Bid must be at least ${task.minBid}` });
    }

    const bid = new Bid({ taskId, userId: req.session.userId, amount });
    await bid.save();

    // Send back task info and bid
    const taskDetails = await Task.findById(taskId).select('title description acceptedDate endDate biddingDeadline minBid');

    res.json({
      message: 'Bid placed successfully',
      task: taskDetails,
      bid: {
        amount: bid.amount,
        placedOn: bid.createdAt
      }
    });
  } catch (err) {
    console.error('Error placing bid:', err);
    res.status(500).json({ message: 'Failed to place bid' });
  }
});

// Get user's bids (bidder only)
app.get('/my-bids', requireAuth('bidder'), async (req, res) => {
  try {
    const bids = await Bid.find({ userId: req.session.userId }).populate('taskId', 'title').sort({ createdAt: -1 });
    res.json({ bids });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch bids' });
  }
});

// --- NEW ROUTES ---

// 1. Get all bids for creator's tasks
app.get('/api/bid/creator-bids', requireAuth('creator'), async (req, res) => {
  try {
    const creatorId = req.session.userId;

    // Find tasks created by this user
    const tasks = await Task.find({ userId: creatorId }).select('_id');

    if (tasks.length === 0) return res.json({ bids: [] });

    const taskIds = tasks.map(t => t._id);

    // Find bids on these tasks and populate bidder name and task title
    const bids = await Bid.find({ taskId: { $in: taskIds } })
      .populate('userId', 'name')  // bidder info
      .populate('taskId', 'title') // task info
      .sort({ createdAt: -1 });

    res.json({ bids });
  } catch (err) {
    console.error('Error fetching bids for creator:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// 2. Accept a bid and assign task to bidder
app.post('/api/bid/accept-bid', requireAuth('creator'), async (req, res) => {
  try {
    const creatorId = req.session.userId;
    const { taskId, bidId } = req.body;

    if (!taskId || !bidId) return res.status(400).json({ message: 'taskId and bidId are required' });

    // Find task belonging to creator
    const task = await Task.findOne({ _id: taskId, userId: creatorId });
    if (!task) return res.status(404).json({ message: 'Task not found or not yours' });
    if (task.status === 'assigned') return res.status(400).json({ message: 'Task already assigned' });

    // Find bid for the task
    const bid = await Bid.findOne({ _id: bidId, taskId: taskId });
    if (!bid) return res.status(404).json({ message: 'Bid not found' });

    // Update task with assignment details
    task.status = 'assigned';
    task.assignedBidId = bid._id;          // store assigned bid id
    task.assignedBidderId = bid.userId;    // store assigned bidder id
    task.acceptedDate = new Date();

    await task.save();

    // Fetch bidder name for confirmation message
    const bidder = await User.findById(bid.userId).select('name');

    res.json({
      message: `Task assigned successfully to ${bidder?.name || 'Bidder'}`,
      acceptedDate: task.acceptedDate,
      bidderName: bidder?.name || 'Bidder'
    });
  } catch (err) {
    console.error('Error accepting bid:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Cron Job: Auto-assign lowest bid to expired tasks every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  try {
    const now = new Date();
    const expiredTasks = await Task.find({ status: 'open', biddingDeadline: { $lte: now } });

    for (const task of expiredTasks) {
      const bids = await Bid.find({ taskId: task._id }).sort({ amount: 1 });
      if (bids.length > 0) {
        task.assignedBidId = bids[0]._id;
        task.assignedBidderId = bids[0].userId;
        task.status = 'assigned';
        task.acceptedDate = new Date();
        await task.save();
        console.log(`Task ${task._id} auto-assigned to bid ${bids[0]._id} at ${task.acceptedDate}`);
      }
    }
  } catch (err) {
    console.error('Cron job error:', err);
  }
});

// Serve uploaded files statically
app.use('/uploads', express.static(uploadDir));

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});