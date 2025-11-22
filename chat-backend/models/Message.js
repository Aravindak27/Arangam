const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    room: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: function () { return this.type === 'text'; }
    },
    type: {
        type: String,
        enum: ['text', 'image', 'video', 'file'],
        default: 'text'
    },
    fileUrl: {
        type: String
    },
    fileName: {
        type: String
    },
    fileSize: {
        type: Number
    },
    deleted: { type: Boolean, default: false },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, {
    timestamps: true
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
