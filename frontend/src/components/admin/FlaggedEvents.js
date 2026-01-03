
import React, { useState } from "react";
import axios from "axios";
import { API_URL } from "../../api";
import { FaSync, FaExclamationTriangle, FaCheck, FaTimes } from "react-icons/fa";
import DateFilter from "../DateFilter";
import Pagination from "./Pagination";

const FlaggedEvents = ({ logs, fetchLogs, loading }) => {
  const [filterDates, setFilterDates] = useState({ startDate: "", endDate: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [processingId, setProcessingId] = useState(null);
  const itemsPerPage = 15;

  const handleFilterChange = (dates) => {
    setFilterDates(dates);
    setCurrentPage(1);
  };

  const handleClearFilter = () => {
    setFilterDates({ startDate: "", endDate: "" });
    setCurrentPage(1);
  };

  // ✅ Filter Logic: Just show Denied OR Flagged logs (exclude 'Reviewed'/'Resolved')
  const flaggedLogs = logs.filter((log) => {
    const status = (log.status || "").toLowerCase();
    
    // Exclude already handled events
    if (status.includes("reviewed") || status.includes("resolved") || status.includes("dismissed")) {
        return false;
    }

    const isFlagged = status.includes("denied") || status.includes("flagged") || status.includes("fail") || status.includes("alert");
    
    if (!isFlagged) return false;

    if (!filterDates.startDate || !filterDates.endDate) return true;
    const logDate = log.timestamp ? log.timestamp.split(" ")[0] : "";
    return logDate >= filterDates.startDate && logDate <= filterDates.endDate;
  });

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLogs = flaggedLogs.slice(indexOfFirstItem, indexOfLastItem);

  // Helper for status badges
  const getStatusBadge = (status) => {
    const s = status?.toLowerCase() || "";
    if (s.includes("den") || s.includes("fail") || s.includes("rej")) {
      return <span className="role-badge bg-red-soft"><FaTimes className="mr-1"/> Denied</span>;
    }
    return <span className="role-badge bg-yellow-soft"><FaExclamationTriangle className="mr-1"/> Flagged</span>;
  };

  // ✅ Handle Status Update
  const updateStatus = async (logId, newStatus) => {
    if (!logId) return;
    try {
        setProcessingId(logId);
        const token = localStorage.getItem("adminToken");
        await axios.post(
            `${API_URL}/update_log_status`,
            { log_id: logId, status: newStatus },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        // Refresh logs to remove the item from the list
        await fetchLogs(true);
    } catch (error) {
        console.error("Error updating log status:", error);
        alert("Failed to update status. Please try again.");
    } finally {
        setProcessingId(null);
    }
  };

  // Table Skeleton
  const renderSkeleton = () => {
    return Array(5).fill(0).map((_, i) => (
      <tr key={i} className="animate-pulse">
        <td><div className="h-4 bg-slate-200 rounded w-24"></div></td>
        <td><div className="h-4 bg-slate-200 rounded w-32"></div></td>
        <td><div className="h-4 bg-slate-200 rounded w-24"></div></td>
        <td><div className="h-4 bg-slate-200 rounded w-48"></div></td>
        <td><div className="h-6 bg-slate-200 rounded w-24"></div></td>
        <td><div className="h-8 bg-slate-200 rounded w-32"></div></td>
      </tr>
    ));
  };

  return (
    <section className="admin-section">
      <div className="admin-section-header">
        <h2 className="text-red-600">🚩 Flagged Security Events</h2>
        <div className="flex-align-center gap-2">
             <DateFilter onFilterChange={handleFilterChange} onClear={handleClearFilter} compact />
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
        <div className="alert-box warning mb-2">
            <FaExclamationTriangle className="alert-icon"/>
            <p><strong>Action Required:</strong> Review these high-priority security exceptions. Mark them as <strong>Resolved</strong> (issue fixed/verified) or <strong>Dismissed</strong> (false alarm).</p>
        </div>
      </div>

      <div className="admin-table-wrapper no-top-border">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User Identity</th>
              <th>Role</th>
              <th>Action Details</th>
              <th>Reason / Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && logs.length === 0 ? (
                renderSkeleton()
            ) : currentLogs.length > 0 ? (
              currentLogs.map((log) => (
                <tr key={log.id} className="row-flagged">
                  <td className="text-mono">
                    {log.timestamp || "—"}
                  </td>
                  <td className="user-name sub-strong">{log.doctor_name || "—"}</td>
                  <td>
                    <span className={`role-badge role-${(log.doctor_role || "user").toLowerCase()}`}>
                      {log.doctor_role || "User"}
                    </span>
                  </td>
                  <td>{log.action || "—"}</td>
                  <td>
                    {getStatusBadge(log.status)}
                  </td>
                  <td>
                    <div className="flex gap-2">
                        <button 
                            className="med-btn med-btn-success med-btn-xs"
                            onClick={() => updateStatus(log.id, "Resolved")}
                            disabled={processingId === log.id}
                        >
                            {processingId === log.id ? "..." : <><FaCheck /> Resolve</>}
                        </button>
                        <button 
                            className="med-btn med-btn-outline-danger med-btn-xs"
                            onClick={() => updateStatus(log.id, "Dismissed")}
                            disabled={processingId === log.id}
                        >
                            <FaTimes /> Dismiss
                        </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6">
                  <div className="empty-state">
                    <span className="empty-state-icon text-green-500">🛡️</span>
                    <span>No flagged security events found. System is secure.</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {!loading && flaggedLogs.length > 0 && (
        <Pagination 
          currentPage={currentPage}
          totalItems={flaggedLogs.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      )}
    </section>
  );
};

export default FlaggedEvents;
