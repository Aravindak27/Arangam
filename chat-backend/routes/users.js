const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// Get blocked users
router.get('/blocked', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('blockedUsers', 'username email profilePhoto');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user.blockedUsers);
    } catch (error) {
        console.error('Get blocked users error:', error);
        res.status(500).json({ message: 'Error fetching blocked users' });
    }
});

// Block a user
router.post('/block', auth, async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await User.findById(req.user._id);
        if (!user.blockedUsers.includes(userId)) {
            user.blockedUsers.push(userId);
            await user.save();
        }
        res.json({ message: 'User blocked successfully' });
    } catch (error) {
        console.error('Block user error:', error);
        res.status(500).json({ message: 'Error blocking user' });
    }
});

// Unblock a user
router.post('/unblock', auth, async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await User.findById(req.user._id);
        user.blockedUsers = user.blockedUsers.filter(id => id.toString() !== userId);
        await user.save();
        res.json({ message: 'User unblocked successfully' });
    } catch (error) {
        console.error('Unblock user error:', error);
        res.status(500).json({ message: 'Error unblocking user' });
    }
});

// Get favourites
router.get('/favourites', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('favourites', 'username email profilePhoto isOnline');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user.favourites);
    } catch (error) {
        console.error('Get favourites error:', error);
        res.status(500).json({ message: 'Error fetching favourites' });
    }
});

// Add to favourites
router.post('/favourites/add', auth, async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await User.findById(req.user._id);
        if (!user.favourites.includes(userId)) {
            user.favourites.push(userId);
            await user.save();
        }
        res.json({ message: 'Added to favourites' });
    } catch (error) {
        console.error('Add favourite error:', error);
        res.status(500).json({ message: 'Error adding favourite' });
    }
});

// Remove from favourites
router.post('/favourites/remove', auth, async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await User.findById(req.user._id);
        user.favourites = user.favourites.filter(id => id.toString() !== userId);
        await user.save();
        res.json({ message: 'Removed from favourites' });
    } catch (error) {
        console.error('Remove favourite error:', error);
        res.status(500).json({ message: 'Error removing favourite' });
    }
});

// Get all users except current user
router.get('/', auth, async (req, res) => {
    try {
        const users = await User.find({
            _id: { $ne: req.user._id }
        })
            .select('username email profilePhoto isOnline lastSeen')
            .sort({ username: 1 });

        res.json(users);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ message: 'Error fetching users' });
    }
});

// Get specific user
router.get('/:id', auth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('username email profilePhoto isOnline lastSeen');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ message: 'Error fetching user' });
    }
});

module.exports = router;
