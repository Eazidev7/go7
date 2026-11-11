import React from 'react';

const SuperSimple = () => {
  return (
    <div>
      <h1>HELLO WORLD - SUPER SIMPLE TEST</h1>
      <p>If you can see this, React and routing are working!</p>
      <div style={{
        background: 'red',
        color: 'white',
        padding: '20px',
        fontSize: '20px'
      }}>
        RED BOX - SHOULD BE VERY VISIBLE
      </div>
    </div>
  );
};

export default SuperSimple;