
import React, { useState } from "react";
import { FaSync, FaFileCsv } from "react-icons/fa";
import DateFilter from "../DateFilter";
import Pagination from "./Pagination";

const SystemLogs = ({ logs, fetchLogs, loading }) => {
  const [filterDates, setFilterDates] = useState({ startDate: "", endDate: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const handleFilterChange = (dates) => {
    setFilterDates(dates);
    setCurrentPage(1); // Reset to first page on filter
  };

  const handleClearFilter = () => {
    setFilterDates({ startDate: "", endDate: "" });
    setCurrentPage(1);
  };

  const filteredLogs = logs.filter((log) => {
    if (!filterDates.startDate || !filterDates.endDate) return true;
    const logDate = log.timestamp ? log.timestamp.split(" ")[0] : "";
    return logDate >= filterDates.startDate && logDate <= filterDates.endDate;
  });

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);

  // Helper for status badges
  const getStatusBadge = (status) => {
    const s = status?.toLowerCase() || "";
    if (s.includes("grant") || s.includes("approv") || s.includes("succ")) {
      return <span className="role-badge bg-green-soft">Granted</span>;
    }
    if (s.includes("den") || s.includes("fail") || s.includes("rej")) {
      return <span className="role-badge bg-red-soft">Denied</span>;
    }
    if (s.includes("block")) {
        return <span className="role-badge bg-red-soft">Blocked</span>; // Handle explicit blocks
    }
    if (s.includes("resolv")) {
        return <span className="role-badge bg-green-soft">Resolved</span>; // New Resolved State
    }
    if (s.includes("dismiss")) {
        return <span className="role-badge" style={{ background: '#e2e8f0', color: '#64748b' }}>Dismissed</span>; // New Dismissed State
    }
    if (s.includes("flag")) {
        return <span className="role-badge bg-yellow-soft">Flagged</span>;
    }
    return <span className="role-badge bg-blue-soft">{status || "Info"}</span>;
  };

  // Export to CSV
  const exportToCSV = () => {
    if (filteredLogs.length === 0) return;

    const headers = ["Timestamp", "User Identity", "Role", "Action Details", "Target Patient", "Outcome"];
    const csvRows = [headers.join(",")];

    filteredLogs.forEach(log => {
      const row = [
        `"${log.timestamp || ""}"`,
        `"${log.doctor_name || ""}"`,
        `"${log.doctor_role || ""}"`,
        `"${log.action || ""}"`,
        `"${log.patient_name || ""}"`,
        `"${log.status || ""}"`
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `system_logs_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Table Skeleton
  const renderSkeleton = () => {
    return Array(5).fill(0).map((_, i) => (
      <tr key={i} className="animate-pulse">
        <td><div className="h-4 bg-slate-200 rounded w-24"></div></td>
        <td><div className="h-4 bg-slate-200 rounded w-32"></div></td>
        <td><div className="h-4 bg-slate-200 rounded w-24"></div></td>
        <td><div className="h-4 bg-slate-200 rounded w-48"></div></td>
        <td><div className="h-4 bg-slate-200 rounded w-32"></div></td>
        <td><div className="h-6 bg-slate-200 rounded w-24"></div></td>
      </tr>
    ));
  };

  return (
    <section className="admin-section">
      <div className="admin-section-header">
        <h2>📊 Overall System Logs</h2>
        <div className="flex-align-center gap-2">
             <DateFilter onFilterChange={handleFilterChange} onClear={handleClearFilter} compact />
            <button className="med-btn med-btn-secondary med-btn-sm" onClick={exportToCSV} title="Export to CSV">
              <FaFileCsv /> <span>Export</span>
            </button>
            <button 
              className="med-btn med-btn-primary med-btn-sm" 
              onClick={() => fetchLogs(true)} 
              disabled={loading}
            >
              <FaSync className={loading ? "spin-animate" : ""} /> <span>{loading ? "Refreshing..." : "Refresh"}</span>
            </button>
        </div>
      </div>

      <div className="admin-content-area no-padding-bottom">
        <p className="section-description no-padding mb-2">
            Comprehensive audit trail of all system access attempts and security events.
        </p>
      </div>

      <div className="admin-table-wrapper no-top-border">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User Identity</th>
              <th>Role</th>
              <th>Action Details</th>
              <th>Target Patient</th>
              <th>Outcome</th>
            </tr>
          </thead>
          <tbody>
            {loading && logs.length === 0 ? (
                renderSkeleton()
            ) : currentLogs.length > 0 ? (
              currentLogs.map((log, idx) => (
                <tr key={idx}>
                  <td className="text-mono">
                    {log.timestamp || "—"}
                  </td>
                  <td className="user-name">{log.doctor_name || "—"}</td>
                  <td>
                    <span className={`role-badge role-${(log.doctor_role || "user").toLowerCase()}`}>
                      {log.doctor_role || "User"}
                    </span>
                  </td>
                  <td>{log.action || "—"}</td>
                  <td>{log.patient_name || "—"}</td>
                  <td>
                    {getStatusBadge(log.status)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6">
                  <div className="empty-state">
                    <span className="empty-state-icon">📊</span>
                    <span>No logs found for the selected period</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {!loading && filteredLogs.length > 0 && (
        <Pagination 
          currentPage={currentPage}
          totalItems={filteredLogs.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      )}
    </section>
  );
};

export default SystemLogs;
