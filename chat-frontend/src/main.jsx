import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Debugging: Alert errors on mobile
window.onerror = function (message, source, lineno, colno, error) {
  alert(`Error: ${message}\nLine: ${lineno}\nSource: ${source}`);
};
window.onunhandledrejection = function (event) {
  alert(`Unhandled Promise Rejection: ${event.reason}`);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
