// Chat.jsx - Full implementation with profile photo, block users, shortcut buttons, themes, and favourites management
import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { getCurrentUser, logout } from './services';
import * as api from './api';

const Chat = ({ onLogout }) => {
    const user = getCurrentUser();

    // Core states
    const [socket, setSocket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [currentMessage, setCurrentMessage] = useState('');
    const [rooms, setRooms] = useState([]);
    const [currentRoom, setCurrentRoom] = useState(null);
    const [users, setUsers] = useState([]);
    const [showUserList, setShowUserList] = useState(false);
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [showManageGroupModal, setShowManageGroupModal] = useState(false);
    const [typingUsers, setTypingUsers] = useState(new Set());
    const [onlineUsers, setOnlineUsers] = useState(new Set());
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    // Mobile responsive state
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // New feature states
    const [profilePhoto, setProfilePhoto] = useState(user?.profilePhoto || '');
    const [blockedUsers, setBlockedUsers] = useState(new Set());
    const [favourites, setFavourites] = useState([]);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showFavouritesModal, setShowFavouritesModal] = useState(false);
    const [showGroupShortcutModal, setShowGroupShortcutModal] = useState(false);
    const [showManageFavouritesModal, setShowManageFavouritesModal] = useState(false);
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const fileInputRef = useRef(null);

    // Helper utilities
    const getUserColor = (userId) => {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788'];
        const hash = userId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
        return colors[hash % colors.length];
    };

    const formatDateSeparator = (date) => {
        const d = new Date(date);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (d.toDateString() === today.toDateString()) return 'Today';
        if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };

    const shouldShowDateSeparator = (msg, prev) => {
        if (!prev) return true;
        const cur = new Date(msg.createdAt || msg.time).toDateString();
        const p = new Date(prev.createdAt || prev.time).toDateString();
        return cur !== p;
    };

    const formatTime = (ts) => new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const getRoomName = (room) => {
        if (!room) return '';
        if (room.isGlobal) return 'Global Chat';
        if (room.type === 'private') {
            const other = room.members?.find((m) => m._id !== user.id);
            return other?.username || 'Private Chat';
        }
        return room.name || 'Unknown Room';
    };

    const getUserAvatar = (u) => {
        if (u?.profilePhoto) {
            return <img src={`${import.meta.env.VITE_API_URL}${u.profilePhoto}`} alt={u.username} className="avatar-image" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />;
        }
        return '👤';
    };

    // Theme effect
    useEffect(() => {
        document.body.className = ''; // Clear existing classes
        if (theme === 'light') document.body.classList.add('light-theme');
        else if (theme === 'midnight') document.body.classList.add('midnight-theme');
        localStorage.setItem('theme', theme);
    }, [theme]);

    // Notification helpers
    const playNotificationSound = () => {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const ctx = new AudioContext();
            if (ctx.state === 'suspended') {
                ctx.resume();
            }
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(440, ctx.currentTime); // A4 note
            gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            oscillator.start();
            oscillator.stop(ctx.currentTime + 0.2); // 200ms beep
        } catch (e) {
            console.error('Audio beep failed', e);
        }
    };

    const showBrowserNotification = (msg) => {
        if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
            const senderName = msg.sender?.username || 'New Message';
            new Notification(senderName, {
                body: msg.content || (msg.fileUrl ? 'Sent a file' : 'Sent a message'),
                icon: '/vite.svg' // Default vite icon or app icon
            });
        }
    };

    // Request notification permission on mount
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    // Socket initialization
    useEffect(() => {
        // Load data immediately on mount
        loadRooms();
        loadUsers();

        const token = localStorage.getItem('token');
        const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001', { auth: { token } });

        newSocket.on('connect', () => {
            // Optional: Reload on reconnect
            loadRooms();
            loadUsers();
        });

        newSocket.on('receive_message', (msg) => {
            if (blockedUsers.has(msg.sender?._id)) return;

            // Notification logic
            if (msg.sender?._id !== user.id) {
                playNotificationSound();
                showBrowserNotification(msg);
            }

            setMessages((prev) => {
                const exists = prev.some((m) => m.createdAt === msg.createdAt && m.sender?._id === msg.sender?._id && m.content === msg.content);
                return exists ? prev : [...prev, msg];
            });
        });

        newSocket.on('user_typing', ({ username }) => {
            setTypingUsers((prev) => new Set([...prev, username]));
        });
        newSocket.on('user_stop_typing', ({ username }) => {
            setTypingUsers((prev) => {
                const s = new Set(prev);
                s.delete(username);
                return s;
            });
        });
        newSocket.on('user_status_change', ({ userId, isOnline }) => {
            setOnlineUsers((prev) => {
                const s = new Set(prev);
                isOnline ? s.add(userId) : s.delete(userId);
                return s;
            });
        });
        newSocket.on('blocked_users', (list) => {
            setBlockedUsers(new Set(list));
        });
        newSocket.on('message_deleted', ({ messageId }) => {
            setMessages((prev) => prev.map((m) => (m._id === messageId ? { ...m, deleted: true } : m)));
        });

        setSocket(newSocket);
        return () => newSocket.close();
    }, []);

    // Auto-select first room & load blocked users after socket ready
    useEffect(() => {
        if (socket) {
            api.getBlockedUsers().then((list) => setBlockedUsers(new Set(list))).catch(() => { });
            loadFavourites();
        }
    }, [socket]);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Data loading helpers
    const loadRooms = async () => {
        console.log('Loading rooms...');
        try {
            const [roomsData, globalRoom] = await Promise.all([
                api.getRooms().catch(e => { console.error('getRooms failed', e); return []; }),
                api.getGlobalRoom().catch(e => { console.error('getGlobalRoom failed', e); return null; })
            ]);

            console.log('Rooms Data:', roomsData);
            console.log('Global Room:', globalRoom);

            let allRooms = [];
            if (globalRoom && globalRoom._id) {
                allRooms.push(globalRoom);
            }

            if (Array.isArray(roomsData)) {
                const other = roomsData.filter((r) => !r.isGlobal);
                allRooms = [...allRooms, ...other];
            }

            console.log('All Rooms to set:', allRooms);
            setRooms(allRooms);
        } catch (e) {
            console.error('Load rooms error:', e);
        }
    };

    const loadUsers = async () => {
        try {
            const data = await api.getUsers();
            if (Array.isArray(data)) {
                setUsers(data);
                const online = new Set(data.filter((u) => u.isOnline).map((u) => u._id));
                setOnlineUsers(online);
            } else {
                console.error('Invalid users data:', data);
                setUsers([]);
            }
        } catch (e) {
            console.error('Load users error:', e);
            setUsers([]);
        }
    };

    const loadFavourites = async () => {
        try {
            const data = await api.getFavourites();
            if (Array.isArray(data)) {
                setFavourites(data);
            } else {
                console.error('Invalid favourites data:', data);
                setFavourites([]);
            }
        } catch (e) {
            console.error('Load favourites error:', e);
            setFavourites([]);
        }
    };

    const selectRoom = async (room) => {
        if (currentRoom && socket) socket.emit('leave_room', currentRoom._id);
        setCurrentRoom(room);
        setMessages([]);
        if (socket) socket.emit('join_room', room._id);
        try {
            const history = await api.getRoomMessages(room._id);
            if (Array.isArray(history)) {
                setMessages(history);
            } else {
                setMessages([]);
            }
        } catch (e) {
            console.error(e);
            setMessages([]);
        }
    };

    const handleBackToSidebar = () => {
        setCurrentRoom(null);
    };

    const createPrivateChat = async (userId) => {
        try {
            const room = await api.createPrivateChat(userId);
            setRooms((prev) => (prev.find((r) => r._id === room._id) ? prev : [room, ...prev]));
            selectRoom(room);
            setShowUserList(false);
        } catch (e) {
            console.error(e);
        }
    };

    const createGroup = async (name, memberIds) => {
        try {
            const room = await api.createGroupChat(name, memberIds);
            setRooms((prev) => [room, ...prev]);
            selectRoom(room);
            setShowGroupModal(false);
        } catch (e) {
            console.error(e);
        }
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if ((currentMessage.trim() || selectedFile) && socket && currentRoom) {
            const payload = {
                room: currentRoom._id,
                content: currentMessage,
                type: selectedFile ? selectedFile.fileType : 'text',
                fileUrl: selectedFile?.fileUrl,
                fileName: selectedFile?.fileName,
                fileSize: selectedFile?.fileSize,
            };
            socket.emit('send_message', payload);
            setCurrentMessage('');
            setSelectedFile(null);
            stopTyping();
        }
    };

    const handleTyping = (e) => {
        setCurrentMessage(e.target.value);
        if (socket && currentRoom) {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            socket.emit('typing_start', { room: currentRoom._id });
            typingTimeoutRef.current = setTimeout(stopTyping, 3000);
        }
    };

    const stopTyping = () => {
        if (socket && currentRoom) socket.emit('typing_stop', { room: currentRoom._id });
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 50 * 1024 * 1024) { alert('File too large'); return; }
        setIsUploading(true);
        try {
            const data = await api.uploadFile(file, (p) => setUploadProgress(p));
            setSelectedFile(data);
            setCurrentMessage(`📎 ${data.fileName}`);
        } catch (err) {
            console.error(err);
            alert('Upload failed');
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const handleCopyMessage = (text) => {
        navigator.clipboard.writeText(text).catch(() => { });
    };

    const handleDeleteMessage = async (msgId) => {
        try { await api.deleteMessage(msgId); } catch (e) { console.error(e); }
    };

    const handleAddMembers = async (memberIds) => {
        try { await api.addGroupMembers(currentRoom._id, memberIds); loadRooms(); } catch (e) { console.error(e); }
    };

    const handleRemoveMember = async (userId) => {
        if (window.confirm('Remove member?')) {
            try { await api.removeGroupMember(currentRoom._id, userId); loadRooms(); } catch (e) { console.error(e); }
        }
    };

    const handleLeaveGroup = async () => {
        if (!currentRoom || currentRoom.type !== 'group') return;
        if (window.confirm('Leave group?')) {
            try { await api.leaveGroup(currentRoom._id); setCurrentRoom(null); loadRooms(); } catch (e) { console.error(e); }
        }
    };

    // New feature handlers
    const handleBlockUser = async (userId) => {
        if (window.confirm('Block this user?')) {
            try {
                await api.blockUser(userId);
                setBlockedUsers((prev) => new Set(prev).add(userId));
            } catch (e) { console.error('Block error', e); }
        }
    };

    const handleProfilePhotoSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const data = await api.uploadProfilePhoto(file);
            const newPhotoUrl = data.user.profilePhoto;
            setProfilePhoto(newPhotoUrl);
            const updated = { ...user, profilePhoto: newPhotoUrl };
            localStorage.setItem('user', JSON.stringify(updated));
        } catch (err) { console.error('Profile upload error', err); }
    };

    const handleToggleFavourite = async (userId) => {
        try {
            const isFav = favourites.some(u => u._id === userId);
            if (isFav) {
                await api.removeFavourite(userId);
            } else {
                await api.addFavourite(userId);
            }
            loadFavourites();
        } catch (e) { console.error('Toggle favourite error', e); }
    };

    const handleRemoveProfilePhoto = async () => {
        if (window.confirm('Remove profile photo?')) {
            try {
                await api.removeProfilePhoto();
                setProfilePhoto('');
                const updated = { ...user, profilePhoto: '' };
                localStorage.setItem('user', JSON.stringify(updated));
            } catch (err) { console.error('Remove photo error', err); }
        }
    };

    // UI Rendering
    return (
        <div className={`chat-container ${isMobile ? 'mobile-view' : ''}`}>
            {/* Sidebar */}
            <div className={`sidebar ${isMobile && currentRoom ? 'hidden' : ''}`}>
                <div className="sidebar-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0 }}>Arangam</h3>
                        <button onClick={onLogout} className="btn-small danger" style={{ padding: '4px 8px', fontSize: '0.8rem' }}>Logout</button>
                    </div>

                    {/* Primary Actions (Left side below Arangam) */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => setShowUserList(true)} className="btn-icon" title="New Chat" style={{ background: 'var(--primary-color)', color: 'white', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>💬</button>
                            <button onClick={() => setShowGroupModal(true)} className="btn-icon" title="New Group" style={{ background: 'var(--secondary-color)', color: 'white', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👥+</button>
                        </div>

                        {/* Secondary Actions (Right side) */}
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <button onClick={() => setShowGroupShortcutModal(true)} className="btn-icon" title="My Groups">📂</button>
                            <button onClick={() => setShowFavouritesModal(true)} className="btn-icon" title="Favourites">⭐</button>
                            <button onClick={() => setShowProfileModal(true)} className="btn-icon" title="Settings">⚙️</button>
                            <button onClick={() => { console.log('Manual Refresh'); loadRooms(); loadUsers(); }} className="btn-icon" title="Refresh">🔄</button>
                        </div>
                    </div>
                </div>
                <div className="rooms-list">
                    {rooms.length === 0 && (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
                            <p>No conversations yet.</p>
                            <p>Click 💬 to start a chat!</p>
                            <button onClick={loadRooms} className="btn-small" style={{ marginTop: '10px' }}>Retry Loading</button>
                        </div>
                    )}
                    {rooms.map((room) => (
                        <div key={room._id} className={`room-item ${currentRoom?._id === room._id ? 'active' : ''}`} onClick={() => selectRoom(room)}>
                            <div className="room-avatar">
                                {room.isGlobal ? '🌐' : room.type === 'group' ? '👥' : (
                                    getUserAvatar(room.members?.find(m => m._id !== user.id))
                                )}
                            </div>
                            <div className="room-info">
                                <div className="room-name">{getRoomName(room)}</div>
                                {room.lastMessage && (
                                    <div className="room-last-message">{room.lastMessage.content?.substring(0, 30)}...</div>
                                )}
                            </div>
                            {room.type === 'private' && room.members?.find((m) => m._id !== user.id && onlineUsers.has(m._id)) && (
                                <div className="online-indicator" />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Chat Area */}
            <div className={`chat-area ${isMobile && !currentRoom ? 'hidden' : ''}`}>
                {
                    currentRoom ? (
                        <>
                            <div className="chat-header">
                                <div className="header-info" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    {isMobile && (
                                        <button onClick={handleBackToSidebar} className="btn-icon" style={{ marginRight: '5px' }}>←</button>
                                    )}
                                    <div>
                                        <h3>{getRoomName(currentRoom)}</h3>
                                        {currentRoom.type === 'private' && (
                                            <span className="status-text">{currentRoom.members?.find((m) => m._id !== user.id && onlineUsers.has(m._id)) ? 'Online' : 'Offline'}</span>
                                        )}
                                    </div>
                                </div>
                                {currentRoom.type === 'group' && (
                                    <div className="header-actions">
                                        {(currentRoom.creator?._id === user.id || currentRoom.creator === user.id) ? (
                                            <button className="btn-small" onClick={() => setShowManageGroupModal(true)}>Manage</button>
                                        ) : (
                                            <button className="btn-small danger" onClick={handleLeaveGroup}>Leave</button>
                                        )}
                                    </div>
                                )}
                                {/* Shortcut buttons */}
                                <div className="header-actions">
                                    <button onClick={() => setShowFavouritesModal(true)} className="btn-icon" title="Favourites">⭐</button>
                                    <button onClick={() => setShowGroupShortcutModal(true)} className="btn-icon" title="Groups">👥</button>
                                    <button onClick={() => setShowProfileModal(true)} className="btn-icon" title="Settings">⚙️</button>
                                </div>
                            </div>
                            <div className="messages-container">
                                {messages.map((msg, idx) => {
                                    const isSameSender = idx > 0 && messages[idx - 1].sender?._id === msg.sender?._id && !shouldShowDateSeparator(msg, messages[idx - 1]);
                                    return (
                                        <React.Fragment key={msg._id || idx}>
                                            {shouldShowDateSeparator(msg, messages[idx - 1]) && (
                                                <div className="date-separator"><span>{formatDateSeparator(msg.createdAt || msg.time)}</span></div>
                                            )}
                                            <div className={`message ${msg.type === 'system' ? 'system' : (msg.sender?._id === user.id || msg.sender === user.username ? 'sent' : 'received')} ${isSameSender ? 'same-sender' : ''}`}>
                                                <div className="message-content">
                                                    {!isSameSender && msg.sender && (
                                                        <img src={msg.sender.profilePhoto ? `${import.meta.env.VITE_API_URL}${msg.sender.profilePhoto}` : null} alt="avatar" className="avatar" style={{ width: '24px', height: '24px', borderRadius: '50%', marginRight: '4px' }} />
                                                    )}
                                                    {isSameSender && <div style={{ width: '28px' }} />}
                                                    {!isSameSender && (
                                                        <span className="sender" style={currentRoom.type === 'group' && msg.sender?._id !== user.id && msg.type !== 'system' ? { color: getUserColor(msg.sender?._id || msg.sender) } : {}}>
                                                            {msg.sender?.username || msg.sender}
                                                        </span>
                                                    )}
                                                    {msg.deleted ? (
                                                        <p className="deleted-message"><i>This message was deleted</i></p>
                                                    ) : msg.type === 'system' ? (
                                                        <p>{msg.content}</p>
                                                    ) : (
                                                        <>
                                                            {msg.type === 'text' && <p>{msg.content}</p>}
                                                            {msg.type === 'image' && (
                                                                <div className="message-file">
                                                                    <img src={`${import.meta.env.VITE_API_URL}${msg.fileUrl}`} alt={msg.fileName} />
                                                                    <p>{msg.content}</p>
                                                                </div>
                                                            )}
                                                            {msg.type === 'file' && (
                                                                <div className="message-file">
                                                                    <a href={`${import.meta.env.VITE_API_URL}${msg.fileUrl}`} download={msg.fileName}>📎 {msg.fileName}</a>
                                                                    <p>{msg.content}</p>
                                                                </div>
                                                            )}
                                                            <div className="message-actions">
                                                                <button onClick={() => handleCopyMessage(msg.content)} title="Copy">📋</button>
                                                                {(msg.sender?._id === user.id || msg.sender === user.username) && (
                                                                    <button onClick={() => handleDeleteMessage(msg._id)} title="Delete">🗑️</button>
                                                                )}
                                                            </div>
                                                        </>
                                                    )}
                                                    <span className="time">{formatTime(msg.createdAt || msg.time)}</span>
                                                </div>
                                            </div>
                                        </React.Fragment>
                                    );
                                })}
                                {typingUsers.size > 0 && (
                                    <div className="typing-indicator">
                                        {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                            <form className="message-input" onSubmit={sendMessage}>
                                <input type="file" ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} />
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-icon" disabled={isUploading}>📎</button>
                                <input type="text" value={currentMessage} onChange={handleTyping} placeholder={isUploading ? `Uploading... ${uploadProgress}%` : 'Type a message...'} disabled={isUploading} />
                                <button type="submit" disabled={isUploading}>Send</button>
                            </form>
                        </>
                    ) : (
                        <div className="no-room-selected">
                            <h2>Welcome to Arangam</h2>
                            <p>Select a chat or start a new conversation</p>
                        </div>
                    )}
            </div>

            {/* Modals */}
            {
                showUserList && (
                    <div className="modal-overlay" onClick={() => setShowUserList(false)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header"><h3>Start New Chat</h3><button onClick={() => setShowUserList(false)} className="btn-close">×</button></div>
                            <div className="modal-body">
                                {users.map((u) => (
                                    <div key={u._id} className="user-item" onClick={() => createPrivateChat(u._id)}>
                                        <div className="user-avatar">{getUserAvatar(u)}</div>
                                        <div className="user-info">
                                            <div className="user-name">{u.username}</div>
                                            <div className="user-email">{u.email}</div>
                                        </div>
                                        {onlineUsers.has(u._id) && <div className="online-indicator" />}
                                        <button className="btn-small" onClick={(e) => { e.stopPropagation(); handleBlockUser(u._id); }}>Block</button>
                                        <button className="btn-small" onClick={(e) => { e.stopPropagation(); handleToggleFavourite(u._id); }}>
                                            {favourites.some(f => f._id === u._id) ? '★' : '☆'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Settings / Profile Modal */}
            {
                showProfileModal && (
                    <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header"><h3>Settings</h3><button onClick={() => setShowProfileModal(false)} className="btn-close">×</button></div>
                            <div className="modal-body">
                                {/* Profile Photo Section */}
                                <div className="profile-section" style={{ marginBottom: '2rem', textAlign: 'center' }}>
                                    <div className="profile-photo-preview" style={{ marginBottom: '1rem' }}>
                                        {profilePhoto ? (
                                            <img src={`${import.meta.env.VITE_API_URL}${profilePhoto}`} alt="Profile" style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: '#ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontSize: '2rem' }}>👤</div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                        <label className="btn-small" style={{ cursor: 'pointer' }}>
                                            Upload Photo
                                            <input type="file" accept="image/*" onChange={handleProfilePhotoSelect} style={{ display: 'none' }} />
                                        </label>
                                        {profilePhoto && (
                                            <button onClick={handleRemoveProfilePhoto} className="btn-small danger">Remove Photo</button>
                                        )}
                                    </div>
                                </div>

                                {/* Favourites Section */}
                                <div className="settings-section" style={{ marginBottom: '2rem' }}>
                                    <h4>Favourites</h4>
                                    <button onClick={() => setShowManageFavouritesModal(true)} className="btn-primary">Manage Favourites</button>
                                </div>

                                {/* Theme Section */}
                                <div className="settings-section">
                                    <h4>Theme</h4>
                                    <div className="theme-options" style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button className={`btn-small ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')} style={{ flex: 1, background: theme === 'light' ? 'var(--primary-color)' : 'var(--card-bg)', color: theme === 'light' ? 'white' : 'var(--text-color)', border: '1px solid var(--border-color)' }}>Light</button>
                                        <button className={`btn-small ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')} style={{ flex: 1, background: theme === 'dark' ? 'var(--primary-color)' : 'var(--card-bg)', color: theme === 'dark' ? 'white' : 'var(--text-color)', border: '1px solid var(--border-color)' }}>Dark</button>
                                        <button className={`btn-small ${theme === 'midnight' ? 'active' : ''}`} onClick={() => setTheme('midnight')} style={{ flex: 1, background: theme === 'midnight' ? 'var(--primary-color)' : 'var(--card-bg)', color: theme === 'midnight' ? 'white' : 'var(--text-color)', border: '1px solid var(--border-color)' }}>Midnight</button>
                                    </div>
                                </div>

                                {/* Notifications Section */}
                                <div className="settings-section" style={{ marginTop: '1rem' }}>
                                    <h4>Notifications</h4>
                                    <button onClick={playNotificationSound} className="btn-secondary" style={{ width: '100%' }}>Test Notification Sound 🔊</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Manage Favourites Modal */}
            {
                showManageFavouritesModal && (
                    <div className="modal-overlay" onClick={() => setShowManageFavouritesModal(false)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header"><h3>Manage Favourites</h3><button onClick={() => setShowManageFavouritesModal(false)} className="btn-close">×</button></div>
                            <div className="modal-body">
                                <div className="form-group">
                                    <input type="text" placeholder="Search users..." style={{ marginBottom: '1rem' }} />
                                </div>
                                {users.map((u) => (
                                    <div key={u._id} className="user-item" onClick={() => handleToggleFavourite(u._id)}>
                                        <div className="user-avatar">{getUserAvatar(u)}</div>
                                        <div className="user-info">
                                            <div className="user-name">{u.username}</div>
                                            <div className="user-email">{u.email}</div>
                                        </div>
                                        <button className="btn-icon" onClick={(e) => { e.stopPropagation(); handleToggleFavourite(u._id); }}>
                                            {favourites.some(f => f._id === u._id) ? '★' : '☆'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Favourites Modal (Shortcut) */}
            {
                showFavouritesModal && (
                    <div className="modal-overlay" onClick={() => setShowFavouritesModal(false)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header"><h3>Favourites</h3><button onClick={() => setShowFavouritesModal(false)} className="btn-close">×</button></div>
                            <div className="modal-body">
                                {favourites.length === 0 ? <p>No favourites yet.</p> : (
                                    favourites.map(u => (
                                        <div key={u._id} className="user-item" onClick={() => createPrivateChat(u._id)}>
                                            <div className="user-avatar">{getUserAvatar(u)}</div>
                                            <div className="user-info">
                                                <div className="user-name">{u.username}</div>
                                                <div className="user-email">{u.isOnline ? 'Online' : 'Offline'}</div>
                                            </div>
                                            <button className="btn-icon" onClick={(e) => { e.stopPropagation(); handleToggleFavourite(u._id); }}>🗑️</button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Group Shortcut Modal */}
            {
                showGroupShortcutModal && (
                    <div className="modal-overlay" onClick={() => setShowGroupShortcutModal(false)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header"><h3>My Groups</h3><button onClick={() => setShowGroupShortcutModal(false)} className="btn-close">×</button></div>
                            <div className="modal-body">
                                {rooms.filter(r => r.type === 'group').length === 0 ? <p>No groups joined.</p> : (
                                    rooms.filter(r => r.type === 'group').map(r => (
                                        <div key={r._id} className="user-item" onClick={() => { selectRoom(r); setShowGroupShortcutModal(false); }}>
                                            <div className="user-avatar">👥</div>
                                            <div className="user-info">
                                                <div className="user-name">{r.name}</div>
                                                <div className="user-email">{r.members.length} members</div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Group Modal */}
            {
                showGroupModal && (
                    <GroupModal users={users} onClose={() => setShowGroupModal(false)} onCreate={createGroup} />
                )
            }

            {/* Manage Group Modal */}
            {
                showManageGroupModal && currentRoom && (
                    <ManageGroupModal room={currentRoom} users={users} currentUserId={user.id} onClose={() => setShowManageGroupModal(false)} onAddMembers={handleAddMembers} onRemoveMember={handleRemoveMember} />
                )
            }
        </div>
    );
};

// Group Modal Component
const GroupModal = ({ users, onClose, onCreate }) => {
    const [groupName, setGroupName] = useState('');
    const [selectedMembers, setSelectedMembers] = useState([]);
    const toggleMember = (id) => {
        setSelectedMembers((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    };
    const handleCreate = () => {
        if (groupName.trim() && selectedMembers.length) onCreate(groupName, selectedMembers);
    };
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header"><h3>Create Group</h3><button onClick={onClose} className="btn-close">×</button></div>
                <div className="modal-body">
                    <div className="form-group"><label>Group Name</label><input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Enter group name" /></div>
                    <div className="form-group"><label>Select Members ({selectedMembers.length})</label><div className="members-list">
                        {users.map((u) => (
                            <div key={u._id} className="member-item">
                                <input type="checkbox" checked={selectedMembers.includes(u._id)} onChange={() => toggleMember(u._id)} />
                                <span>{u.username}</span>
                            </div>
                        ))}
                    </div></div>
                    <button onClick={handleCreate} className="btn-primary" disabled={!groupName.trim() || !selectedMembers.length}>Create Group</button>
                </div>
            </div>
        </div>
    );
};

// Manage Group Modal Component
const ManageGroupModal = ({ room, users, currentUserId, onClose, onAddMembers, onRemoveMember }) => {
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [activeTab, setActiveTab] = useState('members');
    const availableUsers = users.filter((u) => !room.members.some((m) => m._id === u._id) && u._id !== currentUserId);
    const toggleUser = (id) => {
        setSelectedUsers((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    };
    const handleAdd = () => {
        if (selectedUsers.length) {
            onAddMembers(selectedUsers);
            setSelectedUsers([]);
        }
    };
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header"><h3>Manage Group: {room.name}</h3><button className="btn-close" onClick={onClose}>×</button></div>
                <div className="modal-tabs">
                    <button className={`tab-button ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>Members ({room.members.length})</button>
                    <button className={`tab-button ${activeTab === 'add' ? 'active' : ''}`} onClick={() => setActiveTab('add')}>Add Members</button>
                </div>
                <div className="modal-body">
                    {activeTab === 'members' ? (
                        <div className="members-list">
                            {room.members.map((member) => (
                                <div key={member._id} className="member-item">
                                    <div className="user-avatar">👤</div>
                                    <div className="user-info">
                                        <div className="user-name">
                                            {member.username}
                                            {(member._id === room.creator?._id || member._id === room.creator) && <span className="badge">Creator</span>}
                                            {member._id === currentUserId && <span className="badge">You</span>}
                                        </div>
                                        <div className="user-email">{member.email}</div>
                                    </div>
                                    {member._id !== room.creator?._id && member._id !== room.creator && member._id !== currentUserId && (
                                        <button className="btn-small danger" onClick={() => onRemoveMember(member._id)}>Remove</button>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <>
                            <div className="members-list">
                                {availableUsers.length === 0 ? (
                                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No users available to add</p>
                                ) : (
                                    availableUsers.map((u) => (
                                        <div key={u._id} className="member-item">
                                            <input type="checkbox" checked={selectedUsers.includes(u._id)} onChange={() => toggleUser(u._id)} />
                                            <div className="user-avatar">👤</div>
                                            <div className="user-info">
                                                <div className="user-name">{u.username}</div>
                                                <div className="user-email">{u.email}</div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            {availableUsers.length > 0 && (
                                <button onClick={handleAdd} className="btn-primary" disabled={!selectedUsers.length}>Add {selectedUsers.length > 0 ? `(${selectedUsers.length})` : ''} Members</button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Chat;
