import React from "react";
import { FaUserInjured } from "react-icons/fa";
import "../../css/NurseAccessLogsTab.css";

const NursePatientsTab = ({ patients }) => {
  return (
    <div className="logs-content-wrapper">
       <div className="logs-tab-header">
        <div className="logs-header-group">
          <div className="logs-header-icon">
            <FaUserInjured />
          </div>
          <div className="logs-header-title">
             <h2>All Patients</h2>
             <p>Directory of all registered patients in the system</p>
          </div>
        </div>
       </div>

      <div className="logs-table-container">
        {patients.length > 0 ? (
          <div className="logs-scroll-area">
            <table className="logs-table">
              <thead>
                <tr>
                  <th style={{ width: '30%' }}>Patient Name</th>
                  <th style={{ width: '30%' }}>Email Address</th>
                  <th style={{ width: '20%' }}>Age / Gender</th>
                  <th style={{ width: '20%' }}>Medical ID</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p, idx) => (
                  <tr key={idx}>
                    <td>
                        <div className="log-patient-cell">
                          <div className="patient-icon-circle" style={{ background: '#e0e7ff', color: '#4338ca' }}>
                            <FaUserInjured />
                          </div>
                          <span className="patient-name-text" style={{ fontWeight: 600 }}>{p.name}</span>
                        </div>
                    </td>
                    <td style={{ color: '#64748b' }}>{p.email || "N/A"}</td>
                    <td>
                      <span className="info-badge" style={{ 
                        background:'#f1f5f9', 
                        padding:'4px 8px', 
                        borderRadius:'6px', 
                        fontSize:'0.85rem',
                        color:'#475569',
                        fontWeight: 500
                      }}>
                        {p.age ? `${p.age} yrs` : "—"} / {p.gender || "—"}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', color: '#64748b' }}>
                        {p.patient_id || `#${idx + 1001}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="logs-empty">
            <h3>No patients found</h3>
          </div>
        )}
      </div>
    </div>
  );
};

export default NursePatientsTab;
