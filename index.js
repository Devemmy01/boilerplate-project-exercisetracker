const bodyParser = require('body-parser')
const express = require('express')
const app = express()
require('dotenv').config()
const cors = require('cors')
const mongoose = require('mongoose')

// ✅ Modern Mongoose connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB connection error:', err))

// FreeCodeCamp validation setup
app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
})

// User Schema
const Schema = mongoose.Schema
const exerciseUsers = new Schema({
  username: { type: String, required: true },
  exercises: [
    {
      _id: false,
      description: { type: String, required: true },
      duration: { type: Number, required: true },
      date: { type: Date, default: Date.now },
    },
  ],
})

const ExerciseUsers = mongoose.model('ExerciseUsers', exerciseUsers)

// ✅ Create New User
app.post('/api/users', async (req, res) => {
  try {
    const { username } = req.body
    const user = await ExerciseUsers.create({ username })
    res.json({ username: user.username, _id: user._id })
  } catch (err) {
    res.json({ error: 'Invalid user data' })
  }
})

// ✅ Get All Users
app.get('/api/users', async (req, res) => {
  const users = await ExerciseUsers.find({}).select('username _id')
  res.json(users)
})

// ✅ Add Exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
  const { description, duration, date } = req.body
  const userId = req.params._id

  try {
    const user = await ExerciseUsers.findById(userId)
    if (!user) return res.json({ error: 'User not found' })

    const exercise = {
      description,
      duration: Number(duration),
      date: date ? new Date(date) : new Date(),
    }

    user.exercises.push(exercise)
    await user.save()

    res.json({
      username: user.username,
      _id: user._id,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
    })
  } catch (err) {
    res.json({ error: 'Error adding exercise' })
  }
})

// ✅ Get Logs
app.get('/api/users/:_id/logs', async (req, res) => {
  const { from, to, limit } = req.query
  const userId = req.params._id

  try {
    const user = await ExerciseUsers.findById(userId)
    if (!user) return res.json({ error: 'User not found' })

    let logs = user.exercises

    if (from) logs = logs.filter(e => e.date >= new Date(from))
    if (to) logs = logs.filter(e => e.date <= new Date(to))

    logs = logs.slice(0, limit ? Number(limit) : logs.length)

    res.json({
      _id: user._id,
      username: user.username,
      count: logs.length,
      log: logs.map(e => ({
        description: e.description,
        duration: e.duration,
        date: e.date.toDateString(),
      })),
    })
  } catch (err) {
    res.json({ error: 'Error fetching logs' })
  }
})

// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: 'not found' })
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode = err.status || 500
  let errMessage = err.message || 'Internal Server Error'
  res.status(errCode).type('txt').send(errMessage)
})

const listener = app.listen(process.env.PORT || 5000, '0.0.0.0', () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
