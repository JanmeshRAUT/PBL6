import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  FaUserMd, 
  FaSpinner,
  FaSearch,
  FaUserPlus,
  FaTimes,
  FaUserFriends,
  FaClipboardCheck,
  FaServer,
  FaArrowLeft
} from 'react-icons/fa';
import TrustScoreMeter from "../TrustScoreMeter";
import DoctorMedicalReport from "./DoctorMedicalReport";
import "../../css/DoctorHomeTab.css";
import "../../css/DashboardStats.css";

const DoctorHomeTab = ({
  trustScore,
  loading,
  logs,
  setActiveTab,
  allPatients,
  selectedPatient,
  handleSelectPatient,
  setShowPatientForm,
  isInsideNetwork,
  handleAccessRequest,
  accessResponse,
  setShowPDFModal,
  handleDownloadPDF
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState('');
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showMedicalRecordPage, setShowMedicalRecordPage] = useState(false); // NEW: State for medical record page
  const searchRef = useRef(null);

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter patients based on search term
  const filteredPatients = useMemo(() => {
    if (!searchTerm.trim()) return allPatients;
    return allPatients.filter(p => {
      const name = (p.name || p.patient_name || "").toLowerCase();
      const email = (p.email || "").toLowerCase();
      const term = searchTerm.toLowerCase();
      return name.includes(term) || email.includes(term);
    });
  }, [allPatients, searchTerm]);

  // Sync search term with selected patient when it changes
  useEffect(() => {
    if (selectedPatient) {
      setSearchTerm(selectedPatient);
    }
  }, [selectedPatient]);

  const onSelectItem = (name) => {
    handleSelectPatient(name);
    setSearchTerm(name);
    setIsSearchOpen(false);
  };
  
  /* --- AI PRE-CHECK LOGIC --- */
  const [checkStatus, setCheckStatus] = useState({ message: "", color: "#94a3b8" }); // Default Slate
  const debounceRef = useRef(null);

  useEffect(() => {
    // Reset if empty
    if (!emergencyReason.trim()) {
        setCheckStatus({ message: "", color: "#94a3b8" });
        return;
    }

    // Debounce API Call
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    setCheckStatus({ message: "Checking...", color: "#64748b" });

    debounceRef.current = setTimeout(async () => {
        try {
            const res = await fetch("http://localhost:5000/api/access/precheck", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ justification: emergencyReason })
            });
            const data = await res.json();
            
            if (data.status === "valid") {
                setCheckStatus({ message: data.message, color: "#16a34a" }); // Green
            } else if (data.status === "weak") {
                setCheckStatus({ message: data.message, color: "#ca8a04" }); // Yellow/Orange
            } else {
                setCheckStatus({ message: data.message, color: "#dc2626" }); // Red
            }
        } catch (err) {
            console.error("Pre-check failed", err);
            setCheckStatus({ message: "Offline check unavailable", color: "#94a3b8" });
        }
    }, 600); // 600ms delay

  }, [emergencyReason]);

  // NEW: Check if we should show medical record page automatically when access is granted
  useEffect(() => {
    if (accessResponse?.patient_data && Object.keys(accessResponse.patient_data).length > 0) {
      setShowMedicalRecordPage(true);
    }
  }, [accessResponse]);
  
  // NEW: If showing medical record page, render that instead
  if (showMedicalRecordPage && accessResponse?.patient_data) {
    return (
      <div className="medical-record-page">
        <div className="medical-record-header">
          <button 
            className="btn-back"
            onClick={() => setShowMedicalRecordPage(false)}
          >
            <FaArrowLeft /> Back to Dashboard
          </button>
          <h1>Medical Record - {accessResponse.patient_data.name || selectedPatient}</h1>
        </div>
        
        <DoctorMedicalReport
          patientData={accessResponse.patient_data}
          setShowPDFModal={setShowPDFModal}
          handleDownloadPDF={handleDownloadPDF}
          isLoading={loading}
        />
      </div>
    );
  }
  
  return (
    <div className="dashboard-grid">
      
      {/* ============== LEFT COLUMN: TRUST & ACTIVITY ============== */}
      <div className="trust-panel">
        <section className="ehr-section trust-panel-content">
          <h2>🛡️ Trust Score</h2>
          
          {/* Meter Section */}
          <div className="meter-section">
             {loading.trust ? (
              <div className="loading-spinner">
                <FaSpinner className="spin-icon" /> Loading...
              </div>
            ) : (
              <TrustScoreMeter score={trustScore} />
            )}
          </div>

          {/* Recent Activity Mini-Section */}
          <div className="activity-section">
            <h3 className="activity-heading">
              Recent Activity
            </h3>
            
            <div className="activity-list">
              {logs.slice(0, 3).map((log, index) => (
                <div key={index} className="activity-item">
                  <div 
                    className={`activity-indicator ${
                      log.status === "Success" || log.status === "Granted" ? "success" : "error"
                    }`} 
                  />
                  <div className="activity-item-content">
                     <div className="activity-action">
                       {log.action}
                     </div>
                     <div className="activity-time">
                       {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                     </div>
                  </div>
                </div>
              ))}
              {logs.length === 0 && (
                <p className="activity-empty">
                  No recent activity recorded.
                </p>
              )}
            </div>
            
            <button 
              onClick={() => setActiveTab("accessLogs")} 
              className="btn-view-all"
            >
              View All Activity →
            </button>
          </div>
        </section>
      </div>

      {/* ============== RIGHT COLUMN: MAIN CONTENT ============== */}
      <div className="dashboard-main-content">
        
       {/* 0. QUICK STATS ROW */}
       <div className="stats-grid-row">
          <div className="stat-card stat-blue">
              <div className="stat-icon-wrapper"><FaUserFriends /></div>
              <div className="stat-content">
                  <div className="stat-value">{allPatients.length}</div>
                  <div className="stat-label">Total Patients</div>
              </div>
          </div>
          <div className="stat-card stat-green">
              <div className="stat-icon-wrapper"><FaClipboardCheck /></div>
              <div className="stat-content">
                  <div className="stat-value">{logs.length}</div>
                  <div className="stat-label">Total Activities</div>
              </div>
          </div>
          <div className="stat-card stat-purple">
              <div className="stat-icon-wrapper"><FaServer /></div>
              <div className="stat-content">
                  <div className="stat-value">98.5%</div>
                  <div className="stat-label">System Uptime</div>
              </div>
          </div>
       </div>

        {/* 1. PATIENT MANAGEMENT - PROFESSIONAL TOOLBAR */}
        <div className="patient-panel">
          <section className="ehr-section toolbar-section">
            <div className="toolbar-header-row">
               <h2 className="toolbar-title"><FaUserMd /> Patient Records Management</h2>
               <div className="toolbar-side-actions">
                  <button
                    className="btn-pro btn-pro-green"
                    onClick={() => setShowPatientForm(true)}
                  >
                    <FaUserPlus /> <span>Register New Patient</span>
                  </button>
               </div>
            </div>

            <div className="patient-toolbar-content">
              <div className="search-field-wrapper" ref={searchRef}>
                <FaSearch className="field-icon" />
                <input
                  type="text"
                  className="patient-input-pro"
                  placeholder="Search by Patient Name or Medical ID..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                />
                
                {searchTerm && (
                  <button 
                    className="clear-search-btn"
                    onClick={() => {
                        setSearchTerm("");
                        handleSelectPatient("");
                        setIsSearchOpen(false);
                    }}
                  >
                    <FaTimes />
                  </button>
                )}

                {/* Autocomplete Dropdown */}
                {isSearchOpen && (
                  <div className="search-results-dropdown">
                    {filteredPatients.length > 0 ? (
                      filteredPatients.map((p, idx) => (
                        <div 
                          key={idx} 
                          className={`result-item ${selectedPatient === (p.name || p.patient_name) ? 'active' : ''}`}
                          onClick={() => onSelectItem(p.name || p.patient_name)}
                        >
                          <div className="result-avatar">
                            {(p.name || p.patient_name || "?")[0].toUpperCase()}
                          </div>
                          <div className="result-info">
                            <span className="result-name">{p.name || p.patient_name}</span>
                            <span className="result-email">{p.email || "No email available"}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-results">
                        🚫 No patients found matching "{searchTerm}"
                      </div>
                    )}
                  </div>
                )}
              </div>

              {selectedPatient && (
                <button
                  className="btn-pro btn-pro-indigo"
                  onClick={() => setActiveTab("patients")}
                  title="Edit Patient Details"
                >
                  <FaUserMd /> Edit Record
                </button>
              )}
            </div>
          </section>
        </div>

        {/* 2. ACCESS CONTROL */}
        <div className="access-panel">
        <section className="ehr-section">
          <h2>🔐 Request Access</h2>
          <div className="ehr-access-grid">
            <div className="ehr-access-card green">
              <div className="card-icon">🏥</div>
              <h3>Normal</h3>
              <p>Full access for routine care and daily rounds. Available only within hospital Wi-Fi.</p>
              <button
                className="btn btn-green btn-block"
                onClick={() => handleAccessRequest("normal")}
                disabled={loading.access || !selectedPatient}
              >
                {loading.access ? "Processing..." : "Request Access"}
              </button>
            </div>

            <div
              className={`ehr-access-card blue ${
                isInsideNetwork ? "disabled-card" : ""
              }`}
            >
              <div className="card-icon">🔒</div>
              <h3>Restricted</h3>
              <p>
                 Limited read-only access for remote viewing. Sensitive details are masked.
                {isInsideNetwork && <small className="card-warning"> (Remote only)</small>}
              </p>
              <button
                className="btn btn-blue btn-block"
                onClick={() => handleAccessRequest("restricted")}
                disabled={isInsideNetwork || loading.access || !selectedPatient}
              >
                Request Access
              </button>
            </div>

            <div className="ehr-access-card red">
              <div className="card-icon">🚨</div>
              <h3>Emergency</h3>
              <p>Immediate "Break-Glass" access for critical situations. All actions are strictly audited.</p>
              <button
                className="btn btn-emergency btn-block"
                onClick={() => setShowEmergencyModal(true)}
                disabled={loading.access || !selectedPatient}
              >
                Break Glass
              </button>
            </div>
          </div>
        </section>
        </div>
        
      </div> {/* End dashboard-main-content */}

      {/* Emergency Justification Modal */}
      {showEmergencyModal && (
        <div className="modal-overlay">
          <div className="modal-content emergency-modal">
            <div className="modal-header emergency-header">
              <h2>🚨 Emergency Access Confirmation</h2>
              <button className="close-btn" onClick={() => setShowEmergencyModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p className="warning-text">
                 You are about to break the glass for patient <strong>{selectedPatient}</strong>. 
                 This action will be logged and audited by the administration.
              </p>
              <label>Mandatory Justification:</label>
              <textarea 
                  className="emergency-reason-input"
                  placeholder="Clinical reason for emergency access..."
                  value={emergencyReason}
                  onChange={(e) => setEmergencyReason(e.target.value)}
                  autoFocus
              />
              <p style={{
                  color: checkStatus.color, 
                  fontSize: '0.85rem', 
                  fontWeight: '600', 
                  marginTop: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  minHeight: '1.25rem'
              }}>
                 {checkStatus.message}
              </p>
            </div>
            <div className="modal-footer">
               <button className="btn btn-gray" onClick={() => setShowEmergencyModal(false)}>Cancel</button>
               <button 
                  className="btn btn-emergency"
                  onClick={() => {
                      handleAccessRequest("emergency", emergencyReason);
                      setShowEmergencyModal(false);
                      setEmergencyReason("");
                  }}
                  disabled={!emergencyReason.trim()}
               >
                 Confirm & Break Glass
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorHomeTab;
