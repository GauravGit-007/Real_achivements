require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const Goal = require('./models/Goal');
const Tracking = require('./models/Tracking');
const Thought = require('./models/Thought');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());

const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
    .then(async () => {
        console.log('Connected to MongoDB');

        // Initial data if empty
        const goalCount = await Goal.countDocuments();
        if (goalCount === 0) {
            await Goal.create([
                { name: 'Read 10 Pages', target: 10, current: 3, color: '#00d2ff' },
                { name: 'Code 2 Hours', target: 2, current: 1, color: '#a29bfe' }
            ]);
            console.log('Initial goals created');
        }
    })
    .catch(err => console.error('Could not connect to MongoDB', err));

// Health Check Endpoint for Keep-Alive
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Server is awake' });
});

app.get('/api/goals', async (req, res) => {
    try {
        const goals = await Goal.find();
        res.json(goals);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/goals', async (req, res) => {
    try {
        const { name, target, color } = req.body;
        const goal = new Goal({ name, target, color });
        await goal.save();
        res.json(goal);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/goals/:id/track', async (req, res) => {
    try {
        const { id } = req.params;
        const goal = await Goal.findByIdAndUpdate(id, { $inc: { current: 1 } }, { new: true });

        if (!goal) return res.status(404).json({ error: 'Goal not found' });

        // Record in trackings for heatmap
        const date = new Date().toISOString().split('T')[0];

        await Tracking.findOneAndUpdate(
            { goal_id: id, date: date },
            { $inc: { count: 1 } },
            { upsert: true, new: true }
        );

        res.json({ success: true, goal });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/stats/heatmap', async (req, res) => {
    try {
        const data = await Tracking.aggregate([
            { $group: { _id: '$date', count: { $sum: '$count' } } },
            { $project: { _id: 0, date: '$_id', count: 1 } }
        ]);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/thoughts', async (req, res) => {
    try {
        const thoughts = await Thought.find().sort({ _id: -1 });
        res.json(thoughts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/thoughts', async (req, res) => {
    try {
        const { text } = req.body;
        const thought = new Thought({ text });
        await thought.save();
        res.json(thought);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
