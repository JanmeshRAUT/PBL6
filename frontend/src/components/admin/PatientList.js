import React, { useState } from "react";
import { FaSync, FaSearch } from "react-icons/fa";

const PatientList = ({ patients, fetchPatients, loading }) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPatients = patients.filter(
    (p) =>
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
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
                <td
                  colSpan="5"
                  style={{
                    textAlign: "center",
                    color: "#64748b",
                    padding: "2rem",
                  }}
                >
                  No patients found
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
