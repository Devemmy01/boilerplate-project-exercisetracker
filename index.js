require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static("public"));

mongoose.connect(process.env.MONGO_URI);

// Schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
});

const exerciseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true }
});

const User = mongoose.model("User", userSchema);
const Exercise = mongoose.model("Exercise", exerciseSchema);

// Root page
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// ✅ Create new user
app.post("/api/users", async (req, res) => {
  try {
    const user = new User({ username: req.body.username });
    const savedUser = await user.save();
    res.json({ username: savedUser.username, _id: savedUser._id });
  } catch (err) {
    res.status(500).json({ error: "Unable to create user" });
  }
});

// ✅ Get all users
app.get("/api/users", async (req, res) => {
  const users = await User.find({}, "username _id");
  res.json(users);
});

// ✅ Add exercise
app.post("/api/users/:_id/exercises", async (req, res) => {
  const { description, duration, date } = req.body;
  const user = await User.findById(req.params._id);
  if (!user) return res.json({ error: "User not found" });

  const exercise = new Exercise({
    userId: user._id,
    description,
    duration: Number(duration),
    date: date ? new Date(date) : new Date()
  });

  const savedExercise = await exercise.save();

  res.json({
    username: user.username,
    description: savedExercise.description,
    duration: savedExercise.duration,
    date: savedExercise.date.toDateString(),
    _id: user._id
  });
});

// ✅ Get exercise logs
app.get("/api/users/:_id/logs", async (req, res) => {
  const { from, to, limit } = req.query;
  const user = await User.findById(req.params._id);
  if (!user) return res.json({ error: "User not found" });

  let filter = { userId: user._id };
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }

  let query = Exercise.find(filter).select("description duration date -_id");
  if (limit) query = query.limit(Number(limit));

  const exercises = await query;
  const log = exercises.map(e => ({
    description: e.description,
    duration: e.duration,
    date: e.date.toDateString()
  }));

  res.json({
    username: user.username,
    count: log.length,
    _id: user._id,
    log
  });
});

// Start server
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Server running on port " + listener.address().port);
});
// --- IGNORE ---