import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { registerForPushNotificationsAsync } from '../utils/registerForPushNotificationsAsync';
import { tokenStorage } from '../features/auth/utils/tokenStorage';

interface NotificationContextType {
  expoPushToken: string | null;
  devicePushToken: string | null;
  notification: Notifications.Notification | null;
  error: Error | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [devicePushToken, setDevicePushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    registerForPushNotificationsAsync().then(
      (token) => {
        setExpoPushToken(token);
        tokenStorage.setPushToken(token).catch(() => {});
      },
      (err) => setError(err),
    );

    Notifications.getDevicePushTokenAsync().then(
      (deviceToken) => {
        setDevicePushToken(deviceToken.data);
      },
      (err) => setError(err),
    );

    const notificationListener = Notifications.addNotificationReceivedListener(
      (notif) => {
        console.log('🔔 Notification Received:', notif);
        setNotification(notif);
      },
    );

    const responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('🔔 Notification Response:', response);
        const data = response.notification.request.content.data as Record<string, unknown> | undefined;
        if (data?.type === 'ATTENDANCE_REMINDER') {
          router.push('/employee');
        }
        if (data?.type === 'CHAUFFEUR_BROADCAST') {
          router.push('/chauffeur/requests');
        }
      },
    );

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  return (
    <NotificationContext.Provider value={{ expoPushToken, devicePushToken, notification, error }}>
      {children}
    </NotificationContext.Provider>
  );
};
