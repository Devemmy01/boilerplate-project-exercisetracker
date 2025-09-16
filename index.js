const bodyParser = require('body-parser')
const moment = require('moment');
const express = require('express')
const app = express()
require('dotenv').config()
const cors = require('cors')

const mongodb = require('mongodb')
const mongoose = require('mongoose')

const conn = mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useFindAndModify: false,
  useCreateIndex: true,
  useUnifiedTopology: true,
})

if (conn) console.log('MongoDB Connected')

//FreeCodeCamp's validation
app.use(cors())

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
})

//Create User Schema
const Schema = mongoose.Schema
const exerciseUsers = new Schema({
  username: { type: String, required: true },
  exercises: [
    {
      _id: false,
      description: {
        type: String,
        required: true,
      },
      duration: {
        type: Number,
        required: true,
      },
      date: {
        type: Date,
        default: new Date(),
      },
    },
  ],
})

//Convert User Schema into a Model
const ExerciseUsers = mongoose.model('ExerciseUsers', exerciseUsers)

//Create New User
// const createUser = (username, done) => {
//   ExerciseUsers.create({ username: username }, (err, data) => {
//     if (err) done(err)
//     done(null, data)
//   })
// }

// //Post New User
// app.post('/api/users', async(req, res) => {
//   let username = req.body.username
//   createUser(username, (err, data) => {
//     err
//       ? res.send('Error')
//       : res.send({ username: data.username, _id: data._id })
//   })
// })

app.post('/api/users', async(req, res) => {

  let username = req.body.username
  const userExist = await ExerciseUsers.findOne({username:username})
  if(userExist){
    res.json({
      error: 'User already exist!'
    })
  }
   const user = await ExerciseUsers.create({
    username
  })

  if (user) {
    res.json({
      username:user.username,
      _id: user._id
    })
  } else {
    res.json({
      error : 'Invalid user data'
    })
  }
  })

//Get all users
app.get('/api/users', (req, res) => {
  ExerciseUsers.find({})
    .select('username _id')
    .exec((err, data) => {
      if (err) console.log(err)
      res.send(data)
    })
})

///Add Exercise v2.
app.post('/api/users/:_id/exercises', async (req, res) => {
  let { description, duration } = req.body
  let userId = req.params._id

  try{
    const user = await ExerciseUsers.findById(userId)
  

  if (user) {
    user.exercises = [
      ...user.exercises,
      {
        description: description,
        duration: Number(duration),
        date: req.body.date
          ? new Date(req.body.date)
          : new Date(),
      },
    ]

    const updatedUser = await user.save()

    res.json({
      username: updatedUser.username,
      _id: updatedUser._id,
      description,
      duration: Number(duration),
      date: req.body.date
          ? moment(req.body.date).format('ddd MMM DD YYYY')
          : moment().format('ddd MMM DD YYYY'),
    })
  } else res.json({ error: 'User not found' })
  }catch(err){
    res.json({
      error:'Error!'
    })
  }
})

//Retrieve users exercise data
app.get('/api/users/:_id/logs', async (req, res) => {
  //Define variables from url and apply logic
  let userId = req.params._id
  let from = req.query.from !== undefined ? new Date(req.query.from) : null
  let to = req.query.to !== undefined ? new Date(req.query.to) : null
  let limit = parseInt(req.query.limit)
  
  const user = await ExerciseUsers.findOne({ _id: userId })

  if (user) {
    let count = user.exercises.length
    
    if (from && to) {
      let i=0
      var result = {
        _id: userId,
        username: user.username,
        count,
        log: user.exercises
          .filter((e) => e.date >= from && e.date <= to)
          .slice(0, limit || count)
          
      }
       result.log = result.log.map(p=>{
         i++
         let formattedDate = moment(p.date).format('ddd MMM DD YYYY')
         return {
           date:formattedDate,
           description:p.description,
           duration:Number(p.duration)
         }
        })
      result.count = i
      console.log(result.log)
      res.send(result)
      
    } else if (from) {
     let i=0
      const result = {
        _id: userId,
        username: user.username,
        count,
        log: user.exercises
          .filter((e) =>e.date >= from)
          .slice(0, limit || count),
      }
       result.log = result.log.map(p=>{
         i++
         let formattedDate = moment(p.date).format('ddd MMM DD YYYY')
         return {
           date:formattedDate,
           description:p.description,
           duration:Number(p.duration)
         }
        })
      result.count = i
      console.log(result)
      res.send(result)
    } else if (to) {
      let i=0
      const result = {
        _id: userId,
        username: user.username,
        count,
        log: user.exercises
          .filter((e) => e.date <= to)
          .slice(0, limit || count),
      }
       result.log = result.log.map(p=>{
         i++
         let formattedDate = moment(p.date).format('ddd MMM DD YYYY')
         return {
           date:formattedDate,
           description:p.description,
           duration:Number(p.duration)
         }
        })
      result.count = i
      console.log(result)
      res.send(result)
    } else {
      let i=0
      const result = {
        _id: userId,
        username: user.username,
        count,
        log: user.exercises.slice(0, limit || count),
      }
      console.log(result)
      result.log = result.log.map(p=>{
         i++
         let formattedDate = moment(p.date).format('ddd MMM DD YYYY')
         return {
           date:formattedDate,
           description:p.description,
           duration:Number(p.duration)
         }
        })
      result.count = i
      console.log(result)
      res.send(result)
    }
  } else res.json({ error: 'User not found!' })
})


const deleteAllDocs = () => {
  ExerciseUsers.remove({}, (err, data) => {
    if (err) console.log(err)
    console.log('All users were deleted')
  })
}
// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: 'not found' })
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt').send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

/*const callback = (err, data) => {
    err ? console.log(err) : console.log(data);
  }*/
