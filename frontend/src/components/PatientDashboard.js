import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../css/Patient.css"; // ✅ Use Patient.css (not PatientDashboard.css)
import "../css/Notifications.css"; // ✅ Toast notifications
import {
  FaUserMd,
  FaClock,
  FaNotesMedical,
  FaFileAlt,
  FaArrowLeft,
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
      // ✅ NEW: Use dedicated patient access history endpoint
      const res = await axios.get(
        `http://localhost:5000/patient_access_history/${user.name}`
      );
      if (res.data.success) {
        const normalizedLogs = res.data.logs.map((log) => ({
          doctor: log.doctor_name || "Unknown Doctor",
          accessType: log.action || "Access",
          status: log.status || "N/A",
          timestamp: log.timestamp || "—",
        }));
        setLogs(normalizedLogs);
      }
    } catch (error) {
      console.error("Error fetching access logs:", error);
      setError("Failed to load access history. Please try again later.");
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
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          gap: "1rem",
        }}
      >
        <p style={{ fontSize: "1.2rem", color: "#ef4444" }}>
          ❌ Session expired or invalid user data
        </p>
        <button
          onClick={() => navigate("/")}
          style={{
            padding: "0.75rem 1.5rem",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "0.5rem",
            cursor: "pointer",
            fontSize: "1rem",
          }}
        >
          Return to Login
        </button>
      </div>
    );
  }

  const handleBack = () => {
    if (onBack) onBack();
    else navigate("/");
  };

  return (
    <div className="patient-dashboard">
      <header className="patient-header">
        <button className="back-button" onClick={handleBack}>
          <FaArrowLeft className="back-icon" />
          Back
        </button>
        <h1 className="welcome-text">Welcome, {user.name}</h1>
        <p className="subtext">Your secure health data access history</p>
      </header>

      <section className="logs-section">
        <h2 className="section-title">Access Logs</h2>

        {loading && (
          <div
            style={{
              textAlign: "center",
              padding: "2rem",
              color: "#64748b",
            }}
          >
            Loading access logs...
          </div>
        )}

        {error && (
          <div
            style={{
              textAlign: "center",
              padding: "2rem",
              color: "#ef4444",
            }}
          >
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="access-log-container">
            {logs.length > 0 ? (
              logs.map((log, idx) => (
                <div key={idx} className="access-log-card">
                  <div className="log-header">
                    <FaUserMd className="log-icon" />
                    <h3 className="log-title">{log.doctor}</h3>
                  </div>

                  <div className="log-body">
                    <p>
                      <FaFileAlt className="log-detail-icon" />
                      <strong>Access Type:</strong> {log.accessType}
                    </p>
                    <p>
                      <FaNotesMedical className="log-detail-icon" />
                      <strong>Reason:</strong> {log.justification}
                    </p>
                    <p>
                      <FaClock className="log-detail-icon" />
                      <strong>Time:</strong> {log.timestamp}
                    </p>
                    <p>
                      <FaNotesMedical className="log-detail-icon" />
                      <strong>Status:</strong>{" "}
                      <span
                        className={`status-tag ${
                          log.status.includes("Grant") ||
                          log.status.includes("Approve")
                            ? "granted"
                            : log.status.includes("Deny") ||
                              log.status.includes("Flag")
                            ? "denied"
                            : "neutral"
                        }`}
                      >
                        {log.status}
                      </span>
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-logs">
                <p>No access logs available yet.</p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default PatientDashboard;
