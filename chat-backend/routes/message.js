const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Message = require('../models/Message');

// Delete a single message (soft delete)
router.delete('/:id', auth, async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);
        if (!message) return res.status(404).json({ message: 'Message not found' });
        // Only sender can delete
        if (message.sender.toString() !== req.userId) {
            return res.status(403).json({ message: 'Not authorized to delete this message' });
        }
        message.deleted = true;
        message.deletedBy = req.userId;
        await message.save();
        // Notify room
        const io = req.app.get('io');
        const roomId = message.room.toString();
        console.log(`Emitting message_deleted to room ${roomId} for message ${message._id}`);
        io.to(roomId).emit('message_deleted', { messageId: message._id.toString() });
        res.json({ success: true });
    } catch (err) {
        console.error('Delete message error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Bulk delete (array of ids)
router.post('/bulk-delete', auth, async (req, res) => {
    const { ids } = req.body; // expect array of message ids
    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: 'Invalid ids' });
    }
    try {
        const messages = await Message.find({ _id: { $in: ids } });
        const unauthorized = messages.filter(m => m.sender.toString() !== req.userId);
        if (unauthorized.length > 0) {
            return res.status(403).json({ message: 'Not authorized to delete some messages' });
        }
        await Message.updateMany({ _id: { $in: ids } }, { $set: { deleted: true, deletedBy: req.userId } });
        // Notify rooms (could be multiple rooms)
        const io = req.app.get('io');
        messages.forEach(m => {
            io.to(m.room).emit('message_deleted', { messageId: m._id });
        });
        res.json({ success: true });
    } catch (err) {
        console.error('Bulk delete error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
