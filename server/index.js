require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const Goal = require('./models/Goal');
const Tracking = require('./models/Tracking');
const Thought = require('./models/Thought');
const User = require('./models/User');
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

// Auth Middleware
const auth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'No token provided' });

        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const { sub: googleId, email, name, picture } = payload;

        let user = await User.findOne({ googleId });
        if (!user) {
            // Check if this is the admin (first user or specific email)
            const isAdmin = email === process.env.ADMIN_EMAIL;
            user = new User({ googleId, email, name, picture, role: isAdmin ? 'admin' : 'user' });
            await user.save();
        }

        req.user = user;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Admin Middleware
const adminAuth = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Admin access required' });
    }
};

app.get('/api/me', auth, (req, res) => {
    res.json(req.user);
});

app.get('/api/goals', auth, async (req, res) => {
    try {
        const goals = await Goal.find({ userId: req.user._id });
        res.json(goals);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/goals', auth, async (req, res) => {
    try {
        const { name, target, color } = req.body;
        const goal = new Goal({ name, target, color, userId: req.user._id });
        await goal.save();
        res.json(goal);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/goals/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const query = req.user.role === 'admin' ? { _id: id } : { _id: id, userId: req.user._id };
        const goal = await Goal.findOneAndDelete(query);
        if (!goal) return res.status(404).json({ error: 'Goal not found' });

        // Also remove tracking data
        await Tracking.deleteMany({ goal_id: id });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/goals/:id/track', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const goal = await Goal.findOneAndUpdate(
            { _id: id, userId: req.user._id },
            { $inc: { current: 1 } },
            { new: true }
        );

        if (!goal) return res.status(404).json({ error: 'Goal not found' });

        const date = new Date().toISOString().split('T')[0];

        await Tracking.findOneAndUpdate(
            { goal_id: id, date: date, userId: req.user._id },
            { $inc: { count: 1 } },
            { upsert: true, new: true }
        );

        res.json({ success: true, goal });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/stats/heatmap', auth, async (req, res) => {
    try {
        const data = await Tracking.aggregate([
            { $match: { userId: req.user._id } },
            { $group: { _id: '$date', count: { $sum: '$count' } } },
            { $project: { _id: 0, date: '$_id', count: 1 } }
        ]);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/thoughts', auth, async (req, res) => {
    try {
        const thoughts = await Thought.find({ userId: req.user._id }).sort({ _id: -1 });
        res.json(thoughts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/thoughts', auth, async (req, res) => {
    try {
        const { text } = req.body;
        const thought = new Thought({ text, userId: req.user._id });
        await thought.save();
        res.json(thought);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/thoughts/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const query = req.user.role === 'admin' ? { _id: id } : { _id: id, userId: req.user._id };
        const thought = await Thought.findOneAndDelete(query);
        if (!thought) return res.status(404).json({ error: 'Thought not found' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin endpoints
app.get('/api/admin/users', [auth, adminAuth], async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/user/:userId/progress', [auth, adminAuth], async (req, res) => {
    try {
        const { userId } = req.params;
        const goals = await Goal.find({ userId });
        const thoughts = await Thought.find({ userId });
        const tracking = await Tracking.find({ userId });
        res.json({ goals, thoughts, tracking });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
