import { useCallback, useEffect, useRef, useState } from "react";

const NOTIFICATION_TIMEOUT_MS = 5000;
const MAX_NOTIFICATIONS = 5;

const createNotification = (message) => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  message,
});

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const timeoutIdsRef = useRef(new Map());

  const dismissNotification = useCallback((notificationId) => {
    const timeoutId = timeoutIdsRef.current.get(notificationId);

    if (timeoutId) {
      globalThis.clearTimeout(timeoutId);
      timeoutIdsRef.current.delete(notificationId);
    }

    setNotifications((currentNotifications) =>
      currentNotifications.filter(
        (notification) => notification.id !== notificationId,
      ),
    );
  }, []);

  const pushNotification = useCallback(
    (message) => {
      const notification = createNotification(message);

      setNotifications((currentNotifications) => {
        const nextNotifications = [notification, ...currentNotifications];
        return nextNotifications.slice(0, MAX_NOTIFICATIONS);
      });

      const timeoutId = globalThis.setTimeout(() => {
        dismissNotification(notification.id);
      }, NOTIFICATION_TIMEOUT_MS);

      timeoutIdsRef.current.set(notification.id, timeoutId);
    },
    [dismissNotification],
  );

  useEffect(
    () => () => {
      timeoutIdsRef.current.forEach((timeoutId) => {
        globalThis.clearTimeout(timeoutId);
      });
      timeoutIdsRef.current.clear();
    },
    [],
  );

  return {
    dismissNotification,
    notifications,
    pushNotification,
  };
}
