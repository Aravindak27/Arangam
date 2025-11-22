# 🎭 Arangam - Connect & Chat

A modern, real-time chat application with authentication, private messaging, group chats, file sharing, and native Android support.

## ✨ Features

### 🔐 Authentication
- User registration and login
- JWT-based authentication
- Secure password hashing with bcrypt

### 💬 Chat Features
- **Public Rooms**: Join open chat rooms accessible to everyone
- **Private Chats**: One-on-one conversations with other users
- **Group Chats**: Create group conversations with multiple users
- Real-time messaging with Socket.IO
- Message history persistence
- Typing indicators
- Online/offline status

### 👥 Group Management
- Create custom group chats
- Add/remove members (creator only)
- Real-time member updates
- Member list with online status

### 📎 File Sharing
- Upload and share images, videos, and documents
- 50MB file size limit
- Support for common file types (jpg, png, gif, mp4, pdf, doc, etc.)
- File preview and download

### 📸 Profile Photos
- Optional profile photo after signup
- Take selfie with camera or upload from gallery
- Update anytime by clicking avatar
- Real-time photo updates across all devices

### 📱 Mobile Responsive
- Fully responsive design
- Hamburger menu on mobile
- Touch-friendly interface
- Accessible from any device
- **Native Android App** via Capacitor
- PWA (Progressive Web App) support
- Offline functionality

## 🛠️ Tech Stack

### Frontend
- **React** - UI library
- **Vite** - Build tool and dev server
- **Socket.IO Client** - Real-time communication
- **CSS3** - Styling and animations

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **Socket.IO** - WebSocket server
- **MongoDB** - Database
- **Mongoose** - MongoDB ODM
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing
- **Multer** - File upload handling

### Mobile
- **Capacitor** - Native Android wrapper
- **PWA** - Progressive Web App features
- **Service Workers** - Offline support

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Local Development Setup

#### 1. Clone the repository
```bash
git clone <your-repo-url>
cd Chat
```

#### 2. Set up Backend
```bash
cd chat-backend
npm install
```

Create `.env` file:
```env
MONGODB_URI=mongodb://localhost:27017/chat-app
JWT_SECRET=your-super-secret-jwt-key-change-this
PORT=3001
NODE_ENV=development
```

Start backend server:
```bash
npm start
```

#### 3. Set up Frontend
```bash
cd chat-frontend
npm install
```

Create `.env` file:
```env
VITE_API_URL=http://localhost:3001
```

Start frontend dev server:
```bash
npm run dev
```

#### 4. Access the app
Open your browser and go to:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`
