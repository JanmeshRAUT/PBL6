import React from "react";
import { useNotification } from "../context/NotificationContext";
import "../css/Toast.css";

const Toast = () => {
  const { notifications, removeNotification } = useNotification();

  return (
    <div className="toast-container">
      {notifications.map((notification) => (
        <div key={notification.id} className={`toast toast-${notification.type}`}>
          <div className="toast-content">
            {notification.type === "success" && <span className="toast-icon">✅</span>}
            {notification.type === "error" && <span className="toast-icon">❌</span>}
            {notification.type === "warning" && <span className="toast-icon">⚠️</span>}
            {notification.type === "info" && <span className="toast-icon">ℹ️</span>}
            <span className="toast-message">{notification.message}</span>
          </div>
          <button
            className="toast-close"
            onClick={() => removeNotification(notification.id)}
            aria-label="Close notification"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};

export default Toast;
