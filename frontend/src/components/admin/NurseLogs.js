import React, { useState } from "react";
import { FaSync } from "react-icons/fa";
import DateFilter from "../DateFilter";

const NurseLogs = ({ logs, fetchLogs }) => {
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
        <h2>🧑‍⚕️ Nurse Activity Logs (NurseAccessLog collection)</h2>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <DateFilter onFilterChange={handleFilterChange} onClear={handleClearFilter} compact />
            <button className="btn btn-blue btn-sm" onClick={fetchLogs}>
              <FaSync /> Refresh
            </button>
        </div>
      </div>

      <p className="section-description">
        Nurse-specific activities and patient interactions
      </p>

      <div className="log-table-wrapper">
        <table className="log-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Nurse</th>
              <th>Patient</th>
              <th>Action</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length > 0 ? (
              filteredLogs.slice(0, 100).map((log, idx) => (
                <tr key={idx}>
                  <td>{log.timestamp || "—"}</td>
                  <td>{log.nurse_name || "—"}</td>
                  <td>{log.patient_name || "—"}</td>
                  <td>{log.action || "—"}</td>
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
                  colSpan="5"
                  style={{
                    textAlign: "center",
                    color: "#64748b",
                    padding: "2rem",
                  }}
                >
                  No nurse activity logs found for this period
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default NurseLogs;
