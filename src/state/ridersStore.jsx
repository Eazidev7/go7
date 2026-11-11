import React, { createContext, useContext, useState } from 'react';

const RidersContext = createContext();

export const RidersProvider = ({ children }) => {
  const [rider, setRider] = useState(null);

  return (
    <RidersContext.Provider value={{ 
      rider, 
      setRider 
    }}>
      {children}
    </RidersContext.Provider>
  );
};

export const useRidersStore = () => {
  const context = useContext(RidersContext);
  if (!context) {
    throw new Error('useRidersStore must be used within a RidersProvider');
  }
  return context;
};

export default RidersContext;