import api from './services';

// Get all rooms
export const getRooms = async () => {
    const response = await api.get('/rooms');
    return response.data;
};

// Get global room
export const getGlobalRoom = async () => {
    const response = await api.get('/rooms/global');
    return response.data;
};

// Create private chat
export const createPrivateChat = async (userId) => {
    const response = await api.post('/rooms/private', { userId });
    return response.data;
};

// Create group chat
export const createGroupChat = async (name, memberIds) => {
    const response = await api.post('/rooms/group', { name, memberIds });
    return response.data;
};

// Get room messages
export const getRoomMessages = async (roomId, limit = 50, before = null) => {
    const params = { limit };
    if (before) params.before = before;
    const response = await api.get(`/rooms/${roomId}/messages`, { params });
    return response.data;
};

// Get all users
export const getUsers = async () => {
    const response = await api.get('/users');
    return response.data;
};

// Upload file
export const uploadFile = async (file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
            if (onProgress) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress(percentCompleted);
            }
        }
    });

    return response.data;
};

// Update profile photo
export const updateProfilePhoto = async (profilePhoto) => {
    const response = await api.post('/auth/profile-photo', { profilePhoto });
    return response.data;
};

// New API: Get blocked users list
export const getBlockedUsers = async () => {
    const response = await api.get('/users/blocked');
    return response.data;
};

// Block a user
export const blockUser = async (userId) => {
    const response = await api.post('/users/block', { userId });
    return response.data;
};

// Unblock a user
export const unblockUser = async (userId) => {
    const response = await api.post('/users/unblock', { userId });
    return response.data;
};

// Get favourites
export const getFavourites = async () => {
    const response = await api.get('/users/favourites');
    return response.data;
};

// Add to favourites
export const addFavourite = async (userId) => {
    const response = await api.post('/users/favourites/add', { userId });
    return response.data;
};

// Remove from favourites
export const removeFavourite = async (userId) => {
    const response = await api.post('/users/favourites/remove', { userId });
    return response.data;
};

// Upload profile photo (multipart)
export const uploadProfilePhoto = async (file) => {
    const formData = new FormData();
    formData.append('profilePhoto', file);
    const response = await api.post('/auth/profile-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

// Remove profile photo
export const removeProfilePhoto = async () => {
    const response = await api.delete('/auth/profile-photo');
    return response.data;
};

// Add members to group
export const addGroupMembers = async (roomId, userIds) => {
    const response = await api.post(`/rooms/${roomId}/members`, { userIds });
    return response.data;
};

// Remove member from group
export const removeGroupMember = async (roomId, userId) => {
    const response = await api.delete(`/rooms/${roomId}/members/${userId}`);
    return response.data;
};

// Leave group
export const leaveGroup = async (roomId) => {
    const response = await api.post(`/rooms/${roomId}/leave`);
    return response.data;
};

// Delete room
export const deleteRoom = async (roomId) => {
    const response = await api.delete(`/rooms/${roomId}`);
    return response.data;
};

// Delete message
export const deleteMessage = async (messageId) => {
    const response = await api.delete(`/messages/${messageId}`);
    return response.data;
};

// Bulk delete messages
export const bulkDeleteMessages = async (ids) => {
    const response = await api.post('/messages/bulk-delete', { ids });
    return response.data;
};

// Check username availability
export const checkUsername = async (username) => {
    const response = await api.get(`/auth/check-username/${username}`);
    return response.data;
};
