const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Room = require('../models/Room');
const Message = require('../models/Message');
const User = require('../models/User');

// Get all rooms for current user
router.get('/', auth, async (req, res) => {
    try {
        const rooms = await Room.find({
            members: req.user._id
        })
            .populate('members', 'username email profilePhoto isOnline')
            .populate('creator', 'username email profilePhoto')
            .populate('lastMessage')
            .sort({ updatedAt: -1 });

        res.json(rooms);
    } catch (error) {
        console.error('Get rooms error:', error);
        res.status(500).json({ message: 'Error fetching rooms' });
    }
});

// Get or create global room
router.get('/global', auth, async (req, res) => {
    try {
        let globalRoom = await Room.findOne({ isGlobal: true })
            .populate('members', 'username email profilePhoto isOnline')
            .populate('lastMessage');

        if (!globalRoom) {
            globalRoom = new Room({
                name: 'Global Chat',
                type: 'public',
                isGlobal: true,
                members: [req.user._id],
                creator: req.user._id // Or system admin
            });
            await globalRoom.save();
        } else {
            // Ensure current user is a member
            if (!globalRoom.members.some(m => m._id.equals(req.user._id))) {
                globalRoom.members.push(req.user._id);
                await globalRoom.save();
            }
        }

        // Re-populate to ensure everything is up to date
        await globalRoom.populate('members', 'username email profilePhoto isOnline');
        await globalRoom.populate('lastMessage');

        res.json(globalRoom);
    } catch (error) {
        console.error('Get global room error:', error);
        res.status(500).json({ message: 'Error fetching global room' });
    }
});

// Get or create private chat
router.post('/private', auth, async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ message: 'User ID required' });
        }

        // Check if private chat already exists
        const existingRoom = await Room.findOne({
            type: 'private',
            members: { $all: [req.user._id, userId], $size: 2 }
        })
            .populate('members', 'username email profilePhoto isOnline')
            .populate('lastMessage');

        if (existingRoom) {
            return res.json(existingRoom);
        }

        // Get the other user's info
        const otherUser = await User.findById(userId);
        if (!otherUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Create new private chat
        const room = new Room({
            name: `${req.user.username} & ${otherUser.username}`,
            type: 'private',
            members: [req.user._id, userId],
            creator: req.user._id
        });

        await room.save();
        await room.populate('members', 'username email profilePhoto isOnline');

        res.status(201).json(room);
    } catch (error) {
        console.error('Create private chat error:', error);
        res.status(500).json({ message: 'Error creating private chat' });
    }
});

// Create group chat
router.post('/group', auth, async (req, res) => {
    try {
        const { name, memberIds } = req.body;

        if (!name || !memberIds || memberIds.length === 0) {
            return res.status(400).json({ message: 'Group name and members required' });
        }

        // Add creator to members if not already included
        const allMembers = [...new Set([req.user._id.toString(), ...memberIds])];

        const room = new Room({
            name,
            type: 'group',
            members: allMembers,
            creator: req.user._id
        });

        await room.save();
        await room.populate('members', 'username email profilePhoto isOnline');
        await room.populate('creator', 'username email profilePhoto');

        res.status(201).json(room);
    } catch (error) {
        console.error('Create group error:', error);
        res.status(500).json({ message: 'Error creating group' });
    }
});

// Get room details
router.get('/:id', auth, async (req, res) => {
    try {
        const room = await Room.findById(req.params.id)
            .populate('members', 'username email profilePhoto isOnline')
            .populate('creator', 'username email profilePhoto');

        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        // Check if user is a member
        if (!room.members.some(member => member._id.toString() === req.user._id.toString())) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json(room);
    } catch (error) {
        console.error('Get room error:', error);
        res.status(500).json({ message: 'Error fetching room' });
    }
});

// Get room messages
router.get('/:id/messages', auth, async (req, res) => {
    try {
        const { limit = 50, before } = req.query;

        const room = await Room.findById(req.params.id);
        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        // Check if user is a member
        if (!room.members.some(member => member.toString() === req.user._id.toString())) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const query = { room: req.params.id };
        if (before) {
            query.createdAt = { $lt: new Date(before) };
        }

        const messages = await Message.find(query)
            .populate('sender', 'username email profilePhoto')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        res.json(messages.reverse());
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ message: 'Error fetching messages' });
    }
});

// Add members to group
router.post('/:id/members', auth, async (req, res) => {
    try {
        const { userIds } = req.body;
        const room = await Room.findById(req.params.id);

        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        if (room.type !== 'group') {
            return res.status(400).json({ message: 'Can only add members to groups' });
        }

        // Only creator can add members
        if (room.creator.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only group creator can add members' });
        }

        // Add new members
        const addedMembers = [];
        userIds.forEach(userId => {
            if (!room.members.includes(userId)) {
                room.members.push(userId);
                addedMembers.push(userId);
            }
        });

        await room.save();
        await room.populate('members', 'username email profilePhoto isOnline');

        // Emit socket event to all room members
        const io = req.app.get('io');
        io.to(req.params.id).emit('members_added', {
            roomId: req.params.id,
            addedMembers,
            room
        });

        res.json(room);
    } catch (error) {
        console.error('Add members error:', error);
        res.status(500).json({ message: 'Error adding members' });
    }
});

// Remove member from group
router.delete('/:id/members/:userId', auth, async (req, res) => {
    try {
        const room = await Room.findById(req.params.id);

        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        if (room.type !== 'group') {
            return res.status(400).json({ message: 'Can only remove members from groups' });
        }

        // Only creator can remove members
        if (room.creator.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only group creator can remove members' });
        }

        const User = require('../models/User');
        const removedUser = await User.findById(req.params.userId);

        room.members = room.members.filter(
            member => member.toString() !== req.params.userId
        );

        await room.save();
        await room.populate('members', 'username email profilePhoto isOnline');

        // Emit socket event to all room members and the removed user
        const io = req.app.get('io');
        io.to(req.params.id).emit('member_removed', {
            roomId: req.params.id,
            removedUserId: req.params.userId,
            removedUsername: removedUser?.username,
            room
        });

        res.json(room);
    } catch (error) {
        console.error('Remove member error:', error);
        res.status(500).json({ message: 'Error removing member' });
    }
});

// Delete group
router.delete('/:id', auth, async (req, res) => {
    try {
        const room = await Room.findById(req.params.id);

        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        // Only creator can delete
        if (room.creator.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only group creator can delete' });
        }

        await Room.findByIdAndDelete(req.params.id);
        await Message.deleteMany({ room: req.params.id });

        res.json({ message: 'Room deleted successfully' });
    } catch (error) {
        console.error('Delete room error:', error);
        res.status(500).json({ message: 'Error deleting room' });
    }
});



// Leave group
router.post('/:id/leave', auth, async (req, res) => {
    try {
        const room = await Room.findById(req.params.id);

        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        if (room.type !== 'group') {
            return res.status(400).json({ message: 'Can only leave groups' });
        }

        // Remove user from members
        room.members = room.members.filter(
            member => member.toString() !== req.user._id.toString()
        );

        await room.save();

        // Notify other members
        const io = req.app.get('io');
        if (io) {
            io.to(req.params.id).emit('user_left_group', {
                roomId: req.params.id,
                userId: req.user._id,
                username: req.user.username
            });
        }

        res.json({ message: 'Left group successfully' });
    } catch (error) {
        console.error('Leave group error:', error);
        res.status(500).json({ message: 'Error leaving group' });
    }
});

module.exports = router;
