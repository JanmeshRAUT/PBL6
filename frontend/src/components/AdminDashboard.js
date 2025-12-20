import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API_URL } from "../api";
import { useNavigate } from "react-router-dom";
import AnalyticsCharts from "./AnalyticsCharts";
import NotificationCenter from "./NotificationCenter";
import ReportExport from "./ReportExport";
import PermissionsEditor from "./PermissionsEditor";
import AdminSidebar from "./admin/AdminSidebar";
import UserManagement from "./admin/UserManagement";
import UsersList from "./admin/UsersList";
import PatientList from "./admin/PatientList";
import SystemLogs from "./admin/SystemLogs";
import DoctorLogs from "./admin/DoctorLogs";
import NurseLogs from "./admin/NurseLogs";
import "../css/AdminDashboard.css";
import "../css/Notifications.css";

// Create axios instance with auth interceptor
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Add Authorization token to all requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("adminToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log("🔐 Token attached to request:", token.substring(0, 20) + "...");
    } else {
      console.warn("⚠️ No admin token found in localStorage");
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 responses globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error("❌ Unauthorized (401). Clearing token and redirecting...");
      localStorage.removeItem("adminToken");
      window.location.href = "/admin/login";
    }
    return Promise.reject(error);
  }
);

const AdminDashboard = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("users");

  // Collections Data
  const [users, setUsers] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);
  const [doctorLogs, setDoctorLogs] = useState([]);
  const [nurseLogs, setNurseLogs] = useState([]);
  const [patients, setPatients] = useState([]);

  const [loading, setLoading] = useState(false);

  // ✅ Fetch Users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/get_all_users");
      if (res.data.success) {
        setUsers(res.data.users || []);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error("❌ Error fetching users:", error);
      // If 401, redirect to login
      if (error.response?.status === 401) {
        console.warn("⚠️ Unauthorized. Redirecting to login...");
        localStorage.removeItem("adminToken");
        navigate("/admin/login");
      }
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // ✅ Fetch System Logs
  const fetchSystemLogs = useCallback(async () => {
    try {
      const res = await apiClient.get("/access_logs/admin");
      if (res.data.success) {
        setSystemLogs(res.data.logs || []);
      }
    } catch (error) {
      console.error("❌ Error fetching system logs:", error);
      setSystemLogs([]);
    }
  }, []);

  // ✅ Fetch Doctor Logs
  const fetchDoctorLogs = useCallback(async () => {
    try {
      const res = await apiClient.get("/all_doctor_access_logs");
      if (res.data.success) {
        setDoctorLogs(res.data.logs || []);
      }
    } catch (error) {
      console.error("❌ Error fetching doctor logs:", error);
      setDoctorLogs([]);
    }
  }, []);

  // ✅ Fetch Nurse Logs
  const fetchNurseLogs = useCallback(async () => {
    try {
      const res = await apiClient.get("/all_nurse_access_logs");
      if (res.data.success) {
        setNurseLogs(res.data.logs || []);
      }
    } catch (error) {
      console.error("❌ Error fetching nurse logs:", error);
      setNurseLogs([]);
    }
  }, []);

  // ✅ Fetch Patients
  const fetchPatients = useCallback(async () => {
    try {
      const res = await apiClient.get("/all_patients");
      if (res.data.success) {
        setPatients(res.data.patients || []);
      }
    } catch (error) {
      console.error("❌ Error fetching patients:", error);
    }
  }, []);

  // ✅ Lifecycle
  useEffect(() => {
    // Check if admin is logged in
    const token = localStorage.getItem("adminToken");
    if (!token) {
      console.warn("⚠️ No admin token found. Redirecting to login...");
      setTimeout(() => navigate("/admin/login"), 100);
      return;
    }
    
    console.log("✅ Admin token found, fetching data...");
    
    // Fetch all data
    fetchUsers();
    fetchSystemLogs();
    fetchDoctorLogs();
    fetchNurseLogs();
    fetchPatients();
  }, [fetchUsers, fetchSystemLogs, fetchDoctorLogs, fetchNurseLogs, fetchPatients, navigate]);

  // ✅ Logout
  const handleLogout = () => {
    if (onLogout) onLogout();
    localStorage.clear();
    navigate("/");
  };

  return (
    <div className="ehr-layout">
      {/* Sidebar */}
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        usersCount={users.length}
        onLogout={handleLogout}
      />

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

        {/* Dynamic Content */}
        {activeTab === "userManagement" && (
          <UserManagement
            users={users}
            fetchUsers={fetchUsers}
            loading={loading}
            fetchPatients={fetchPatients}
          />
        )}

        {activeTab === "users" && (
          <UsersList
            users={users}
            fetchUsers={fetchUsers}
            loading={loading}
          />
        )}

        {activeTab === "patients" && (
          <PatientList
            patients={patients}
            fetchPatients={fetchPatients}
            loading={loading}
          />
        )}

        {activeTab === "systemLogs" && (
          <SystemLogs logs={systemLogs} fetchLogs={fetchSystemLogs} />
        )}

        {activeTab === "doctorLogs" && (
          <DoctorLogs logs={doctorLogs} fetchLogs={fetchDoctorLogs} />
        )}

        {activeTab === "nurseLogs" && (
          <NurseLogs logs={nurseLogs} fetchLogs={fetchNurseLogs} />
        )}

        {activeTab === "analytics" && (
          <section className="ehr-section">
            <h2>📊 Advanced Analytics & Charts</h2>
            <AnalyticsCharts 
              logs={systemLogs} 
              users={users}
              doctorLogs={doctorLogs}
              nurseLogs={nurseLogs}
              patients={patients}
            />
          </section>
        )}

        {activeTab === "reports" && (
          <section className="ehr-section">
            <h2>📥 Export Reports</h2>
            <ReportExport
              data={{ logs: systemLogs, users: users, doctorLogs: doctorLogs }}
            />
          </section>
        )}

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
