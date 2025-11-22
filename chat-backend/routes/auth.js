const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Signup
router.post('/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create new user
        const user = new User({ username, email, password });
        await user.save();

        // Generate token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'dev-secret-key',
            { expiresIn: '7d' }
        );

        res.status(201).json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                profilePhoto: user.profilePhoto
            }
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Error creating user' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Update online status
        user.isOnline = true;
        await user.save();

        // Generate token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'dev-secret-key',
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                profilePhoto: user.profilePhoto
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error logging in' });
    }
});

// Get current user
router.get('/me', auth, async (req, res) => {
    try {
        res.json({
            user: {
                id: req.user._id,
                username: req.user.username,
                email: req.user.email,
                profilePhoto: req.user.profilePhoto
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user' });
    }
});

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for profile photos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/profiles');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'));
        }
    }
});

// Upload/Update profile photo
router.post('/profile-photo', auth, upload.single('profilePhoto'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No image file uploaded' });
        }

        const profilePhotoUrl = `/uploads/profiles/${req.file.filename}`;

        req.user.profilePhoto = profilePhotoUrl;
        await req.user.save();

        res.json({
            user: {
                id: req.user._id,
                username: req.user.username,
                email: req.user.email,
                profilePhoto: req.user.profilePhoto
            }
        });
    } catch (error) {
        console.error('Profile photo update error:', error);
        res.status(500).json({ message: 'Error updating profile photo' });
    }
});

// Check username availability
router.get('/check-username/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const existing = await User.findOne({ username: username.toLowerCase() });
        if (existing) {
            return res.json({ available: false, message: 'Username taken' });
        }
        return res.json({ available: true, message: 'Username available' });
    } catch (err) {
        console.error('Username check error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Remove profile photo
router.delete('/profile-photo', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        // Optional: Delete file from filesystem if needed
        // if (user.profilePhoto) {
        //     const filePath = path.join(__dirname, '..', user.profilePhoto);
        //     if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        // }

        user.profilePhoto = '';
        await user.save();

        res.json({
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                profilePhoto: ''
            },
            message: 'Profile photo removed'
        });
    } catch (error) {
        console.error('Remove profile photo error:', error);
        res.status(500).json({ message: 'Error removing profile photo' });
    }
});

module.exports = router;
