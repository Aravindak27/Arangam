const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['public', 'private', 'group'],
        default: 'public'
    },
    isGlobal: {
        type: Boolean,
        default: false
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    }
}, {
    timestamps: true
});

const Room = mongoose.model('Room', roomSchema);

module.exports = Room;
