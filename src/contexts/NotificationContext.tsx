import React, { createContext, useContext, ReactNode } from 'react';
import NotificationSystem, { useNotifications } from '../components/NotificationSystem';

interface NotificationContextType {
  showOrderConfirmed: (orderId: string) => void;
  showRiderPickup: (riderName: string, orderId: string) => void;
  showRiderArriving: (riderName: string, eta: string) => void;
  showDelivered: (orderId: string) => void;
  addNotification: (notification: any) => void;
  dismissNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const notificationActions = useNotifications();

  return (
    <NotificationContext.Provider value={notificationActions}>
      {children}
      <NotificationSystem
        notifications={notificationActions.notifications}
        onDismiss={notificationActions.dismissNotification}
      />
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
};

// Notification context is ready for real-time use across the Go7 app