import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../api";
import "../css/Patient.css";
import "../css/Notifications.css";
import {
  FaUserMd,
  FaClock,
  FaNotesMedical,
  FaFileAlt,
  FaShieldAlt,
  FaHistory,
  FaCheckCircle,
  FaTimesCircle,
  FaCircle,
  FaSync,
} from "react-icons/fa";

const PatientDashboard = ({ user, onBack }) => {
  const navigate = useNavigate();

  // ✅ ALL HOOKS AT THE TOP
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLogs = useCallback(async () => {
    if (!user?.name) return;
    try {
      setLoading(true);
      setError(null);
      // ✅ Use dedicated patient access history endpoint
      const res = await axios.get(
        `${API_URL}/patient_access_history/${user.name}`
      );
      if (res.data.success) {
        // Sort specifically by timestamp if not already sorted
        const sortedLogs = (res.data.logs || []).sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        );

        const normalizedLogs = sortedLogs.map((log) => ({
          doctor: log.doctor_name || log.user || "Unknown User",
          role: log.doctor_role || "Doctor",
          accessType: log.action || "Data Access",
          justification: log.justification || "Routine Checkup",
          status: log.status || "Pending",
          timestamp: log.timestamp || "—",
          source: log.source || "system"
        }));
        setLogs(normalizedLogs);
      }
    } catch (error) {
      console.error("Error fetching access logs:", error);
      setError("Failed to load access history. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }, [user?.name]);

  useEffect(() => {
    if (user?.name) {
      fetchLogs();
    }
  }, [user?.name, fetchLogs]);

  // ✅ NOW check user validity AFTER hooks
  if (!user || !user.name) {
    return (
      <div className="fallback-container">
        <div className="fallback-icon">🚫</div>
        <p className="fallback-message">
          Session expired or invalid user data
        </p>
        <button className="fallback-btn" onClick={() => navigate("/")}>
          Return to Login
        </button>
      </div>
    );
  }

  const handleBack = () => {
    if (onBack) onBack();
    else navigate("/");
  };

  // Helper function to get status icon
  const getStatusIcon = (status) => {
    if (status.includes("Grant") || status.includes("Approve") || status.includes("Success")) {
      return <FaCheckCircle className="status-icon granted-icon" />;
    } else if (status.includes("Deny") || status.includes("Flag") || status.includes("Denied")) {
      return <FaTimesCircle className="status-icon denied-icon" />;
    }
    return <FaCircle className="status-icon pending-icon" />;
  };

  // Helper function to get access type badge color
  const getAccessTypeBadge = (accessType) => {
    if (accessType.includes("Emergency")) return "emergency";
    if (accessType.includes("Normal")) return "normal";
    if (accessType.includes("Restricted")) return "restricted";
    if (accessType.includes("Temporary")) return "temporary";
    return "default";
  };

  return (
    <div className="patient-dashboard">
      {/* ✅ Enhanced Header */}
      <header className="patient-header">
        <div className="header-content">
          <div className="header-info">
            <h1 className="welcome-text">👋 Welcome, {user.name}</h1>
            <p className="subtext">
              Your secure medical data access history is shown below
            </p>
          </div>
          <button className="logout-button" onClick={handleBack}  title="Logout">
            Logout
          </button>
        </div>
      </header>

      {/* ✅ Stats Bar */}
      <section className="stats-bar">
        <div className="stat-item">
          <div className="stat-icon access-icon">
            <FaHistory />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Access Records</span>
            <span className="stat-value">{logs.length}</span>
          </div>
        </div>
        <div className="stat-item">
          <div className="stat-icon granted-icon">
            <FaCheckCircle />
          </div>
          <div className="stat-content">
            <span className="stat-label">Authorized Access</span>
            <span className="stat-value">
              {logs.filter(l => l.status.includes("Grant") || l.status.includes("Approve") || l.status.includes("Success")).length}
            </span>
          </div>
        </div>
        <div className="stat-item">
          <div className="stat-icon">
            <FaShieldAlt />
          </div>
          <div className="stat-content">
            <span className="stat-label">Data Privacy</span>
            <span className="stat-value">Protected</span>
          </div>
        </div>
      </section>

      {/* ✅ Logs Section */}
      {/* ✅ Logs Section */}
      <section className="logs-section">
        <div className="section-header">
          <div className="section-title">
            <FaHistory className="section-icon" />
            <span>Access History Log</span>
          </div>
          <button 
            className="refresh-button" 
            onClick={fetchLogs}
            disabled={loading}
            title="Refresh access logs"
          >
            <FaSync className={loading ? "spinning" : ""} />
          </button>
        </div>

        {loading && (
          <div className="fallback-container" style={{ minHeight: "40vh" }}>
            <div className="loader">
              <div className="spinner"></div>
            </div>
            <p className="fallback-message">Loading your secure logs...</p>
          </div>
        )}

        {error && (
          <div className="fallback-container error-state" style={{ minHeight: "40vh" }}>
            <div className="fallback-icon" style={{ fontSize: "3rem" }}>⚠️</div>
            <p className="fallback-message" style={{ color: "#ef4444" }}>
              {error}
            </p>
            <button className="fallback-btn retry-btn" onClick={fetchLogs}>
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="access-log-container">
            {logs.length > 0 ? (
              logs.map((log, idx) => (
                <div key={idx} className="access-log-card">
                  {/* Card Header */}
                  <div className="log-card-header">
                    <div className="log-user-info">
                      <div className="user-avatar">
                        <FaUserMd />
                      </div>
                      <div>
                        <h3 className="log-doctor-name">{log.doctor}</h3>
                        <span className="log-role">{log.role}</span>
                      </div>
                    </div>
                    <div className={`access-badge ${getAccessTypeBadge(log.accessType)}`}>
                      {log.accessType.replace("Access", "").trim() || "Data Access"}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="log-card-body">
                    {/* Status */}
                    <div className="log-item">
                      <div className="log-item-label">
                        <span className="log-icon">{getStatusIcon(log.status)}</span>
                        <span>Status</span>
                      </div>
                      <div className={`log-item-value status-${log.status.includes("Grant") || log.status.includes("Approve") || log.status.includes("Success") ? "approved" : log.status.includes("Deny") || log.status.includes("Flag") || log.status.includes("Denied") ? "denied" : "pending"}`}>
                        {log.status}
                      </div>
                    </div>

                    {/* Access Type */}
                    <div className="log-item">
                      <div className="log-item-label">
                        <span className="log-icon"><FaFileAlt /></span>
                        <span>Access Type</span>
                      </div>
                      <div className="log-item-value">{log.accessType}</div>
                    </div>

                    {/* Justification */}
                    {log.justification && log.justification !== "Routine Checkup" && (
                      <div className="log-item">
                        <div className="log-item-label">
                          <span className="log-icon"><FaNotesMedical /></span>
                          <span>Reason</span>
                        </div>
                        <div className="log-item-value justification-text">
                          "{log.justification}"
                        </div>
                      </div>
                    )}

                    {/* Timestamp */}
                    <div className="log-item">
                      <div className="log-item-label">
                        <span className="log-icon"><FaClock /></span>
                        <span>Time</span>
                      </div>
                      <div className="log-item-value timestamp">
                        {new Date(log.timestamp).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: true
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="log-card-footer">
                    <span className="source-badge">{log.source === "doctor" ? "📋 Doctor Log" : "🔐 System Log"}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="fallback-container empty-state" style={{ minHeight: "40vh", gridColumn: "1/-1" }}>
                <div className="fallback-icon" style={{ fontSize: "3rem" }}>📭</div>
                <p className="fallback-message">No access logs found</p>
                <p style={{ color: "#64748b", marginTop: "10px" }}>
                  Your medical data hasn't been accessed yet. Your privacy is protected! 🔒
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ✅ Footer Info */}
      <footer className="patient-footer">
        <p>
          🔒 All access to your medical data is logged and secured. 
          Only authorized healthcare providers can access your information.
        </p>
      </footer>
    </div>
  );
};

export default PatientDashboard;
