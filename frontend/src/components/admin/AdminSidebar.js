import React from "react";
import {
  FaShieldAlt,
  FaUsers,
  FaChartBar,
  FaSignOutAlt,
  FaUserPlus,
  FaClock,
  FaDownload,
  FaLock,
  FaUserNurse,
  FaExclamationTriangle,
} from "react-icons/fa";

const AdminSidebar = ({ activeTab, setActiveTab, usersCount, onLogout }) => {
  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-header">
        <FaShieldAlt className="admin-logo" />
        <h2>MedTrust EHR</h2>
      </div>

      <nav className="admin-nav">
        <ul>
          <li
            className={activeTab === "userManagement" ? "active" : ""}
            onClick={() => setActiveTab("userManagement")}
            title="Register and assign roles to users"
          >
            <FaUserPlus /> User Management
          </li>

          <li
            className={activeTab === "users" ? "active" : ""}
            onClick={() => setActiveTab("users")}
            title="View all registered users"
          >
            <FaUsers /> Users ({usersCount})
          </li>
          <li
            className={activeTab === "patients" ? "active" : ""}
            onClick={() => setActiveTab("patients")}
            title="Manage patient records"
          >
            <FaUsers /> Patients
          </li>
          <li
            className={activeTab === "systemLogs" ? "active" : ""}
            onClick={() => setActiveTab("systemLogs")}
            title="View overall system access logs"
          >
            <FaClock /> System Logs
          </li>
          <li
            className={activeTab === "doctorLogs" ? "active" : ""}
            onClick={() => setActiveTab("doctorLogs")}
            title="View doctor activity logs"
          >
            <FaClock /> Doctor Activity
          </li>
          <li
            className={activeTab === "nurseLogs" ? "active" : ""}
            onClick={() => setActiveTab("nurseLogs")}
            title="View nurse activity logs"
          >
            <FaUserNurse /> Nurse Activity
          </li>
          <li
            className={activeTab === "analytics" ? "active" : ""}
            onClick={() => setActiveTab("analytics")}
            title="View system analytics and charts"
          >
            <FaChartBar /> Analytics
          </li>
          <li
            className={activeTab === "reports" ? "active" : ""}
            onClick={() => setActiveTab("reports")}
            title="Export system reports"
          >
            <FaDownload /> Reports
          </li>
          <li
            className={activeTab === "permissions" ? "active" : ""}
            onClick={() => setActiveTab("permissions")}
            title="Manage role permissions"
          >
            <FaLock /> Permissions
          </li>
          <li
            className={activeTab === "flagged" ? "active" : ""}
            onClick={() => setActiveTab("flagged")}
            title="Review flagged security events"
          >
            <FaExclamationTriangle /> Flag Review
          </li>
        </ul>
      </nav>

      <div className="admin-sidebar-footer">
        <button className="logout-btn" onClick={onLogout}>
          <FaSignOutAlt /> Logout
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
