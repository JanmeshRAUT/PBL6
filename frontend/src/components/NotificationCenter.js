import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  FaBell,
  FaCheckCircle,
  FaExclamationCircle,
  FaTimesCircle,
  FaInfoCircle,
  FaTimes,
} from "react-icons/fa";
import "../css/NotificationCenter.css";

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [showPanel, setShowPanel] = useState(false);
  const [loading, setLoading] = useState(false);

  // ✅ Fetch Real Notifications from Access Logs
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const res = await axios.get(
          "http://localhost:5000/all_doctor_access_logs"
        );
        const logs = res.data.logs || [];

        // Transform logs into notifications (last 15 recent)
        const recentLogs = logs.slice(0, 15).map((log, idx) => {
          let type = "info";
          let title = "ℹ️ Access Request";
          let icon = <FaInfoCircle />;

          if (log.status === "Granted" || log.status === "Approved") {
            type = "success";
            title = "✅ Access Granted";
            icon = <FaCheckCircle />;
          } else if (log.status === "Denied") {
            type = "error";
            title = "❌ Access Denied";
            icon = <FaTimesCircle />;
          } else if (log.status === "Flagged") {
            type = "warning";
            title = "⚠️ Flagged for Review";
            icon = <FaExclamationCircle />;
          }

          return {
            id: `${idx}-${log.timestamp}`,
            type,
            title,
            message: `Dr. ${log.doctor_name} - ${log.action || "Access Request"} (Patient: ${
              log.patient_name || "N/A"
            })`,
            details: `Status: ${log.status}`,
            timestamp: new Date(log.timestamp),
            read: false,
            icon,
            action: log.action,
            doctorName: log.doctor_name,
            patientName: log.patient_name,
          };
        });

        setNotifications(recentLogs);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
    // Refresh every 20 seconds for real-time updates
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const deleteNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
    setShowPanel(false);
  };

  const formatTime = (date) => {
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="notification-center">
      {/* Bell Icon */}
      <button
        className="notification-bell"
        onClick={() => setShowPanel(!showPanel)}
        title="View notifications"
      >
        <FaBell className="bell-icon" />
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {showPanel && (
        <div className="notification-panel">
          <div className="panel-header">
            <h3>
              {unreadCount > 0
                ? `Notifications (${unreadCount} unread)`
                : "Notifications"}
            </h3>
            <button
              className="close-btn"
              onClick={() => setShowPanel(false)}
              title="Close"
            >
              <FaTimes />
            </button>
          </div>

          <div className="panel-body">
            {loading ? (
              <div className="no-notifications">
                <div style={{ fontSize: "1.5rem" }}>⏳</div>
                <p>Loading notifications...</p>
              </div>
            ) : notifications.length > 0 ? (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`notification-item ${notif.type} ${
                    notif.read ? "read" : "unread"
                  }`}
                  onClick={() => markAsRead(notif.id)}
                >
                  <div className="notif-icon">
                    {notif.type === "success" && (
                      <FaCheckCircle className="icon-success" />
                    )}
                    {notif.type === "error" && (
                      <FaTimesCircle className="icon-error" />
                    )}
                    {notif.type === "warning" && (
                      <FaExclamationCircle className="icon-warning" />
                    )}
                    {notif.type === "info" && (
                      <FaInfoCircle className="icon-info" />
                    )}
                  </div>

                  <div className="notif-content">
                    <h4>{notif.title}</h4>
                    <p>{notif.message}</p>
                    <p
                      style={{
                        fontSize: "0.8rem",
                        color: "#94a3b8",
                        marginTop: "0.25rem",
                      }}
                    >
                      {notif.details}
                    </p>
                    <span className="notif-time">
                      {formatTime(notif.timestamp)}
                    </span>
                  </div>

                  <button
                    className="notif-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notif.id);
                    }}
                    title="Delete"
                  >
                    <FaTimes />
                  </button>
                </div>
              ))
            ) : (
              <div className="no-notifications">
                <FaBell className="empty-icon" />
                <p>All caught up! No new notifications</p>
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="panel-footer">
              <button className="clear-btn" onClick={clearAll}>
                Clear All Notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
