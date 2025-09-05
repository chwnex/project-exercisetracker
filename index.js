const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose')
const bodyParser = require('body-parser')

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })

// Schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
})

const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true }
})

const User = mongoose.model('User', userSchema)
const Exercise = mongoose.model('Exercise', exerciseSchema)

app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: false }))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
})

// CREATE USER
app.post('/api/users', async (req, res) => {
  try {
    const user = new User({ username: req.body.username })
    await user.save()
    res.json({ username: user.username, _id: user._id })
  } catch (err) {
    res.status(500).json({ error: 'User creation failed' })
  }
})

// GET USER
app.get('/api/users', async (req, res) => {
  const users = await User.find({}, 'username _id')
  res.json(users)
})

// ADD EXERCISE
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const user = await User.findById(req.params._id)
    if (!user) return res.status(400).json({ error: 'User not found' })

    const description = req.body.description
    const duration = parseInt(req.body.duration)
    let date = req.body.date ? new Date(req.body.date) : new Date()

    if (!description || !duration) {
      return res.status(400).json({ error: 'Description and duration are required' })
    }
    if (!description) {
      return res.status(400).json({ error: 'Description is required' })
    }
    if (isNaN(duration)) {
      return res.status(400).json({ error: 'Duration must be a number' })
    }
    if (date.toString() === 'Invalid Date') date = new Date()

    const exercise = new Exercise({
      userId: user._id,
      description,
      duration,
      date
    })
    await exercise.save()

    res.json({
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
      _id: user._id
    })
  } catch (err) {
    res.status(500).json({ error: 'Exercise creation failed' })
  }
})

// GET EXERCISE LOG
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const user = await User.findById(req.params._id)
    if (!user) return res.status(400).json({ error: 'User not found' })

    let { from, to, limit } = req.query
    let filter = { userId: user._id }
    if (from) filter.date = { ...filter.date, $gte: new Date(from) }
    if (to) filter.date = { ...filter.date, $lte: new Date(to) }

    let query = Exercise.find(filter).select('description duration date -_id')
    if (limit) query = query.limit(parseInt(limit))

    const exercises = await query.exec()
    const log = exercises.map(e => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString()
    }))

    res.json({
      username: user.username,
      count: log.length,
      _id: user._id,
      log
    })
  } catch (err) {
    res.status(500).json({ error: 'Could not retrieve logs' })
  }
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
