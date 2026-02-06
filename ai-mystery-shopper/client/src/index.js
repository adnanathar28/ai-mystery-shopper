import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// This is the bridge between your React code and the HTML page
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);