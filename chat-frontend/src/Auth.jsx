import React, { useState, useRef } from 'react';
import { login, signup } from './services';
import { checkUsername } from './api';

const Auth = ({ onLogin }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [usernameStatus, setUsernameStatus] = useState(null); // null, 'checking', 'available', 'taken'
    const checkTimeoutRef = useRef(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });

        if (!isLogin && name === 'username') {
            if (checkTimeoutRef.current) {
                clearTimeout(checkTimeoutRef.current);
            }

            if (value.trim().length < 3) {
                setUsernameStatus(null);
                return;
            }

            setUsernameStatus('checking');
            checkTimeoutRef.current = setTimeout(async () => {
                try {
                    const result = await checkUsername(value);
                    setUsernameStatus(result.available ? 'available' : 'taken');
                } catch (err) {
                    console.error('Username check failed', err);
                    setUsernameStatus(null);
                }
            }, 500);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!isLogin && usernameStatus === 'taken') {
            setError('Please choose a different username');
            return;
        }

        try {
            if (isLogin) {
                await login(formData.email, formData.password);
            } else {
                await signup(formData.username, formData.email, formData.password);
            }
            onLogin();
        } catch (err) {
            setError(err.response?.data?.message || 'An error occurred');
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
                <p style={{ textAlign: 'center', color: '#666', fontSize: '0.8rem' }}>v1.1 (Mobile Fix)</p>
                {error && <div className="error-message">{error}</div>}
                <form onSubmit={handleSubmit}>
                    {!isLogin && (
                        <div className="form-group">
                            <label>Username</label>
                            <div className="input-with-status">
                                <input
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    required
                                    className={usernameStatus === 'taken' ? 'error' : usernameStatus === 'available' ? 'success' : ''}
                                />
                                {usernameStatus === 'checking' && <span className="status-icon">⏳</span>}
                                {usernameStatus === 'available' && <span className="status-icon">✅</span>}
                                {usernameStatus === 'taken' && <span className="status-icon">❌</span>}
                            </div>
                            {usernameStatus === 'taken' && <small className="error-text">Username is already taken</small>}
                        </div>
                    )}
                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <button type="submit" className="btn-primary" disabled={!isLogin && usernameStatus === 'taken'}>
                        {isLogin ? 'Login' : 'Sign Up'}
                    </button>
                </form>
                <p className="toggle-auth">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <span onClick={() => setIsLogin(!isLogin)}>
                        {isLogin ? 'Sign Up' : 'Login'}
                    </span>
                </p>
            </div>
        </div>
    );
};

export default Auth;
