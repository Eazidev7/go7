// Simple JavaScript entry point for Go7 without JSX
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './contexts/AuthContext.js';
import './index.css';
import AppRouter from './AppRouter.js';

// Create App component using React.createElement instead of JSX
function App() {
    return React.createElement(HelmetProvider, null,
        React.createElement(AuthProvider, null,
            React.createElement(BrowserRouter, null,
                React.createElement('div', { className: 'App' },
                    React.createElement(AppRouter, null)
                )
            )
        )
    );
}

// Initialize the React app
const container = document.getElementById('root');
const root = createRoot(container);
root.render(React.createElement(App, null));