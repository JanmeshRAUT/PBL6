import React, { useState, useCallback, useEffect } from "react";
import axios from "axios";
import { API_URL } from "../api";
import { useNavigate } from "react-router-dom";
import PatientFormModal from "./PatientFormModal";
import DoctorHomeTab from "./doctor_tabs/DoctorHomeTab";
import DoctorPatientsTab from "./doctor_tabs/DoctorPatientsTab";
import DoctorAccessLogsTab from "./doctor_tabs/DoctorAccessLogsTab";
import DoctorPermissionsTab from "./doctor_tabs/DoctorPermissionsTab";
import DoctorAlertsTab from "./doctor_tabs/DoctorAlertsTab";
import { getAuth } from "firebase/auth";
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
  FaFilePdf,
  FaTimes,
  FaCheckCircle,
  FaSpinner,
} from "react-icons/fa";
import "../css/Doctor.css";
import "../css/Notifications.css";
import "../css/MedicalReport.css"; 

const DoctorDashboard = ({ user, onLogout }) => {
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
            resolve(null);
          }
        });
      }
    });
  }, []);

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

  // ✅ New: Enhanced loading and error states
  const [loading, setLoading] = useState({
    trust: false,
    patients: false,
    logs: false,  
    access: false,
    myPatients: false,
    update: false, // ✅ Added for record updates
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

  // ✅ Improved Fetch Trust Score - Only updates when value changes
  const fetchTrustScore = useCallback(async () => {
    if (!user?.name) return;
    try {
      setLoading((prev) => ({ ...prev, trust: true }));
      const res = await axios.get(
        `${API_URL}/trust_score/${user.name}`
      );
      const newScore = res.data.trust_score || 0;
      
      // ✅ Only update state if trust score actually changed
      setTrustScore((prevScore) => {
        if (prevScore !== newScore) {
          console.log(`🔄 Trust score updated: ${prevScore} → ${newScore}`);
          return newScore;
        }
        return prevScore;
      });
      
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
      
      // Get Firebase ID token
      const token = await getFirebaseToken();
      
      if (!token) {
        console.warn("Skipping patient fetch: No valid token available");
        setLoading(prev => ({ ...prev, patients: false }));
        return;
      }

      const res = await axios.get(`${API_URL}/all_patients`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
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
  }, [getFirebaseToken]);

  // ✅ Improved Fetch Access Logs - Uses new DoctorAccessLog collection
  const fetchAccessLogs = useCallback(async () => {
    if (!user?.name) return;
    try {
      setLoading((prev) => ({ ...prev, logs: true }));
      // ✅ NEW: Use dedicated DoctorAccessLog endpoint
      const res = await axios.get(
        `${API_URL}/doctor_access_logs/${user.name}`
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
        `${API_URL}/doctor_patients/${user.name}`
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

  // ✅ Lifecycle Setup - Removed automatic polling
  useEffect(() => {
    if (!user?.name) return;

    fetchTrustScore();
    fetchAllPatients();
    fetchIPAndNetwork();
    logLoginAccess();
    fetchAccessLogs();
    fetchMyPatients();

    // ✅ REMOVED: Automatic polling interval - trust score now updates only on-demand
    // Trust score will be fetched after actions that affect it (access requests, etc.)
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
      <div className="session-expired-container">
        <p className="session-expired-text">
          ❌ Session expired or invalid user data
        </p>
        <button
          onClick={() => navigate("/")}
          className="session-expired-btn"
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

      const token = await getFirebaseToken();
      const res = await axios.post(`${API_URL}/${type}_access`, {
        name: user.name,
        role: user.role,
        patient_name: selectedPatient,
        justification: reason,
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.data.success) {
        setAccessResponse(res.data);
        showToast(cleanToastMessage(res.data.message), "success");
        
        // Auto-show PDF modal DISABLE as per user request
        // if (res.data.patient_data && Object.keys(res.data.patient_data).length > 0) {
        //   setTimeout(() => setShowPDFModal(true), 500);
        // }
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
    // Remove leading slash to prevent double slash if API_URL ends with one
    const cleanLink = link.startsWith("/") ? link.substring(1) : link;
    return `${API_URL}/${cleanLink}`;
  };

  // ✅ Handle PDF Download (Secure)
  const handleDownloadPDF = async () => {
    if (accessResponse?.pdf_link) {
      try {
        const token = await getFirebaseToken();
        const link = resolvePdfLink(accessResponse.pdf_link);
        
        // Append token to URL
        const urlObj = new URL(link);
        urlObj.searchParams.append("token", token);
        
        window.open(urlObj.toString(), "_blank");
      } catch (error) {
        console.error("Access token error for PDF:", error);
        alert("Authentication failed for PDF download.");
      }
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
      const token = await getFirebaseToken();
      const res = await axios.get(
        `${API_URL}/get_patient/${patientName.toLowerCase()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
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
    setLoading(prev => ({ ...prev, update: true }));
    
    // ✅ CORRECT: POST to /update_patient (no patient name in URL)
      const token = await getFirebaseToken();
      const res = await axios.post(`${API_URL}/update_patient`, {
        patient_name: selectedPatient,
        updated_by: user.name,
        updates: {
          diagnosis: recordForm.diagnosis.trim(),
          treatment: recordForm.treatment.trim(),
          notes: recordForm.notes.trim(),
        }
      }, {
        headers: {
          Authorization: `Bearer ${token}`
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
    setLoading(prev => ({ ...prev, update: false }));
  }
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
            <li 
              className={activeTab === "permissions" ? "active" : ""}
              onClick={() => setActiveTab("permissions")}
              title="View your access permissions"
            >
              <FaLock /> Permissions
            </li>
            <li 
              className={activeTab === "alerts" ? "active" : ""}
              onClick={() => setActiveTab("alerts")}
              title="View system alerts and notifications"
            >
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
        {/* Header - Fixed at top */}
        <header className="ehr-header">
          <div className="header-left">
            <h1>Welcome, Dr. {user.name}</h1>
            <p className="user-role">Role: {user.role}</p>
          </div>

          <div className="header-right">
            <div className="status-badge network">
              <FaCheckCircle /> {isInsideNetwork ? "In Network" : "External"}
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

        {/* ============== ERROR NOTIFICATION ============== */}
        {error && (
          <div className="error-banner">
            <FaExclamationTriangle /> {error}
            <button onClick={() => setError(null)} className="error-close">
              <FaTimes />
            </button>
          </div>
        )}

        {/* ============== SCROLLABLE CONTENT WRAPPER ============== */}
        <div className="ehr-content-wrapper">
        {/* ------------------ Dashboard TAB ------------------ */}
        {activeTab === "dashboard" && (
          <DoctorHomeTab 
            trustScore={trustScore}
            loading={loading}
            logs={logs}
            setActiveTab={setActiveTab}
            allPatients={allPatients}
            selectedPatient={selectedPatient}
            handleSelectPatient={handleSelectPatient}
            setShowPatientForm={setShowPatientForm}
            isInsideNetwork={isInsideNetwork}
            handleAccessRequest={handleAccessRequest}
            accessResponse={accessResponse}
            setShowPDFModal={setShowPDFModal}
            handleDownloadPDF={handleDownloadPDF}
            ipAddress={ipAddress}
          />
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
                <div className="restricted-access-container">
                  <p className="restricted-access-title">
                    Access Restricted
                  </p>
                  <p>
                    You are currently accessing from outside the hospital network ({ipAddress}).
                  </p>
                  <p className="restricted-access-text">
                    To view and manage your patient records, please access from within the hospital network.
                  </p>
                </div>
              </section>
            ) : (
            <DoctorPatientsTab 
              myPatients={myPatients}
              loading={loading}
              selectedPatient={selectedPatient}
              selectedPatientData={selectedPatientData}
              recordForm={recordForm}
              setRecordForm={setRecordForm}
              handleSelectPatient={handleSelectPatient}
              handleUpdateRecords={handleUpdateRecords}
              fetchMyPatients={fetchMyPatients}
              setSelectedPatient={setSelectedPatient}
              isInsideNetwork={isInsideNetwork}
            />
            )}
          </>
        )}

        {/* ------------------ Access Logs TAB ------------------ */}
        {activeTab === "accessLogs" && (
          <DoctorAccessLogsTab 
            logs={logs}
            loading={loading.logs}
            fetchAccessLogs={fetchAccessLogs}
          />
        )}

        {/* ------------------ Permissions TAB ------------------ */}
        {activeTab === "permissions" && (
            <DoctorPermissionsTab user={user} />
        )}

        {/* ------------------ Alerts TAB ------------------ */}
        {activeTab === "alerts" && (
            <DoctorAlertsTab />
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
        </div> {/* Close ehr-content-wrapper */}
      </main>
    </div>
  );
};

export default DoctorDashboard;
