import React from "react";
import {
  FaClipboardList,
  FaSpinner,
  FaSync,
  FaLockOpen,
  FaUserInjured,
  FaCheckCircle,
  FaExclamationTriangle,
} from "react-icons/fa";
import "../../css/NurseAccessLogsTab.css";

const NurseAccessLogsTab = ({ logs, loading, fetchAccessLogs }) => {
  return (
    <div className="logs-content-wrapper">
      {/* Header */}
      <div className="logs-tab-header">
        <div className="logs-header-group">
          <div className="logs-header-icon">
            <FaClipboardList />
          </div>
          <div className="logs-header-title">
            <h2>Access History</h2>
            <p>View history of your patient data access requests and activities</p>
          </div>
        </div>
        {fetchAccessLogs && (
          <button
            className="btn btn-outline btn-sm btn-refresh-logs"
            onClick={fetchAccessLogs}
            disabled={loading}
          >
            {loading ? (
              <FaSpinner className="spin-icon" />
            ) : (
              <FaSync />
            )}
            Refresh
          </button>
        )}
      </div>

      {/* Content Area */}
      <div className="logs-table-container">
        {loading ? (
          <div className="logs-loading">
            <FaSpinner className="spin-icon large-spinner" />
            <p>Retrieving access records...</p>
          </div>
        ) : logs.length > 0 ? (
          <div className="logs-scroll-area">
            <table className="logs-table">
              <thead>
                <tr>
                  <th className="th-timestamp">Timestamp</th>
                  <th className="th-action">Action / Type</th>
                  <th className="th-patient">Patient Reference</th>
                  <th className="th-status">Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, idx) => (
                  <tr key={idx}>
                    <td>
                      <div className="log-date">
                        {new Date(log.timestamp).toLocaleDateString()}
                      </div>
                      <div className="log-time">
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>
                    <td>
                      <div className="log-action-cell">
                        {log.action?.toLowerCase().includes("access") ? (
                          <FaLockOpen className="icon-blue" />
                        ) : (
                          <FaClipboardList className="icon-gray" />
                        )}
                        {log.action || log.type || "System Action"}
                      </div>
                    </td>
                    <td>
                      {log.patient_name && log.patient_name !== "N/A" ? (
                        <div className="log-patient-cell">
                          <div className="patient-icon-circle">
                            <FaUserInjured />
                          </div>
                          <span className="patient-name-text">
                            {log.patient_name}
                          </span>
                        </div>
                      ) : (
                        <span className="no-patient-text">-</span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`status-badge ${
                          log.status === "Granted" ||
                          log.status === "Approved" ||
                          log.status === "Success" ||
                          log.status === "Authorized"
                            ? "success"
                            : log.status === "Denied" || log.status === "Failed"
                            ? "error"
                            : "neutral"
                        }`}
                      >
                        {log.status === "Granted" ||
                        log.status === "Approved" ||
                        log.status === "Success" ||
                        log.status === "Authorized" ? (
                          <FaCheckCircle className="badge-icon" />
                        ) : log.status === "Denied" ||
                          log.status === "Failed" ? (
                          <FaExclamationTriangle className="badge-icon" />
                        ) : null}
                        {log.status || "Unknown"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="logs-empty">
            <div className="empty-logs-icon">
              <FaClipboardList />
            </div>
            <h3>No Activity Logs Found</h3>
            <p>
              Your access history will appear here once you interact with patient
              records.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NurseAccessLogsTab;
