const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: '*'
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chat-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Socket.IO Setup
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
// Expose io instance to routes
app.set('io', io);

// Socket.IO authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key');
    const User = require('./models/User');
    const user = await User.findById(decoded.userId);

    if (!user) {
      return next(new Error('User not found'));
    }

    socket.userId = user._id.toString();
    socket.username = user.username;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

// Track online users
const onlineUsers = new Map();

io.on('connection', async (socket) => {
  console.log('User connected:', socket.username, socket.id);

  // Mark user as online
  onlineUsers.set(socket.userId, socket.id);
  const User = require('./models/User');
  await User.findByIdAndUpdate(socket.userId, { isOnline: true });

  // Broadcast user online status
  io.emit('user_status_change', {
    userId: socket.userId,
    isOnline: true
  });

  // Join room
  socket.on('join_room', async (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.username} joined room ${roomId}`);

    // Notify room members
    socket.to(roomId).emit('user_joined_room', {
      userId: socket.userId,
      username: socket.username,
      roomId
    });
  });

  // Leave room
  socket.on('leave_room', (roomId) => {
    socket.leave(roomId);
    console.log(`User ${socket.username} left room ${roomId}`);

    socket.to(roomId).emit('user_left_room', {
      userId: socket.userId,
      username: socket.username,
      roomId
    });
  });

  // Send message
  socket.on('send_message', async (data) => {
    try {
      const Message = require('./models/Message');
      const Room = require('./models/Room');

      // Save message to database
      const message = new Message({
        room: data.room,
        sender: socket.userId,
        content: data.content,
        type: data.type || 'text',
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileSize: data.fileSize
      });

      await message.save();
      await message.populate('sender', 'username email profilePhoto');

      // Update room's last message
      await Room.findByIdAndUpdate(data.room, {
        lastMessage: message._id,
        updatedAt: new Date()
      });

      // Broadcast to room
      io.to(data.room).emit('receive_message', message);
    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('message_error', { message: 'Failed to send message' });
    }
  });

  // Typing indicator
  socket.on('typing_start', (data) => {
    socket.to(data.room).emit('user_typing', {
      userId: socket.userId,
      username: socket.username,
      roomId: data.room
    });
  });

  socket.on('typing_stop', (data) => {
    console.log('Sending typing_stop event:', {
      userId: socket.userId,
      username: socket.username,
      roomId: data.room
    });
    socket.to(data.room).emit('user_stop_typing', {
      userId: socket.userId,
      username: socket.username,
      roomId: data.room
    });
  });

  // Disconnect
  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.username);

    onlineUsers.delete(socket.userId);
    await User.findByIdAndUpdate(socket.userId, {
      isOnline: false,
      lastSeen: new Date()
    });

    // Broadcast user offline status
    io.emit('user_status_change', {
      userId: socket.userId,
      isOnline: false
    });
  });
});

// Routes
app.get('/', (req, res) => {
  res.send('Arangam Chat Backend is running');
});

// Auth routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Room routes
const roomRoutes = require('./routes/rooms');
app.use('/api/rooms', roomRoutes);

// User routes
// User routes
const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);

// Message routes
const messageRoutes = require('./routes/message');
app.use('/api/messages', messageRoutes);

const uploadRoutes = require('./routes/upload');
app.use('/api/upload', uploadRoutes);




const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
