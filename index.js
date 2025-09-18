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
    console.log("📩 POST /api/users body:", req.body);

    const user = new User({ username: req.body.username });
    const savedUser = await user.save();

    const response = { username: savedUser.username, _id: savedUser._id };
    console.log("📤 Response:", response);

    res.json(response);
  } catch (err) {
    console.error("❌ Error creating user:", err.message);
    res.status(500).json({ error: "Unable to create user" });
  }
});

// ✅ Get all users
app.get("/api/users", async (req, res) => {
  console.log("📩 GET /api/users");

  const users = await User.find({}, "username _id");
  console.log("📤 Response:", users);

  res.json(users);
});

// ✅ Add exercise
app.post("/api/users/:_id/exercises", async (req, res) => {
  console.log("📩 POST /api/users/:_id/exercises body:", req.body, "params:", req.params);

  const { description, duration, date } = req.body;
  const user = await User.findById(req.params._id);

  if (!user) {
    console.error("❌ User not found for ID:", req.params._id);
    return res.json({ error: "User not found" });
  }

  const exercise = new Exercise({
    userId: user._id,
    description,
    duration: Number(duration),
    date: date ? new Date(date) : new Date()
  });

  const savedExercise = await exercise.save();

  const response = {
    username: user.username,
    description: savedExercise.description,
    duration: savedExercise.duration,
    date: savedExercise.date.toDateString(),
    _id: user._id
  };

  console.log("📤 Response:", response);

  res.json(response);
});

// ✅ Get exercise logs
app.get("/api/users/:_id/logs", async (req, res) => {
  console.log("📩 GET /api/users/:_id/logs params:", req.params, "query:", req.query);

  const { from, to, limit } = req.query;
  const user = await User.findById(req.params._id);

  if (!user) {
    console.error("❌ User not found for ID:", req.params._id);
    return res.json({ error: "User not found" });
  }

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

  const response = {
    username: user.username,
    count: log.length,
    _id: user._id,
    log
  };

  console.log("📤 Response:", response);

  res.json(response);
});
