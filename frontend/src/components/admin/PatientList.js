import React, { useState } from "react";
import { FaSync, FaSearch } from "react-icons/fa";

const PatientList = ({ patients, fetchPatients, loading }) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPatients = patients.filter(
    (p) =>
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.patient_id && p.patient_id.toLowerCase().includes(searchQuery.toLowerCase()))
  );



  return (
    <section className="admin-section">
      <div className="admin-section-header">
        <h2>📋 Patient Registry</h2>
        <button
          className="med-btn med-btn-primary med-btn-sm"
          onClick={fetchPatients}
          disabled={loading}
        >
          <FaSync /> <span>Refresh</span>
        </button>
      </div>

      <div className="admin-content-area no-padding-bottom">
        <div className="flex-between mb-2">
            <p className="section-description no-padding">
                Manage all registered patients.
            </p>
            <div className="med-search-bar">
                <FaSearch className="med-search-icon" />
                <input
                type="text"
                placeholder="Search patients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="med-search-input"
                />
            </div>
        </div>
      </div>

      <div className="admin-table-wrapper no-top-border">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Patient ID</th>
              <th>Patient Name</th>
              <th>Contact Email</th>
              <th>Age</th>
              <th>Primary Diagnosis</th>
              <th>Assigned Doctor</th>
            </tr>
          </thead>
          <tbody>
            {filteredPatients.length > 0 ? (
              filteredPatients.map((p, idx) => (
                <tr key={idx}>
                  <td className="text-mono sub-strong">{p.patient_id || "—"}</td>
                  <td className="user-name">{p.name}</td>
                  <td>{p.email}</td>
                  <td>{p.age || "—"}</td>
                  <td>{p.diagnosis || <span className="text-muted">Not Diagnosed</span>}</td>
                  <td>
                    {p.doctor_assigned ? (
                        <span className="role-badge bg-blue-soft">{p.doctor_assigned}</span>
                    ) : (
                        <span className="text-muted" style={{ fontSize: "0.85rem" }}>Unassigned</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5">
                   <div className="empty-state">
                    <span className="empty-state-icon">📋</span>
                    <span>No patients found</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default PatientList;
