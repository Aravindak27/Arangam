const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            throw new Error();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key');
        const user = await User.findById(decoded.userId);

        if (!user) {
            throw new Error();
        }

        req.token = token;
        req.user = user;
        req.userId = user._id.toString();
        next();
    } catch (error) {
        res.status(401).json({ message: 'Please authenticate' });
    }
};

module.exports = auth;
