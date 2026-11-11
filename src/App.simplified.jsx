import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import the RiderAdmin component we fixed
import RiderAdmin from './pages/RiderAdmin.jsx';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={
            <div style={{padding:'20px'}}>
              <h1>Go7 Admin System</h1>
              <p>This is a simplified version to test functionality.</p>
              <p>Go to <a href="/admin/riders">/admin/riders</a> to see the RiderAdmin component</p>
            </div>
          } />
          <Route path="/admin/riders" element={<RiderAdmin />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;