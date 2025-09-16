const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

const mongoose = require('mongoose');
const { User, Exercise } = require('./models');

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// Create a new user
app.post('/api/users', async (req, res) => {
  try {
    const username = req.body.username;
    if (!username) return res.status(400).json({ error: 'Username required' });
    let user = await User.findOne({ username });
    if (!user) {
      user = new User({ username });
      await user.save();
    }
    res.json({ username: user.username, _id: user._id });
  } catch (err) {
    res.status(500).json({ error: 'Could not create user' });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username _id');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch users' });
  }
});

// Add exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const userId = req.params._id;
    const { description, duration, date } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(400).json({ error: 'User not found' });
    let exerciseDate = date ? new Date(date) : new Date();
    if (exerciseDate.toString() === 'Invalid Date') exerciseDate = new Date();
    const exercise = new Exercise({
      userId: user._id,
      description: String(description),
      duration: Number(duration),
      date: exerciseDate
    });
    await exercise.save();
    res.json({
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
      _id: user._id
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not add exercise' });
  }
});

// Get user logs
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const { from, to, limit } = req.query;
    const user = await User.findById(req.params._id);
    if (!user) return res.status(400).json({ error: 'User not found' });
    let filter = { userId: user._id };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    let query = Exercise.find(filter);
    if (limit) query = query.limit(Number(limit));
    const exercises = await query.exec();
    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log: exercises.map(e => ({
        description: String(e.description),
        duration: Number(e.duration),
        date: e.date.toDateString()
      }))
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch logs' });
  }
});





const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
