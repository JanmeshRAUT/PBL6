import React, { useState } from "react";
import { FaSync } from "react-icons/fa";
import DateFilter from "../DateFilter";

const SystemLogs = ({ logs, fetchLogs }) => {
  const [filterDates, setFilterDates] = useState({ startDate: "", endDate: "" });

  const handleFilterChange = (dates) => {
    setFilterDates(dates);
  };

  const handleClearFilter = () => {
    setFilterDates({ startDate: "", endDate: "" });
  };

  const filteredLogs = logs.filter((log) => {
    if (!filterDates.startDate || !filterDates.endDate) return true;
    const logDate = log.timestamp ? log.timestamp.split(" ")[0] : "";
    return logDate >= filterDates.startDate && logDate <= filterDates.endDate;
  });

  return (
    <section className="ehr-section">
      <div className="section-header">
        <h2>📊 Overall System Logs (access_logs collection)</h2>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
             <DateFilter onFilterChange={handleFilterChange} onClear={handleClearFilter} compact />
            <button className="btn btn-blue btn-sm" onClick={fetchLogs}>
              <FaSync /> Refresh
            </button>
        </div>
      </div>

      <p className="section-description">
        All system-wide access attempts, logins, and activities
      </p>

      <div className="log-table-wrapper">
        <table className="log-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Role</th>
              <th>Action</th>
              <th>Patient</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length > 0 ? (
              filteredLogs.slice(0, 100).map((log, idx) => (
                <tr key={idx}>
                  <td>{log.timestamp || "—"}</td>
                  <td>{log.doctor_name || "—"}</td>
                  <td>
                    <span
                      className={`role-badge role-${log.doctor_role || "user"}`}
                    >
                      {log.doctor_role || "—"}
                    </span>
                  </td>
                  <td>{log.action || "—"}</td>
                  <td>{log.patient_name || "—"}</td>
                  <td
                    className={
                      log.status === "Granted" || log.status === "Approved"
                        ? "status-granted"
                        : log.status === "Denied"
                        ? "status-denied"
                        : "status-info"
                    }
                  >
                    {log.status || "—"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="6"
                  style={{
                    textAlign: "center",
                    color: "#64748b",
                    padding: "2rem",
                  }}
                >
                  No system logs found for this period
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default SystemLogs;
