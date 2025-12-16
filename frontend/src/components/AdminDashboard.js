import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API_URL } from "../api";
import { useNavigate } from "react-router-dom";
import {
  FaShieldAlt,
  FaUsers,
  FaChartBar,
  FaSignOutAlt,
  FaUserPlus,
  FaEdit,
  FaSearch,
  FaClock,
  FaCheckCircle,
  FaDownload,
  FaLock,
  FaSync,
  FaTimes,
  FaUserNurse, // ✅ NEW
} from "react-icons/fa";
import AnalyticsCharts from "./AnalyticsCharts";
import NotificationCenter from "./NotificationCenter";
import ReportExport from "./ReportExport";
import PermissionsEditor from "./PermissionsEditor";
import "../css/AdminDashboard.css";
import "../css/Notifications.css"; // ✅ ADD THIS

const AdminDashboard = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("users");
  
  // ✅ THREE SEPARATE COLLECTIONS
  const [users, setUsers] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);
  const [doctorLogs, setDoctorLogs] = useState([]);  // From 'DoctorAccessLog'
  const [nurseLogs, setNurseLogs] = useState([]);    // ✅ NEW: From 'NurseAccessLog'
  const [patients, setPatients] = useState([]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [newUser, setNewUser] = useState({ 
    name: "", 
    email: "", 
    role: "",
    age: "",      // ✅ ADD
    gender: "Male" // ✅ ADD
  });
  const [editingUser, setEditingUser] = useState(null);

  // ✅ Fetch Users (from 'users' collection for role-based auth)
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      console.log("📤 Fetching users from /get_all_users endpoint...");
      
      const res = await axios.get(`${API_URL}/get_all_users`);
      
      console.log("✅ Response received:", res.data);
      
      if (res.data.success) {
        console.log(`✅ Successfully fetched ${res.data.users?.length || 0} users`);
        setUsers(res.data.users || []);
      } else {
        console.error("❌ API returned success=false:", res.data);
        setUsers([]);
      }
    } catch (error) {
      console.error("❌ Error fetching users:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ Fetch OVERALL System Logs (from 'access_logs' collection)
  const fetchSystemLogs = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/access_logs/admin`);
      if (res.data.success) {
        setSystemLogs(res.data.logs || []);
        console.log(`✅ Fetched ${res.data.logs?.length || 0} system logs from access_logs`);
      }
    } catch (error) {
      console.error("❌ Error fetching system logs:", error);
      setSystemLogs([]);
    }
  }, []);

  // ✅ Fetch Doctor Activity Logs (from 'DoctorAccessLog' collection)
  const fetchDoctorLogs = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/all_doctor_access_logs`);
      if (res.data.success) {
        setDoctorLogs(res.data.logs || []);
        console.log(`✅ Fetched ${res.data.logs?.length || 0} doctor logs from DoctorAccessLog`);
      }
    } catch (error) {
      console.error("❌ Error fetching doctor logs:", error);
      setDoctorLogs([]);
    }
  }, []);

  // ✅ Fetch Nurse Activity Logs (from 'NurseAccessLog' collection)
  const fetchNurseLogs = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/all_nurse_access_logs`);
      if (res.data.success) {
        setNurseLogs(res.data.logs || []);
        console.log(`✅ Fetched ${res.data.logs?.length || 0} nurse logs from NurseAccessLog`);
      }
    } catch (error) {
      console.error("❌ Error fetching nurse logs:", error);
      setNurseLogs([]);
    }
  }, []);

  // ✅ Fetch All Patients (from 'patients' collection)
  const fetchPatients = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/all_patients`);
      if (res.data.success) {
        setPatients(res.data.patients || []);
        console.log(`✅ Fetched ${res.data.patients?.length || 0} patients`);
      }
    } catch (error) {
      console.error("❌ Error fetching patients:", error);
    }
  }, []);

  // ✅ UPDATED: Register/Assign Role to User
  const handleRegisterUser = async (e) => {
    e.preventDefault();
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.role) {
      alert("❌ All required fields must be filled!");
      return;
    }

    // ✅ Validate age/gender for patients
    if (newUser.role === "patient") {
      if (!newUser.age || newUser.age < 1) {
        alert("❌ Age is required for patients!");
        return;
      }
    }

    try {
      const res = await axios.post(`${API_URL}/register_user`, {
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        age: parseInt(newUser.age) || 0,      // ✅ ADD
        gender: newUser.gender || "Not specified" // ✅ ADD
      });

      if (res.data.success) {
        alert("✅ " + res.data.message);
        setNewUser({ name: "", email: "", role: "", age: "", gender: "Male" });
        fetchUsers();
        fetchPatients(); // ✅ Refresh patients list too
      }
    } catch (error) {
      alert(error.response?.data?.message || "❌ Error registering user");
    }
  };

  // ✅ ADD: Update User Role
  const handleUpdateUserRole = async (e, userEmail) => {
    e.preventDefault();
    if (!editingUser.name || !editingUser.role) {
      alert("❌ Name and role are required!");
      return;
    }

    try {
      // ✅ FIX: Call assign_role endpoint directly without token
      const res = await axios.post(`${API_URL}/assign_role`, {
        name: editingUser.name,
        email: userEmail,
        role: editingUser.role,
      });

      if (res.data.success) {
        alert("✅ " + res.data.message);
        setEditingUser(null);
        fetchUsers(); // ✅ Refresh users list
      } else {
        alert("❌ " + (res.data.error || "Failed to update role"));
      }
    } catch (error) {
      console.error("Update role error:", error);
      alert(
        error.response?.data?.message || 
        error.response?.data?.error ||
        "❌ Error updating user role"
      );
    }
  };

  // ✅ Lifecycle
  useEffect(() => {
    fetchUsers();
    fetchSystemLogs();
    fetchDoctorLogs();
    fetchNurseLogs(); // ✅ NEW
    fetchPatients();
  }, [fetchUsers, fetchSystemLogs, fetchDoctorLogs, fetchNurseLogs, fetchPatients]);

  // ✅ Filter users
  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ✅ Filter patients
  const filteredPatients = patients.filter(
    (p) =>
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ✅ Logout
  const handleLogout = () => {
    if (onLogout) onLogout();
    localStorage.clear();
    navigate("/");
  };

  return (
    <div className="ehr-layout">
      {/* Sidebar */}
      <aside className="ehr-sidebar">
        <div className="ehr-sidebar-header">
          <FaShieldAlt className="ehr-logo" />
          <h2>MedTrust EHR</h2>
        </div>

        <nav>
          <ul>
            {/* ✅ ADD: User Management Tab */}
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
              <FaUsers /> Users ({users.length})
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
              className={activeTab === "nurseLogs" ? "active" : ""} // ✅ NEW tab
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
          </ul>
        </nav>

        <div className="ehr-sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ehr-main">
        {/* Header with Notifications */}
        <header className="ehr-header">
          <div className="header-left">
            <h1>👨‍💼 Admin Dashboard</h1>
            <p className="user-role">System Administrator • {user?.name}</p>
          </div>
          <div className="header-right">
            <NotificationCenter />
          </div>
        </header>

        {/* ============== USER MANAGEMENT TAB (UPDATED) ============== */}
        {activeTab === "userManagement" && (
          <>
            {/* Register New User Form */}
            <section className="ehr-section">
              <h2>➕ Register New User & Assign Role</h2>
              <p className="section-description">
                Create new user accounts and assign roles (Doctor, Nurse, Patient, Admin)
              </p>

              <form
                className="register-form"
                style={{ width: "100%", maxWidth: "100%" }} // ✅ utilize full width
                onSubmit={handleRegisterUser}
              >
                <input
                  type="text"
                  placeholder="Full Name *"
                  value={newUser.name}
                  onChange={(e) =>
                    setNewUser({ ...newUser, name: e.target.value })
                  }
                  className="input"
                  required
                />
                <input
                  type="email"
                  placeholder="Email Address *"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                  className="input"
                  required
                />
                
                {/* ✅ NEW: Age and Gender fields (shown for all, required for patients) */}
                <div className="form-row-inline">
                  <input
                    type="number"
                    placeholder={newUser.role === "patient" ? "Age *" : "Age (optional)"}
                    value={newUser.age}
                    onChange={(e) =>
                      setNewUser({ ...newUser, age: e.target.value })
                    }
                    className="input"
                    min="1"
                    max="150"
                    required={newUser.role === "patient"}
                  />
                  <select
                    value={newUser.gender}
                    onChange={(e) =>
                      setNewUser({ ...newUser, gender: e.target.value })
                    }
                    className="input"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Not specified">Prefer not to say</option>
                  </select>
                </div>

                <select
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser({ ...newUser, role: e.target.value })
                  }
                  className="input"
                  required
                >
                  <option value="">-- Select Role * --</option>
                  <option value="doctor">Doctor</option>
                  <option value="nurse">Nurse</option>
                  <option value="patient">Patient</option>
                  <option value="admin">Admin</option>
                </select>
                
                <button type="submit" className="btn btn-blue">
                  <FaUserPlus /> Register User
                </button>
              </form>

              {/* ✅ UPDATED: Role info to mention age/gender requirement */}
              <div className="role-info">
                <h3>📋 Role Descriptions:</h3>
                <ul>
                  <li><strong>Doctor:</strong> Full access to patient records, can request emergency access</li>
                  <li><strong>Nurse:</strong> Limited access, temporary access only (30 mins)</li>
                  <li><strong>Patient:</strong> Can view their own access history (⚠️ Age & Gender required)</li>
                  <li><strong>Admin:</strong> System administration, user management, analytics</li>
                </ul>
              </div>
            </section>

            {/* Users List with Edit/Role Assignment */}
            <section className="ehr-section">
              <div className="section-header">
                <h2><FaUsers /> Registered Users</h2>
                <button
                  className="btn btn-blue btn-sm"
                  onClick={fetchUsers}
                  disabled={loading}
                >
                  <FaSync /> {loading ? "Loading..." : "Refresh"}
                </button>
              </div>

              <div className="search-box-wrapper">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>

              <div className="log-table-wrapper">
                <table className="log-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Trust Score</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((u, idx) => (
                        <tr key={idx}>
                          <td className="user-name">{u.name}</td>
                          <td>{u.email}</td>
                          <td>
                            <span className={`role-badge role-${u.role || "user"}`}>
                              {u.role || "Unassigned"}
                            </span>
                          </td>
                          <td>
                            <div className="trust-bar">
                              <div
                                className="trust-fill"
                                style={{
                                  width: `${u.trust_score || 80}%`,
                                }}
                              />
                              <span className="trust-text">
                                {u.trust_score || 80}%
                              </span>
                            </div>
                          </td>
                          <td className="action-buttons">
                            <button
                              className="btn-icon btn-edit"
                              title="Edit Role"
                              onClick={() => setEditingUser({ name: u.name, role: u.role })}
                            >
                              <FaEdit />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" style={{ textAlign: "center", color: "#64748b", padding: "2rem" }}>
                          {searchQuery ? "No users match your search" : "No users registered yet"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ✅ Edit User Role Modal */}
            {editingUser && (
              <div className="modal-overlay" onClick={() => setEditingUser(null)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <h3>Edit User Role</h3>
                    <button
                      className="modal-close-btn"
                      onClick={() => setEditingUser(null)}
                    >
                      <FaTimes />
                    </button>
                  </div>

                  <div className="modal-body">
                    <form onSubmit={(e) => {
                      const userEmail = filteredUsers.find(u => u.name === editingUser.name)?.email;
                      handleUpdateUserRole(e, userEmail);
                    }}>
                      <div className="form-group">
                        <label>User Name</label>
                        <input
                          type="text"
                          value={editingUser.name}
                          readOnly
                          className="input"
                          style={{ background: "#f1f5f9", cursor: "not-allowed" }}
                        />
                      </div>

                      <div className="form-group">
                        <label>Assign Role</label>
                        <select
                          value={editingUser.role}
                          onChange={(e) =>
                            setEditingUser({ ...editingUser, role: e.target.value })
                          }
                          className="input"
                          required
                        >
                          <option value="">-- Select Role --</option>
                          <option value="doctor">Doctor</option>
                          <option value="nurse">Nurse</option>
                          <option value="patient">Patient</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>

                      <div className="modal-footer">
                        <button
                          type="button"
                          className="btn btn-gray"
                          onClick={() => setEditingUser(null)}
                        >
                          Cancel
                        </button>
                        <button type="submit" className="btn btn-blue">
                          <FaCheckCircle /> Update Role
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ============== USERS TAB (Role-Based Auth) ============== */}
        {activeTab === "users" && (
          <section className="ehr-section">
            <div className="section-header">
              <h2>👥 System Users (users collection)</h2>
              <button
                className="btn btn-blue btn-sm"
                onClick={fetchUsers}
                disabled={loading}
              >
                <FaSync /> Refresh
              </button>
            </div>

            <p className="section-description">
              Users registered with roles for authentication
            </p>

            <div className="search-box-wrapper">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="log-table-wrapper">
              <table className="log-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Trust Score</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((u, idx) => (
                      <tr key={idx}>
                        <td className="user-name">{u.name}</td>
                        <td>{u.email}</td>
                        <td>
                          <span className={`role-badge role-${u.role || "user"}`}>
                            {u.role || "User"}
                          </span>
                        </td>
                        <td>
                          <div className="trust-bar">
                            <div
                              className="trust-fill"
                              style={{
                                width: `${u.trust_score || 80}%`,
                                background:
                                  (u.trust_score || 80) > 70
                                    ? "#10b981"
                                    : (u.trust_score || 80) > 40
                                    ? "#f59e0b"
                                    : "#ef4444",
                              }}
                            />
                            <span className="trust-text">
                              {u.trust_score || 80}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ textAlign: "center", color: "#64748b", padding: "2rem" }}>
                        No users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ============== PATIENTS TAB (Create New) ============== */}
        {activeTab === "patients" && (
          <>
            {/* Patients List */}
            <section className="ehr-section">
              <div className="section-header">
                <h2>📋 All Patients</h2>
                <button
                  className="btn btn-blue btn-sm"
                  onClick={fetchPatients}
                  disabled={loading}
                >
                  <FaSync /> Refresh
                </button>
              </div>

              <p className="section-description">
                All registered patients in the system
              </p>

              <div className="search-box-wrapper">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search patients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>

              <div className="log-table-wrapper">
                <table className="log-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Age</th>
                      <th>Diagnosis</th>
                      <th>Assigned Doctor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPatients.length > 0 ? (
                      filteredPatients.map((p, idx) => (
                        <tr key={idx}>
                          <td className="user-name">{p.name}</td>
                          <td>{p.email}</td>
                          <td>{p.age || "—"}</td>
                          <td>{p.diagnosis || "—"}</td>
                          <td>{p.doctor_assigned || "—"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" style={{ textAlign: "center", color: "#64748b", padding: "2rem" }}>
                          No patients found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {/* ============== SYSTEM LOGS TAB (Overall access_logs) ============== */}
        {activeTab === "systemLogs" && (
          <section className="ehr-section">
            <div className="section-header">
              <h2>📊 Overall System Logs (access_logs collection)</h2>
              <button
                className="btn btn-blue btn-sm"
                onClick={fetchSystemLogs}
              >
                <FaSync /> Refresh
              </button>
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
                  {systemLogs.length > 0 ? (
                    systemLogs.slice(0, 100).map((log, idx) => (
                      <tr key={idx}>
                        <td>{log.timestamp || "—"}</td>
                        <td>{log.doctor_name || "—"}</td>
                        <td>
                          <span className={`role-badge role-${log.doctor_role || "user"}`}>
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
                      <td colSpan="6" style={{ textAlign: "center", color: "#64748b", padding: "2rem" }}>
                        No system logs available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ============== DOCTOR ACTIVITY TAB (DoctorAccessLog) ============== */}
        {activeTab === "doctorLogs" && (
          <section className="ehr-section">
            <div className="section-header">
              <h2>👨‍⚕️ Doctor Activity Logs (DoctorAccessLog collection)</h2>
              <button
                className="btn btn-blue btn-sm"
                onClick={fetchDoctorLogs}
              >
                <FaSync /> Refresh
              </button>
            </div>

            <p className="section-description">
              Doctor-specific activities and patient interactions
            </p>

            <div className="log-table-wrapper">
              <table className="log-table">
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
                  {doctorLogs.length > 0 ? (
                    doctorLogs.slice(0, 100).map((log, idx) => (
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
                              : "status-info"
                          }
                        >
                          {log.status || "—"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" style={{ textAlign: "center", color: "#64748b", padding: "2rem" }}>
                        No doctor activity logs available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ============== NURSE ACTIVITY TAB (NurseAccessLog) ============== */}
        {activeTab === "nurseLogs" && (
          <section className="ehr-section">
            <div className="section-header">
              <h2>🧑‍⚕️ Nurse Activity Logs (NurseAccessLog collection)</h2>
              <button
                className="btn btn-blue btn-sm"
                onClick={fetchNurseLogs}
              >
                <FaSync /> Refresh
              </button>
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
                  {nurseLogs.length > 0 ? (
                    nurseLogs.slice(0, 100).map((log, idx) => (
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
                      <td colSpan="5" style={{ textAlign: "center", color: "#64748b", padding: "2rem" }}>
                        No nurse activity logs available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ============== ANALYTICS TAB ============== */}
        {activeTab === "analytics" && (
          <section className="ehr-section">
            <h2>📊 Advanced Analytics & Charts</h2>
            <AnalyticsCharts />
          </section>
        )}

        {/* ============== REPORTS TAB ============== */}
        {activeTab === "reports" && (
          <section className="ehr-section">
            <h2>📥 Export Reports</h2>
            <ReportExport data={{ logs: systemLogs, users: users, doctorLogs: doctorLogs }} />
          </section>
        )}

        {/* ============== PERMISSIONS TAB ============== */}
        {activeTab === "permissions" && (
          <section className="ehr-section">
            <h2>🔐 Role-Based Permissions</h2>
            <PermissionsEditor />
          </section>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
