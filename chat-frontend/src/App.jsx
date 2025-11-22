import React, { useState, useEffect } from 'react';
import Auth from './Auth';
import Chat from './Chat';
import { getCurrentUser, logout } from './services';
import './index.css';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
  }, []);

  const handleLogin = () => {
    setUser(getCurrentUser());
  };

  const handleLogout = () => {
    logout();
    setUser(null);
  };

  return (
    <div className="app">
      {user ? (
        <Chat onLogout={handleLogout} />
      ) : (
        <Auth onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;
