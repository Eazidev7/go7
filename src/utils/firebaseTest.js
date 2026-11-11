// Firebase connection test utility
import { auth } from '../config/firebase';

export const testFirebaseConnection = () => {
  try {
    if (!auth) {
      return {
        status: 'error',
        message: 'Firebase auth is not initialized',
        connected: false
      };
    }

    // Check if Firebase is properly configured
    const config = auth.app.options;
    
    if (!config.apiKey || !config.authDomain || !config.projectId) {
      return {
        status: 'error', 
        message: 'Firebase configuration is incomplete',
        connected: false,
        config: {
          apiKey: !!config.apiKey,
          authDomain: !!config.authDomain,
          projectId: !!config.projectId
        }
      };
    }

    return {
      status: 'success',
      message: 'Firebase is properly configured',
      connected: true,
      projectId: config.projectId
    };

  } catch (error) {
    return {
      status: 'error',
      message: `Firebase connection error: ${error.message}`,
      connected: false
    };
  }
};

export const logFirebaseStatus = () => {
  const status = testFirebaseConnection();
  
  if (status.connected) {
    console.log('🔥✅ Firebase Status: Connected');
    console.log('🔥📱 Project ID:', status.projectId);
  } else {
    console.warn('🔥❌ Firebase Status: Not Connected');
    console.warn('🔥⚠️ Issue:', status.message);
    if (status.config) {
      console.warn('🔥🔧 Config Check:', status.config);
    }
  }
  
  return status;
};