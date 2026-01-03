import React, { useState } from "react";
import { FaDownload, FaFileExcel} from "react-icons/fa";
import Pagination from "./admin/Pagination";
import "../css/ReportExport.css";

const ReportExport = ({ data }) => {
  const [exportFormat, setExportFormat] = useState("csv");
  const [dateRange, setDateRange] = useState("all");
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Pagination Logic
  const logs = data.logs || [];
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLogs = logs.slice(indexOfFirstItem, indexOfLastItem);

  // ✅ Export to CSV
  const handleExportCSV = () => {
    setLoading(true);
    try {
      const logs = data.logs || [];
      const headers = [
        "Timestamp",
        "Doctor Name",
        "Doctor Role",
        "Patient Name",
        "Action",
        "Status",
      ];

      let csvContent =
        "data:text/csv;charset=utf-8," +
        headers.join(",") +
        "\n";

      logs.forEach((log) => {
        const row = [
          log.timestamp || "—",
          log.doctor_name || "—",
          log.doctor_role || "—",
          log.patient_name || "—",
          log.action || "—",
          log.status || "—",
        ];
        csvContent += row.map((cell) => `"${cell}"`).join(",") + "\n";
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `access_logs_${new Date().toISOString().split("T")[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert("✅ CSV exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      alert("❌ Error exporting CSV");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Export to JSON
  const handleExportJSON = () => {
    setLoading(true);
    try {
      const reportData = {
        exportDate: new Date().toISOString(),
        totalLogs: data.logs?.length || 0,
        totalUsers: data.users?.length || 0,
        logs: data.logs || [],
        users: data.users || [],
        summary: {
          grantedAccess: (data.logs || []).filter(
            (l) => l.status === "Granted" || l.status === "Approved"
          ).length,
          deniedAccess: (data.logs || []).filter((l) => l.status === "Denied")
            .length,
          flaggedAccess: (data.logs || []).filter((l) => l.status === "Flagged")
            .length,
        },
      };

      const jsonString = JSON.stringify(reportData, null, 2);
      const element = document.createElement("a");
      element.setAttribute(
        "href",
        "data:text/plain;charset=utf-8," + encodeURIComponent(jsonString)
      );
      element.setAttribute(
        "download",
        `system_report_${new Date().toISOString().split("T")[0]}.json`
      );
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);

      alert("✅ JSON report exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      alert("❌ Error exporting JSON");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Generate Summary Statistics
  const generateSummary = () => {
    const logs = data.logs || [];
    return {
      totalAccessAttempts: logs.length,
      grantedAccess: logs.filter(
        (l) => l.status === "Granted" || l.status === "Approved"
      ).length,
      deniedAccess: logs.filter((l) => l.status === "Denied").length,
      flaggedAccess: logs.filter((l) => l.status === "Flagged").length,
      totalUsers: data.users?.length || 0,
      successRate:
        logs.length > 0
          ? (
              ((logs.filter(
                (l) => l.status === "Granted" || l.status === "Approved"
              ).length /
                logs.length) *
                100) |
              0
            ).toFixed(1)
          : 0,
    };
  };

  const summary = generateSummary();

  return (
    <div className="report-export-container">
      {/* ============== SUMMARY STATS ============== */}
      <div className="summary-cards">
        <div className="summary-card">
          <h4>📊 Total Access Attempts</h4>
          <p className="stat-value">{summary.totalAccessAttempts}</p>
        </div>
        <div className="summary-card success">
          <h4>✅ Granted Access</h4>
          <p className="stat-value">{summary.grantedAccess}</p>
        </div>
        <div className="summary-card danger">
          <h4>❌ Denied Access</h4>
          <p className="stat-value">{summary.deniedAccess}</p>
        </div>
        <div className="summary-card warning">
          <h4>⚠️ Flagged Access</h4>
          <p className="stat-value">{summary.flaggedAccess}</p>
        </div>
        <div className="summary-card info">
          <h4>👥 Total Users</h4>
          <p className="stat-value">{summary.totalUsers}</p>
        </div>
        <div className="summary-card highlight">
          <h4>📈 Success Rate</h4>
          <p className="stat-value">{summary.successRate}%</p>
        </div>
      </div>

      {/* ============== EXPORT OPTIONS ============== */}
      <div className="export-options">
        <h3>📥 Export Report</h3>

        <div className="export-toolbar">
            <div className="export-controls">
              <div className="control-group">
                <label>Format:</label>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value)}
                  className="select-control"
                >
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                </select>
              </div>

              <div className="control-group">
                <label>Date Range:</label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="select-control"
                >
                  <option value="all">All Data</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                </select>
              </div>
            </div>

            <div className="export-buttons">
              <button
                className="btn btn-csv"
                onClick={handleExportCSV}
                disabled={loading}
              >
                <FaFileExcel /> {loading ? "Exporting..." : "Export as CSV"}
              </button>
              <button
                className="btn btn-json"
                onClick={handleExportJSON}
                disabled={loading}
              >
                <FaDownload /> {loading ? "Exporting..." : "Export as JSON"}
              </button>
            </div>
        </div>
      </div>

      {/* ============== LOGS PREVIEW WITH PAGINATION ============== */}
      <div className="logs-preview">
        <div className="chart-header" style={{ marginBottom: '1rem', borderBottom: 'none' }}>
            <h3>📋 System Log Preview</h3>
        </div>
        <div className="logs-table-wrapper">
          <table className="preview-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Doctor</th>
                <th>Patient</th>
                <th>Action</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {currentLogs.length > 0 ? (
                currentLogs.map((log, idx) => (
                  <tr key={idx}>
                    <td>{log.timestamp || "—"}</td>
                    <td>{log.doctor_name || "—"}</td>
                    <td>{log.patient_name || "—"}</td>
                    <td>{log.action || "—"}</td>
                    <td
                      className={
                        log.status === "Granted" || log.status === "Approved"
                          ? "status-granted"
                          : log.status === "Denied"
                          ? "status-denied"
                          : "status-flagged"
                      }
                    >
                      {log.status || "—"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                    <td colSpan="5" style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
                        No logs available for preview.
                    </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {logs.length > 0 && (
            <Pagination 
                currentPage={currentPage}
                totalItems={logs.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
            />
        )}
      </div>
    </div>
  );
};

export default ReportExport;
