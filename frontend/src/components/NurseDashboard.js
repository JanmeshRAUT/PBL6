import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API_URL } from "../api";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import NurseHomeTab from "./nurse_tabs/NurseHomeTab";
import NursePatientsTab from "./nurse_tabs/NursePatientsTab";
import NurseAccessLogsTab from "./nurse_tabs/NurseAccessLogsTab";
import {
  FaUserNurse,
  FaHospitalUser,
  FaClipboardList,
  FaSignOutAlt,
  FaUserInjured,
  FaGlobeAsia,
  FaClock,
  FaShieldAlt,
  FaCheckCircle,
  FaTimes,
} from "react-icons/fa";
import "../css/NurseDashboard.css";
import "../css/Notifications.css";

const NurseDashboard = ({ user, onLogout }) => {
  const navigate = useNavigate();

  // ✅ Helper: Get Firebase ID token with race-condition fix
  const getFirebaseToken = useCallback(async () => {
    return new Promise((resolve) => {
      const auth = getAuth();
      if (auth.currentUser) {
        auth.currentUser.getIdToken().then(resolve).catch((err) => {
            console.error("Error getting immediate token:", err);
            resolve(null);
        });
      } else {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
          unsubscribe();
          if (user) {
            try {
              const token = await user.getIdToken();
              resolve(token);
            } catch (error) {
              console.error("Error getting token after auth change:", error);
              resolve(null);
            }
          } else {
             // If no user is signed in, resolve null
            resolve(null);
          }
        });
      }
    });
  }, []);

  const [activeTab, setActiveTab] = useState("dashboard");
  const [trustScore, setTrustScore] = useState(0);
  const [ipAddress, setIpAddress] = useState("");
  const [isInsideNetwork, setIsInsideNetwork] = useState(false);
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [selectedPatientData, setSelectedPatientData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [lastLogin, setLastLogin] = useState("");
  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  const [accessGranted, setAccessGranted] = useState(false);
  const [accessExpiryTime, setAccessExpiryTime] = useState(null);

  // Helper to remove leading emoji from backend messages
  const cleanToastMessage = (msg) => {
    return (msg || "").replace(
      /^[\u2705\u274C\u26A0\u2139\u1F691\u1F6A8\u1F198\u1F4E2\u1F4A1\u1F514\u1F6AB\u1F512\u1F4DD\u1F4C8\u1F4C9\u1F4CA\u1F4CB\u1F4CC\u1F4CD\u1F4CE\u1F4CF\u1F4D0\u1F4D1\u1F4D2\u1F4D3\u1F4D4\u1F4D5\u1F4D6\u1F4D7\u1F4D8\u1F4D9\u1F4DA\u1F4DB\u1F4DC\u1F4DD\u1F4DE\u1F4DF\u1F4E0\u1F4E1\u1F4E2\u1F4E3\u1F4E4\u1F4E5\u1F4E6\u1F4E7\u1F4E8\u1F4E9\u1F4EA\u1F4EB\u1F4EC\u1F4ED\u1F4EE\u1F4EF\u1F4F0\u1F4F1\u1F4F2\u1F4F3\u1F4F4\u1F4F5\u1F4F6\u1F4F7\u1F4F8\u1F4F9\u1F4FA\u1F4FB\u1F4FC\u1F4FD\u1F4FE\u1F4FF\u1F500\u1F501\u1F502\u1F503\u1F504\u1F505\u1F506\u1F507\u1F508\u1F509\u1F50A\u1F50B\u1F50C\u1F50D\u1F50E\u1F50F\u1F510\u1F511\u1F512\u1F513\u1F514\u1F515\u1F516\u1F517\u1F518\u1F519\u1F51A\u1F51B\u1F51C\u1F51D\u1F51E\u1F51F\u1F520\u1F521\u1F522\u1F523\u1F524\u1F525\u1F526\u1F527\u1F528\u1F529\u1F52A\u1F52B\u1F52C\u1F52D\u1F52E\u1F52F\u1F530\u1F531\u1F532\u1F533\u1F534\u1F535\u1F536\u1F537\u1F538\u1F539\u1F53A\u1F53B\u1F53C\u1F53D\u1F549\u1F54A\u1F54B\u1F54C\u1F54D\u1F54E\u1F550\u1F551\u1F552\u1F553\u1F554\u1F555\u1F556\u1F557\u1F558\u1F559\u1F55A\u1F55B\u1F55C\u1F55D\u1F55E\u1F55F\u1F560\u1F561\u1F562\u1F563\u1F564\u1F565\u1F566\u1F567\u1F56F\u1F570\u1F573\u1F574\u1F575\u1F576\u1F577\u1F578\u1F579\u1F57A\u1F587\u1F58A\u1F58B\u1F58C\u1F58D\u1F590\u1F595\u1F596\u1F5A4\u1F5A5\u1F5A8\u1F5B1\u1F5B2\u1F5BC\u1F5C2\u1F5C3\u1F5C4\u1F5D1\u1F5D2\u1F5D3\u1F5DC\u1F5DD\u1F5DE\u1F5E1\u1F5E3\u1F5E8\u1F5EF\u1F5F3\u1F5FA\u1F5FB\u1F5FC\u1F5FD\u1F5FE\u1F5FF\u1F600-\u1F64F\u1F680-\u1F6FF\u2600-\u26FF\u2700-\u27BF]\s*/g,
      ""
    );
  };

  // ✅ Fetch Trust Score
  const fetchTrustScore = useCallback(async () => {
    if (!user?.name) return;
    try {
      const res = await axios.get(`${API_URL}/trust_score/${user.name}`);
      setTrustScore(res.data.trust_score || 0);
    } catch (err) {
      console.error("Error fetching trust score:", err);
    }
  }, [user?.name]);

  // ✅ Fetch IP + Network info
  const fetchIPAndNetwork = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/ip_check`);
      setIpAddress(res.data.ip);
      setIsInsideNetwork(res.data.inside_network);
    } catch (err) {
      console.error("Error fetching network:", err);
      setIsInsideNetwork(false);
    }
  }, []);

  // ✅ Fetch Patients (from all_patients endpoint)
  const fetchPatients = useCallback(async () => {
    try {
      const token = await getFirebaseToken();
      if (!token) return;
      const res = await axios.get(`${API_URL}/all_patients`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.data.success) setPatients(res.data.patients || []);
    } catch (err) {
      console.error("Error fetching patients:", err);
      setPatients([]);
    }
  }, [getFirebaseToken]);

  // ✅ Fetch Nurse Access Logs (from NurseAccessLog)
  const fetchAccessLogs = useCallback(async () => {
    if (!user?.name) return;
    try {
      const res = await axios.get(`${API_URL}/nurse_access_logs/${user.name}`);
      if (res.data.success) setLogs(res.data.logs || []);
    } catch (err) {
      console.error("Error fetching access logs:", err);
      setLogs([]);
    }
  }, [user?.name]);

  // ✅ Log Nurse Login
  const logLoginAccess = useCallback(async () => {
    if (!user?.name || !user?.role) return;
    try {
      await axios.post(`${API_URL}/log_access`, {
        name: user.name,
        role: user.role,
        patient_name: "N/A",
        action: "LOGIN",
        status: "Success",
      });
      setLastLogin(new Date().toLocaleString());
      fetchAccessLogs();
    } catch (error) {
      console.error("Error logging nurse login:", error);
    }
  }, [user?.name, user?.role, fetchAccessLogs]);

  // ✅ Lifecycle setup
  useEffect(() => {
    if (!user?.name) return;

    fetchTrustScore();
    fetchIPAndNetwork();
    fetchPatients();
    logLoginAccess();
    fetchAccessLogs();

    const interval = setInterval(fetchTrustScore, 30000); // ✅ reduce poll rate
    return () => clearInterval(interval);
  }, [
    user?.name,
    fetchTrustScore,
    fetchIPAndNetwork,
    fetchPatients,
    logLoginAccess,
    fetchAccessLogs,
  ]);

  // ✅ NOW check user AFTER all hooks
  if (!user || !user.name) {
    return (
      <div className="session-expired-container">
        <p className="session-expired-text">❌ Session expired or invalid user data</p>
        <button onClick={() => navigate("/")} className="session-expired-btn">
          Return to Login
        </button>
      </div>
    );
  }

  // ✅ Handle Temporary Access Request (Time-based, no justification)
  const handleAccessRequest = async () => {
    if (!selectedPatient) {
      setToast({
        show: true,
        message: "Please select a patient first!",
        type: "warning",
      });
      setTimeout(() => setToast({ show: false, message: "", type: "" }), 4000);
      return;
    }

    if (!isInsideNetwork) {
      setToast({
        show: true,
        message:
          "Temporary Access can only be requested inside the hospital network!",
        type: "error",
      });
      setTimeout(() => setToast({ show: false, message: "", type: "" }), 4000);
      return;
    }

    try {
      const token = await getFirebaseToken();
      const res = await axios.post(
        `${API_URL}/request_temp_access`,
        {
          name: user.name,
          role: user.role,
          patient_name: selectedPatient,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      let type = res.data.success ? "success" : "error";
      setToast({
        show: true,
        message: cleanToastMessage(res.data.message),
        type,
      });

      // ✅ Update patient data with the sensitive info returned
      if (res.data.success && res.data.patient_data) {
        setSelectedPatientData(res.data.patient_data);
        setAccessGranted(true);
        // Set expiry time to 30 minutes from now
        const expiryTime = new Date(Date.now() + 30 * 60 * 1000);
        setAccessExpiryTime(expiryTime);
      }

      setTimeout(() => setToast({ show: false, message: "", type: "" }), 4000);
      fetchAccessLogs();
    } catch (error) {
      setToast({
        show: true,
        message: "Failed to request temporary access.",
        type: "error",
      });
      setTimeout(() => setToast({ show: false, message: "", type: "" }), 4000);
    }
  };

  // ✅ Logout
  const handleLogout = () => {
    if (onLogout) onLogout();
    localStorage.clear();
    navigate("/");
  };

  // ✅ Handle patient selection and store details
  const handleSelectPatient = (patientName) => {
    setSelectedPatient(patientName);
    setAccessGranted(false);
    setAccessExpiryTime(null);
    const found = patients.find(
      (p) => (p.name || "").toLowerCase() === (patientName || "").toLowerCase()
    );
    setSelectedPatientData(found || null);
  };

  return (
    <div className="ehr-layout">
      {/* Sidebar */}
      <aside className="ehr-sidebar">
        <div className="ehr-sidebar-header">
          <FaHospitalUser className="ehr-logo" />
          <h2>MedTrust EHR</h2>
        </div>

        <nav>
          <ul>
            <li
              className={activeTab === "dashboard" ? "active" : ""}
              onClick={() => setActiveTab("dashboard")}
              title="Overview"
            >
              <FaUserNurse /> Dashboard
            </li>
            <li
              className={activeTab === "patients" ? "active" : ""}
              onClick={() => setActiveTab("patients")}
              title="View patients"
            >
              <FaUserInjured /> Patients
            </li>
            <li
              className={activeTab === "accessLogs" ? "active" : ""}
              onClick={() => setActiveTab("accessLogs")}
              title="Access history"
            >
              <FaClipboardList /> Access Logs
            </li>
            <li>
              <FaShieldAlt /> Approvals
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
        {/* Header - Fixed at top */}
        <header className="ehr-header">
          <div className="header-left">
            <h1>Welcome, Nurse {user.name}</h1>
            <p className="user-role">Role: {user.role}</p>
          </div>

          <div className="header-right">
            <div className={`status-badge ${isInsideNetwork ? "network" : "error"}`}>
              <FaCheckCircle /> {isInsideNetwork ? "In Network" : "Outside Network"}
            </div>
            <div className="status-badge ip">
              <FaGlobeAsia /> {ipAddress}
            </div>
            {lastLogin && (
              <div className="last-login">
                <FaClock /> {lastLogin}
              </div>
            )}
          </div>
        </header>

        {/* ============== TOAST NOTIFICATION ============== */}
        {toast.show && (
          <div className={`toast-notification toast-${toast.type}`}>
            <div className="toast-content">
              <span>{toast.message}</span>
            </div>
            <button className="toast-close" onClick={() => setToast({ ...toast, show: false })}>
              <FaTimes />
            </button>
          </div>
        )}

        {/* ============== SCROLLABLE CONTENT WRAPPER ============== */}
        <div className="ehr-content-wrapper">
          {/* ------------------ Dashboard TAB ------------------ */}
          {activeTab === "dashboard" && (
            <NurseHomeTab 
              trustScore={trustScore}
              patients={patients}
              selectedPatient={selectedPatient}
              selectedPatientData={selectedPatientData}
              handleSelectPatient={handleSelectPatient}
              isInsideNetwork={isInsideNetwork}
              handleAccessRequest={handleAccessRequest}
              accessGranted={accessGranted}
              accessExpiryTime={accessExpiryTime}
              logs={logs}
              setActiveTab={setActiveTab}
            />
          )}

          {/* ------------------ PATIENTS TAB ------------------ */}
          {activeTab === "patients" && (
            <NursePatientsTab patients={patients} />
          )}

          {/* ------------------ ACCESS LOGS TAB ------------------ */}
          {activeTab === "accessLogs" && (
            <NurseAccessLogsTab logs={logs} />
          )}
        </div>
      </main>
    </div>
  );
};

export default NurseDashboard;
