import React, { createContext, useContext, useState, useCallback } from "react";

// Create the notification context
const NotificationContext = createContext();

/**
 * NotificationProvider component
 * Wraps the app and provides global toast notifications
 */
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  // Show a notification
  const showNotification = useCallback((message, type = "info", duration = 4000) => {
    const id = Date.now();
    const notification = { id, message, type };

    setNotifications((prev) => [...prev, notification]);

    // Auto-remove notification after duration
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  }, []);

  // Remove a notification
  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Convenience methods
  const success = useCallback(
    (message, duration = 3000) => showNotification(message, "success", duration),
    [showNotification]
  );

  const error = useCallback(
    (message, duration = 5000) => showNotification(message, "error", duration),
    [showNotification]
  );

  const warning = useCallback(
    (message, duration = 4000) => showNotification(message, "warning", duration),
    [showNotification]
  );

  const info = useCallback(
    (message, duration = 3000) => showNotification(message, "info", duration),
    [showNotification]
  );

  const value = {
    notifications,
    showNotification,
    removeNotification,
    success,
    error,
    warning,
    info,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

/**
 * Hook to use notifications anywhere in the app
 */
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider");
  }
  return context;
};
