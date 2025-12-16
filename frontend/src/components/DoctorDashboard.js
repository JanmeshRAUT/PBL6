import React, { useState, useCallback, useEffect } from "react";
import axios from "axios";
import { API_URL } from "../api";
import { useNavigate } from "react-router-dom";
import TrustScoreMeter from "./TrustScoreMeter";
import PatientFormModal from "./PatientFormModal";
import {
  FaHospitalUser,
  FaUserMd,
  FaUserInjured,
  FaClipboardList,
  FaSignOutAlt,
  FaLock,
  FaExclamationTriangle,
  FaGlobeAsia,
  FaClock,
  FaListAlt,
  FaFilePdf,
  FaTimes,
  FaCheckCircle,
  FaSpinner,
  FaSync,
} from "react-icons/fa";
import "../css/Doctor.css";
import "../css/UserManagement.css";
import "../css/Notifications.css"; // ✅ Already added - ensures toast styles are loaded

const DoctorDashboard = ({ user, onLogout }) => {
  const navigate = useNavigate();

  // ✅ ALL HOOKS MUST BE AT THE TOP
  const [activeTab, setActiveTab] = useState("dashboard");
  const [trustScore, setTrustScore] = useState(0);
  const [allPatients, setAllPatients] = useState([]);  // ✅ All patients from admin
  const [selectedPatient, setSelectedPatient] = useState("");
  const [selectedPatientData, setSelectedPatientData] = useState(null);  // ✅ Patient details
  const [justification, setJustification] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [isInsideNetwork, setIsInsideNetwork] = useState(false);
  const [lastLogin, setLastLogin] = useState("");
  const [logs, setLogs] = useState([]);
  const [accessResponse, setAccessResponse] = useState(null);
  const [myPatients, setMyPatients] = useState([]);
  
  // ✅ Record editing state
  const [recordForm, setRecordForm] = useState({
    diagnosis: "",
    treatment: "",
    notes: "",
  });
  const [recordLoading, setRecordLoading] = useState(false);

  // ✅ New: Enhanced loading and error states
  const [loading, setLoading] = useState({
    trust: false,
    patients: false,
    logs: false,  
    access: false,
    myPatients: false,
  });
  const [error, setError] = useState(null);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [showJustificationModal, setShowJustificationModal] = useState(false);
  const [showPatientForm, setShowPatientForm] = useState(false);  // ✅ ADD THIS
  const [currentAccessType, setCurrentAccessType] = useState("");
  const [toast, setToast] = useState({ show: false, message: "", type: "" });

  // ✅ Toast notification helper
  const showToast = (message, type = "info") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 4000);
  };

  // ✅ Fetch IP and Network
  const fetchIPAndNetwork = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/ip_check`);
      setIpAddress(res.data.ip);
      setIsInsideNetwork(res.data.inside_network);
    } catch (error) {
      console.error("Failed to fetch IP/network:", error);
      setIpAddress("Unavailable");
      setIsInsideNetwork(false);
    }
  }, []);

  // ✅ Improved Fetch Trust Score with loading state
  const fetchTrustScore = useCallback(async () => {
    if (!user?.name) return;
    try {
      setLoading((prev) => ({ ...prev, trust: true }));
      const res = await axios.get(
        `http://localhost:5000/trust_score/${user.name}`
      );
      setTrustScore(res.data.trust_score || 0);
      setError(null);
    } catch (err) {
      console.error("Error fetching trust score:", err);
      setError("Failed to load trust score");
    } finally {
      setLoading((prev) => ({ ...prev, trust: false }));
    }
  }, [user?.name]);

  // ✅ Fetch ALL patients (created by admin)
  const fetchAllPatients = useCallback(async () => {
    try {
      setLoading((prev) => ({ ...prev, patients: true }));
      const res = await axios.get(`${API_URL}/all_patients`);
      if (res.data.success) {
        setAllPatients(res.data.patients || []);
        setError(null);
      }
    } catch (err) {
      console.error("Error fetching patients:", err);
      setError("Failed to load patients");
    } finally {
      setLoading((prev) => ({ ...prev, patients: false }));
    }
  }, []);

  // ✅ Improved Fetch Access Logs - Uses new DoctorAccessLog collection
  const fetchAccessLogs = useCallback(async () => {
    if (!user?.name) return;
    try {
      setLoading((prev) => ({ ...prev, logs: true }));
      // ✅ NEW: Use dedicated DoctorAccessLog endpoint
      const res = await axios.get(
        `http://localhost:5000/doctor_access_logs/${user.name}`
      );
      if (res.data.success) {
        setLogs(res.data.logs || []);
        console.log(`✅ Fetched ${res.data.logs?.length || 0} access logs from DoctorAccessLog`);
      }
    } catch (err) {
      console.error("Error fetching access logs:", err);
      setLogs([]);
    } finally {
      setLoading((prev) => ({ ...prev, logs: false }));
    }
  }, [user?.name]);

  // ✅ Log Login Access
  const logLoginAccess = useCallback(async () => {
    if (!user?.name || !user?.role) return;
    try {
      await axios.post(`${API_URL}/log_access`, {
        name: user.name,
        doctor_name: user.name,
        role: user.role,
        doctor_role: user.role,
        patient_name: "N/A",
        action: "LOGIN",
        justification: "User logged into system",
        status: "Success",
      });
      setLastLogin(new Date().toLocaleString());
    } catch (error) {
      console.error("Error logging login access:", error);
    }
  }, [user?.name, user?.role]);

  // ✅ NEW: Fetch patients diagnosed by this doctor
  const fetchMyPatients = useCallback(async () => {
    if (!user?.name) return;
    try {
      setLoading((prev) => ({ ...prev, myPatients: true }));
      const res = await axios.get(
        `http://localhost:5000/doctor_patients/${user.name}`
      );
      if (res.data.success) {
        setMyPatients(res.data.patients || []);
        console.log(`✅ Fetched ${res.data.patients?.length || 0} diagnosed patients`);
      }
    } catch (err) {
      console.error("Error fetching my patients:", err);
      setMyPatients([]);
    } finally {
      setLoading((prev) => ({ ...prev, myPatients: false }));
    }
  }, [user?.name]);

  // ✅ Lifecycle Setup
  useEffect(() => {
    if (!user?.name) return;

    fetchTrustScore();
    fetchAllPatients();
    fetchIPAndNetwork();
    logLoginAccess();
    fetchAccessLogs();
    fetchMyPatients();

    // ✅ CHANGED: Increase interval to 30 seconds to reduce server load
    const interval = setInterval(fetchTrustScore, 30000);
    return () => clearInterval(interval);
  }, [
    user?.name,
    fetchTrustScore,
    fetchAllPatients,
    fetchIPAndNetwork,
    logLoginAccess,
    fetchAccessLogs,
    fetchMyPatients,
  ]);

  // ✅ NOW do the safety check AFTER all hooks
  if (!user || !user.name) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          gap: "1rem",
        }}
      >
        <p style={{ fontSize: "1.2rem", color: "#ef4444" }}>
          ❌ Session expired or invalid user data
        </p>
        <button
          onClick={() => navigate("/")}
          style={{
            padding: "0.75rem 1.5rem",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "0.5rem",
            cursor: "pointer",
            fontSize: "1rem",
          }}
        >
          Return to Login
        </button>
      </div>
    );
  }

  // ✅ Enhanced Access Request Handler
  const handleAccessRequest = async (type) => {
    if (!selectedPatient) {
      showToast("⚠️ Please select a patient first!", "warning");
      return;
    }

    // Validate justification for outside network access
    if (!isInsideNetwork && type !== "normal" && !justification.trim()) {
      setCurrentAccessType(type);
      setShowJustificationModal(true);
      return;
    }

    await performAccessRequest(type, justification.trim());
  };

  // ✅ Perform the actual access request
  const performAccessRequest = async (type, reason = "") => {
    try {
      setLoading((prev) => ({ ...prev, access: true }));
      setError(null);

      const res = await axios.post(`http://localhost:5000/${type}_access`, {
        name: user.name,
        role: user.role,
        patient_name: selectedPatient,
        justification: reason,
      });

      if (res.data.success) {
        setAccessResponse(res.data);
        showToast(cleanToastMessage(res.data.message), "success");
        
        // Auto-show PDF modal if patient data available
        if (res.data.patient_data && Object.keys(res.data.patient_data).length > 0) {
          setTimeout(() => setShowPDFModal(true), 500);
        }
      } else {
        showToast(cleanToastMessage(res.data.message), "error");
      }

      // Log the access attempt
      await axios.post(`${API_URL}/log_access`, {
        name: user.name,
        doctor_name: user.name,
        role: user.role,
        doctor_role: user.role,
        patient_name: selectedPatient,
        action: `${type.toUpperCase()} Access`,
        justification: reason,
        status: res.data.success ? "Granted" : "Denied",
      });

      fetchTrustScore();
      fetchAccessLogs();
      setJustification("");
      setShowJustificationModal(false);
    } catch (error) {
      console.error("Access request error:", error);
      const errorMsg = error.response?.data?.message || "❌ Access request failed.";
      setError(errorMsg);
      showToast(cleanToastMessage(errorMsg), "error");
    } finally {
      setLoading((prev) => ({ ...prev, access: false }));
    }
  };

  // Helper to remove leading emoji from backend messages
  const cleanToastMessage = (msg) => {
    // Remove leading emoji and spaces (✅, ❌, ⚠️, ℹ️, 🚑, etc.)
    return (msg || "").replace(/^[\u2705\u274C\u26A0\u2139\u1F691\u1F6A8\u1F198\u1F4E2\u1F4A1\u1F514\u1F6AB\u1F512\u1F4DD\u1F4C8\u1F4C9\u1F4CA\u1F4CB\u1F4CC\u1F4CD\u1F4CE\u1F4CF\u1F4D0\u1F4D1\u1F4D2\u1F4D3\u1F4D4\u1F4D5\u1F4D6\u1F4D7\u1F4D8\u1F4D9\u1F4DA\u1F4DB\u1F4DC\u1F4DD\u1F4DE\u1F4DF\u1F4E0\u1F4E1\u1F4E2\u1F4E3\u1F4E4\u1F4E5\u1F4E6\u1F4E7\u1F4E8\u1F4E9\u1F4EA\u1F4EB\u1F4EC\u1F4ED\u1F4EE\u1F4EF\u1F4F0\u1F4F1\u1F4F2\u1F4F3\u1F4F4\u1F4F5\u1F4F6\u1F4F7\u1F4F8\u1F4F9\u1F4FA\u1F4FB\u1F4FC\u1F4FD\u1F4FE\u1F4FF\u1F500\u1F501\u1F502\u1F503\u1F504\u1F505\u1F506\u1F507\u1F508\u1F509\u1F50A\u1F50B\u1F50C\u1F50D\u1F50E\u1F50F\u1F510\u1F511\u1F512\u1F513\u1F514\u1F515\u1F516\u1F517\u1F518\u1F519\u1F51A\u1F51B\u1F51C\u1F51D\u1F51E\u1F51F\u1F520\u1F521\u1F522\u1F523\u1F524\u1F525\u1F526\u1F527\u1F528\u1F529\u1F52A\u1F52B\u1F52C\u1F52D\u1F52E\u1F52F\u1F530\u1F531\u1F532\u1F533\u1F534\u1F535\u1F536\u1F537\u1F538\u1F539\u1F53A\u1F53B\u1F53C\u1F53D\u1F549\u1F54A\u1F54B\u1F54C\u1F54D\u1F54E\u1F550\u1F551\u1F552\u1F553\u1F554\u1F555\u1F556\u1F557\u1F558\u1F559\u1F55A\u1F55B\u1F55C\u1F55D\u1F55E\u1F55F\u1F560\u1F561\u1F562\u1F563\u1F564\u1F565\u1F566\u1F567\u1F56F\u1F570\u1F573\u1F574\u1F575\u1F576\u1F577\u1F578\u1F579\u1F57A\u1F587\u1F58A\u1F58B\u1F58C\u1F58D\u1F590\u1F595\u1F596\u1F5A4\u1F5A5\u1F5A8\u1F5B1\u1F5B2\u1F5BC\u1F5C2\u1F5C3\u1F5C4\u1F5D1\u1F5D2\u1F5D3\u1F5DC\u1F5DD\u1F5DE\u1F5E1\u1F5E3\u1F5E8\u1F5EF\u1F5F3\u1F5FA\u1F5FB\u1F5FC\u1F5FD\u1F5FE\u1F5FF\u1F600-\u1F64F\u1F680-\u1F6FF\u2600-\u26FF\u2700-\u27BF]\s*/g, "");
  };

  // ✅ Resolve backend PDF link to absolute URL
  const resolvePdfLink = (link) => {
    if (!link) return "";
    if (link.startsWith("http")) return link;
    return `http://localhost:5000${link.startsWith("/") ? link : `/${link}`}`;
  };

  // ✅ Handle PDF Download
  const handleDownloadPDF = () => {
    if (accessResponse?.pdf_link) {
      window.open(resolvePdfLink(accessResponse.pdf_link), "_blank");
    } else {
      alert("No PDF report available for this patient.");
    }
  };

  // ✅ Improved logout
  const handleLogout = () => {
    if (onLogout) onLogout();
    localStorage.clear();
    navigate("/");
  };

  // ✅ Handle patient selection
  const handleSelectPatient = async (patientName) => {
    if (!patientName) {
      setSelectedPatient("");
      setSelectedPatientData(null);
      setRecordForm({
        diagnosis: "",
        treatment: "",
        notes: "",
      });
      return;
    }

    setSelectedPatient(patientName);
    
    // Fetch patient details
    try {
      const res = await axios.get(
        `http://localhost:5000/get_patient/${patientName.toLowerCase()}`
      );
      if (res.data.success && res.data.patient) {
        setSelectedPatientData(res.data.patient);
        setRecordForm({
          diagnosis: res.data.patient.diagnosis || "",
          treatment: res.data.patient.treatment || "",
          notes: res.data.patient.notes || "",
        });
      } else {
        // ✅ Patient exists but no detailed data yet - create minimal structure
        console.log(`⚠️ Patient ${patientName} found in list but no detailed data. Creating minimal structure.`);
        
        // Find patient from allPatients list
        const patientFromList = allPatients.find(
          p => (p.name || p.patient_name)?.toLowerCase() === patientName.toLowerCase()
        );
        
        if (patientFromList) {
          const minimalData = {
            name: patientFromList.name || patientFromList.patient_name,
            email: patientFromList.email || "",
            age: patientFromList.age || 0,
            gender: patientFromList.gender || "",
            diagnosis: patientFromList.diagnosis || "",
            treatment: patientFromList.treatment || "",
            notes: patientFromList.notes || ""
          };
          
          setSelectedPatientData(minimalData);
          setRecordForm({
            diagnosis: minimalData.diagnosis || "",
            treatment: minimalData.treatment || "",
            notes: minimalData.notes || "",
          });
        } else {
          showToast("⚠️ Could not load patient details. Please try again.", "warning");
        }
      }
    } catch (err) {
      console.error("Error fetching patient details:", err);
      
      // ✅ Even on error, try to use data from allPatients list
      const patientFromList = allPatients.find(
        p => (p.name || p.patient_name)?.toLowerCase() === patientName.toLowerCase()
      );
      
      if (patientFromList) {
        const fallbackData = {
          name: patientFromList.name || patientFromList.patient_name,
          email: patientFromList.email || "",
          age: patientFromList.age || 0,
          gender: patientFromList.gender || "",
          diagnosis: patientFromList.diagnosis || "",
          treatment: patientFromList.treatment || "",
          notes: patientFromList.notes || ""
        };
        
        setSelectedPatientData(fallbackData);
        setRecordForm({
          diagnosis: fallbackData.diagnosis || "",
          treatment: fallbackData.treatment || "",
          notes: fallbackData.notes || "",
        });
        
        showToast("Using basic patient info. Fill in medical records below.", "info");
      } else {
        showToast("❌ Error loading patient details", "error");
      }
    }
  };

  // ✅ Update patient medical records
  const handleUpdateRecords = async (e) => {
    e.preventDefault();
    
    if (!selectedPatient) {
      showToast("⚠️ Please select a patient first!", "warning");
      return;
    }

    if (!recordForm.diagnosis.trim()) {
      showToast("⚠️ Diagnosis is required!", "warning");
      return;
    }

    try {
      setRecordLoading(true);
      
      // ✅ CORRECT: POST to /update_patient (no patient name in URL)
      const res = await axios.post(`${API_URL}/update_patient`, {
        patient_name: selectedPatient,
        updated_by: user.name,
        updates: {
          diagnosis: recordForm.diagnosis.trim(),
          treatment: recordForm.treatment.trim(),
          notes: recordForm.notes.trim(),
        }
      });

      if (res.data.success) {
        showToast(cleanToastMessage(res.data.message), "success");
        
        // Update local state with returned patient data
        if (res.data.patient) {
          setSelectedPatientData(res.data.patient);
        }
        
        // Refresh patient list
        fetchMyPatients();
        fetchAccessLogs(); // Update logs since this is a logged action
      } else {
        showToast(cleanToastMessage(res.data.message), "error");
      }
    } catch (error) {
      console.error("Update error:", error);
      const errorMsg = error.response?.data?.message || "Failed to update patient records";
      showToast("❌ " + errorMsg, "error");
    } finally {
      setRecordLoading(false);
    }
  };

  const fieldOrder = [
    "name",
    "age",
    "gender",
    "email",
    "diagnosis",
    "treatment",
    "notes",
    "last_visit",
    "last_updated_at",
    "last_updated_by",
  ];
  const formatLabel = (key) =>
    key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

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
              title="View trust score and request patient access"
            >
              <FaUserMd /> Dashboard
            </li>
            <li
              className={activeTab === "patients" ? "active" : ""}
              onClick={() => setActiveTab("patients")}
              title="View all your diagnosed patients"
            >
              <FaUserInjured /> My Patients ({myPatients.length})
            </li>
            <li
              className={activeTab === "accessLogs" ? "active" : ""}
              onClick={() => setActiveTab("accessLogs")}
              title="View your access history and logs"
            >
              <FaClipboardList /> Access Logs ({logs.length})
            </li>
            <li title="Manage your access permissions">
              <FaLock /> Permissions
            </li>
            <li title="View system alerts and notifications">
              <FaExclamationTriangle /> Alerts
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
        {/* Header */}
        <header className="ehr-header">
          <div className="header-left">
            <h1>Welcome, Dr. {user.name}</h1>
            <p className="user-role">Role: {user.role}</p>
          </div>

          <div className="header-right">
            <div className="ip-display">
              <FaGlobeAsia className="icon" /> <span>{ipAddress}</span>
            </div>
            <div className="last-login">
              <FaClock className="icon" />{" "}
              <span>Last Login: {lastLogin || "Loading..."}</span>
            </div>
            <div className="session-indicator">
              {isInsideNetwork ? "🏥 In Hospital Network" : "🌐 External Access"}
            </div>
          </div>
        </header>

        {/* ============== TOAST NOTIFICATION ============== */}
        {toast.show && (
          <div className={`toast-notification toast-${toast.type}`}>
            <div className="toast-content">
              {/* Only show message, icon is handled by CSS */}
              <span>{toast.message}</span>
            </div>
            <button className="toast-close" onClick={() => setToast({ ...toast, show: false })}>
              <FaTimes />
            </button>
          </div>
        )}

        {/* ============== ERROR NOTIFICATION ============== */}
        {error && (
          <div className="error-banner">
            <FaExclamationTriangle /> {error}
            <button onClick={() => setError(null)} className="error-close">
              <FaTimes />
            </button>
          </div>
        )}

        {/* ------------------ Dashboard TAB ------------------ */}
        {activeTab === "dashboard" && (
          <>
            {/* ============== TRUST SCORE SECTION ============== */}
            <section className="ehr-section">
              <h2>🛡️ Trust Score Analysis</h2>
              <div className="trust-section">
                {loading.trust ? (
                  <div className="loading-spinner">
                    <FaSpinner className="spin-icon" /> Loading trust score...
                  </div>
                ) : (
                  <TrustScoreMeter score={trustScore} />
                )}
              </div>
            </section>

            {/* ============== PATIENT SELECTION ============== */}
            <section className="ehr-section">
              <div className="section-header">
                <h2>🩺 Select Patient (Created by Admin)</h2>
                <button
                  className="btn btn-green btn-sm"
                  onClick={() => setShowPatientForm(true)}
                  title="Add a new patient to the system"
                >
                  ➕ Add New Patient
                </button>
              </div>
              {loading.patients ? (
                <div className="loading-spinner">
                  <FaSpinner className="spin-icon" /> Loading patients...
                </div>
              ) : (
                <>
                  <select
                    className="patient-dropdown"
                    value={selectedPatient}
                    onChange={(e) => handleSelectPatient(e.target.value)}
                  >
                    <option value="">-- Select a Patient --</option>
                    {allPatients.map((p, idx) => (
                      <option key={idx} value={p.name || p.patient_name}>
                        {p.name || p.patient_name} ({p.email || "N/A"})
                      </option>
                    ))}
                  </select>
                  <p className="section-hint">
                    💡 Select an existing patient to update their records, or click "Add New Patient" to create a new patient record.
                  </p>
                  {/* ✅ NEW: Quick action to edit selected patient in My Patients tab */}
                  <button
                    className="btn btn-blue btn-sm"
                    style={{ marginTop: "0.5rem", maxWidth: "240px" }}
                    onClick={() => selectedPatient && setActiveTab("patients")}
                    disabled={!selectedPatient}
                  >
                    <FaUserMd /> Edit Selected in My Patients
                  </button>
                </>
              )}
            </section>

            {/* ============== PATIENT RECORD FORM (moved to My Patients) ============== */}
            {selectedPatient && selectedPatientData && activeTab === "dashboard" && (
              <section className="ehr-section">
                <div className="info-banner info-banner-warning">
                  Editing of patient records is available only from the "My Patients" tab.
                </div>
              </section>
            )}

            {/* ============== ACCESS CONTROL ============== */}
            <section className="ehr-section">
              <h2>🔐 Access Control Panel</h2>
              <div className="ehr-access-grid">
                <div className="ehr-access-card green">
                  <div className="card-icon">🏥</div>
                  <h3>Normal Access</h3>
                  <p>Standard access within hospital network. Suitable for routine patient care and record reviews.</p>
                  <button
                    className="btn btn-green"
                    onClick={() => handleAccessRequest("normal")}
                    disabled={loading.access || !selectedPatient}
                  >
                    {loading.access ? (
                      <>
                        <FaSpinner className="spin-icon" /> Processing...
                      </>
                    ) : (
                      <>
                        <FaCheckCircle /> Request Access
                      </>
                    )}
                  </button>
                  {!selectedPatient && (
                    <p className="card-hint">Select a patient first</p>
                  )}
                </div>

                <div
                  className={`ehr-access-card blue ${
                    isInsideNetwork ? "disabled-card" : ""
                  }`}
                >
                  <div className="card-icon">🔒</div>
                  <h3>Restricted Access</h3>
                  <p>
                    For external consultations, research, or off-network access. Requires detailed justification.
                    {isInsideNetwork && (
                      <span className="card-warning">
                        {" "}Available only from outside network
                      </span>
                    )}
                  </p>
                  <button
                    className="btn btn-blue"
                    onClick={() => handleAccessRequest("restricted")}
                    disabled={isInsideNetwork || loading.access || !selectedPatient}
                  >
                    {loading.access ? (
                      <>
                        <FaSpinner className="spin-icon" /> Processing...
                      </>
                    ) : (
                      <>
                        <FaLock /> Request Access
                      </>
                    )}
                  </button>
                  {isInsideNetwork && (
                    <p className="card-hint">Not available in-network</p>
                  )}
                </div>

                <div className="ehr-access-card red">
                  <div className="card-icon">🚨</div>
                  <h3>Emergency Access</h3>
                  <p>Break-glass access for critical, life-threatening situations only. All emergency accesses are logged and reviewed by security.</p>
                  <button
                    className="btn btn-emergency"
                    onClick={() => handleAccessRequest("emergency")}
                    disabled={loading.access || !selectedPatient}
                  >
                    {loading.access ? (
                      <>
                        <FaSpinner className="spin-icon" /> Processing...
                      </>
                    ) : (
                      <>
                        🚨 Break Glass Access
                      </>
                    )}
                  </button>
                  {!selectedPatient && (
                    <p className="card-hint">Select a patient first</p>
                  )}
                </div>
              </div>
            </section>

            {/* ============== PATIENT DATA DISPLAY ============== */}
            {accessResponse?.patient_data &&
              Object.keys(accessResponse.patient_data).length > 0 && (
                <section className="ehr-section patient-data-section">
                  <div className="section-header">
                    <h2>📋 Patient Medical Record</h2>
                    <div className="header-actions">
                      <button
                        className="btn btn-blue btn-sm"
                        onClick={() => setShowPDFModal(true)}
                      >
                        <FaFilePdf /> View Patient Report
                      </button>
                      <button
                        className="btn btn-gray btn-sm"
                        onClick={handleDownloadPDF}
                      >
                        <FaFilePdf /> Download Patient Report
                      </button>
                    </div>
                  </div>
                  <div className="patient-info-grid">
                    {fieldOrder
                      .filter((k) => accessResponse.patient_data[k])
                      .map((key) => (
                        <div key={key} className="patient-info-item">
                          <label>{formatLabel(key)}</label>
                          <span>{accessResponse.patient_data[key]}</span>
                        </div>
                      ))}
                    {Object.entries(accessResponse.patient_data)
                      .filter(([k]) => !fieldOrder.includes(k))
                      .map(([k, v]) => (
                        <div key={k} className="patient-info-item">
                          <label>{formatLabel(k)}</label>
                          <span>{v}</span>
                        </div>
                      ))}
                  </div>
                  <div className="access-timestamp">
                    <FaClock /> Accessed on {new Date().toLocaleString()}
                  </div>
                  <p style={{ marginTop: "1.5rem", color: "#64748b", fontSize: "0.9rem", fontStyle: "italic" }}>
                    📌 Full report and PDF are available in this Dashboard after access is granted. Use the "My Patients" tab (in-network) to edit medical records.
                  </p>
                </section>
              )}
          </>
        )}

        {/* ------------------ MY PATIENTS TAB ------------------ */}
        {activeTab === "patients" && (
          <>
            {!isInsideNetwork ? (
              // ✅ Network restriction message
              <section className="ehr-section">
                <div className="error-banner" style={{ marginBottom: 0 }}>
                  <FaExclamationTriangle /> 🚫 "My Patients" is only available inside the hospital network for security purposes.
                </div>
                <div style={{ padding: "3rem 2rem", textAlign: "center", color: "#64748b" }}>
                  <p style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "1rem" }}>
                    Access Restricted
                  </p>
                  <p>
                    You are currently accessing from outside the hospital network ({ipAddress}).
                  </p>
                  <p style={{ marginTop: "1rem", fontSize: "0.95rem" }}>
                    To view and manage your patient records, please access from within the hospital network.
                  </p>
                </div>
              </section>
            ) : (
              <section className="ehr-section">
                <div className="section-header">
                  <h2>
                    <FaUserInjured /> My Patient Records ({myPatients.length})
                  </h2>
                  <button
                    className="btn btn-blue btn-sm"
                    onClick={fetchMyPatients}
                    disabled={loading.myPatients}
                  >
                    <FaSync /> Refresh
                  </button>
                </div>

                <p className="section-description">
                  Add or update medical data for your patients (reports are viewable from Dashboard after access).
                </p>

                {loading.myPatients ? (
                  <div className="loading-spinner">
                    <FaSpinner className="spin-icon" /> Loading...
                  </div>
                ) : myPatients.length > 0 ? (
                  <div className="log-table-wrapper">
                    <table className="log-table">
                      <thead>
                        <tr>
                          <th>Patient Name</th>
                          <th>Email Address</th>
                          <th>Last Updated</th>
                          <th>Updated By</th>
                          <th>Edit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myPatients.map((patient, idx) => (
                          <tr key={idx}>
                            <td className="patient-name">
                              <strong>{patient.name || "Unknown"}</strong>
                            </td>
                            <td>{patient.email || "N/A"}</td>
                            <td>{patient.last_updated_at ? new Date(patient.last_updated_at).toLocaleString() : "N/A"}</td>
                            <td>{patient.last_updated_by || "—"}</td>
                            <td>
                              <button
                                className="btn-patient-action"
                                onClick={() => {
                                  handleSelectPatient(patient.name);
                                  setActiveTab("patients");
                                }}
                                style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
                              >
                                <FaUserMd /> Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">
                    <FaUserInjured className="empty-icon" />
                    <h3>No Patient Records Updated Yet</h3>
                    <p>Select a patient from the dashboard and update their medical records to see them here.</p>
                  </div>
                )}

                {/* ============== RECORD FORM INSIDE MY PATIENTS ============== */}
                {selectedPatient && selectedPatientData && (
                  <div style={{ marginTop: "1.5rem" }}>
                    <h3 style={{ marginBottom: "1rem" }}>📋 Update Patient Medical Records</h3>
                    <div className="patient-info-display">
                      <div className="info-box">
                        <label>Patient Name:</label>
                        <span>{selectedPatientData.name || selectedPatient}</span>
                      </div>
                      <div className="info-box">
                        <label>Age:</label>
                        <span>{selectedPatientData.age || "Not specified"} {selectedPatientData.age ? "years" : ""}</span>
                      </div>
                      <div className="info-box">
                        <label>Gender:</label>
                        <span>{selectedPatientData.gender || "Not specified"}</span>
                      </div>
                      <div className="info-box">
                        <label>Email:</label>
                        <span>{selectedPatientData.email || "Not specified"}</span>
                      </div>
                    </div>

                    {!selectedPatientData.diagnosis && (
                      <div className="info-banner info-banner-new">
                        ℹ️ This patient has no medical records yet. Fill in the details below to create their first record.
                      </div>
                    )}

                    <form onSubmit={handleUpdateRecords} className="record-form">
                      <div className="form-group">
                        <label>🏥 Diagnosis *</label>
                        <input
                          type="text"
                          placeholder="e.g., Hypertension, Type-2 Diabetes"
                          value={recordForm.diagnosis}
                          onChange={(e) => setRecordForm({ ...recordForm, diagnosis: e.target.value })}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>💊 Treatment Plan</label>
                        <textarea
                          rows="3"
                          placeholder="e.g., Amlodipine 5mg daily, Regular exercise..."
                          value={recordForm.treatment}
                          onChange={(e) => setRecordForm({ ...recordForm, treatment: e.target.value })}
                        />
                      </div>

                      <div className="form-group">
                        <label>📝 Clinical Notes</label>
                        <textarea
                          rows="3"
                          placeholder="Additional observations, follow-up recommendations..."
                          value={recordForm.notes}
                          onChange={(e) => setRecordForm({ ...recordForm, notes: e.target.value })}
                        />
                      </div>

                      <button type="submit" className="btn btn-blue" disabled={recordLoading}>
                        {recordLoading ? <><FaSpinner className="spin-icon" /> Saving...</> : <>✅ {selectedPatientData.diagnosis ? "Update" : "Save"} Patient Records</>}
                      </button>
                    </form>
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {/* ------------------ Access Logs TAB ------------------ */}
        {activeTab === "accessLogs" && (
          <section className="ehr-section">
            <div className="section-header">
              <h2>
                <FaListAlt /> My Access History
              </h2>
              <button
                className="btn btn-blue btn-sm"
                onClick={fetchAccessLogs}
                disabled={loading.logs}
              >
                {loading.logs ? <FaSpinner className="spin-icon" /> : <FaSync />}
                {" "}Refresh
              </button>
            </div>
            {loading.logs ? (
              <div className="loading-spinner">
                <FaSpinner className="spin-icon" /> Loading access history...
              </div>
            ) : (
              <div className="log-table-wrapper">
                <table className="log-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Action</th>
                      <th>Patient</th>
                      <th>Justification</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length > 0 ? (
                      logs.map((log, idx) => (
                        <tr key={idx}>
                          <td>{new Date(log.timestamp).toLocaleString()}</td>
                          <td>{log.action || log.type || "—"}</td>
                          <td>{log.patient_name || "N/A"}</td>
                          <td>{log.justification?.slice(0, 50) || "—"}</td>
                          <td
                            className={
                              log.status === "Granted" || log.status === "Approved"
                                ? "status-granted"
                                : log.status === "Denied"
                                ? "status-denied"
                                : "status-info"
                            }
                          >
                            {log.status}
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
                          No access logs available yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ============== PDF PREVIEW MODAL ============== */}
        {showPDFModal && accessResponse?.pdf_link && (
          <div className="modal-overlay" onClick={() => setShowPDFModal(false)}>
            <div
              className="modal-content pdf-modal"
              style={{ maxWidth: "1080px", width: "92%", borderRadius: "14px" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header" style={{ padding: "0.85rem 1.25rem" }}>
                <h3 style={{ margin: 0 }}>
                  📄 Patient Report — {accessResponse?.patient_data?.name || selectedPatient || "Patient"}
                </h3>
                <button
                  className="modal-close-btn"
                  onClick={() => setShowPDFModal(false)}
                >
                  <FaTimes />
                </button>
              </div>
              <div className="modal-body" style={{ padding: 0 }}>
                <iframe
                  src={resolvePdfLink(accessResponse.pdf_link)}
                  title="Patient PDF Report"
                  className="pdf-iframe"
                  style={{ width: "100%", height: "78vh", border: "none", borderBottom: "1px solid #e2e8f0" }}
                />
              </div>
              <div className="modal-footer" style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                <button className="btn btn-blue" onClick={handleDownloadPDF}>
                  <FaFilePdf /> Download PDF
                </button>
                <button className="btn btn-gray" onClick={() => setShowPDFModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============== JUSTIFICATION MODAL ============== */}
        {showJustificationModal && (
          <div className="modal-overlay" onClick={() => setShowJustificationModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>📝 Access Justification Required</h3>
                <button
                  className="modal-close-btn"
                  onClick={() => setShowJustificationModal(false)}
                >
                  <FaTimes />
                </button>
              </div>
              <div className="modal-body">
                <p>Please provide a valid reason for <strong>{currentAccessType}</strong> access:</p>
                <textarea
                  className="justification-textarea"
                  rows="5"
                  placeholder="Enter detailed justification..."
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-gray"
                  onClick={() => {
                    setShowJustificationModal(false);
                    setJustification("");
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-blue"
                  onClick={() => performAccessRequest(currentAccessType, justification.trim())}
                  disabled={!justification.trim() || loading.access}
                >
                  {loading.access ? <FaSpinner className="spin-icon" /> : "Submit"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============== PATIENT FORM MODAL ============== */}
        <PatientFormModal
          isOpen={showPatientForm}
          onClose={() => setShowPatientForm(false)}
          doctorName={user.name}
          onSuccess={() => {
            fetchAllPatients(); // ✅ Refresh main patient list
            fetchMyPatients();  // ✅ Refresh "My Patients" list
            showToast("✅ Patient added successfully!", "success");
            setShowPatientForm(false);
          }}
        />
      </main>
    </div>
  );
};

export default DoctorDashboard;
