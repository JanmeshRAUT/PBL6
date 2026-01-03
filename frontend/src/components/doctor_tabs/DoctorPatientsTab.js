import React from 'react';
import { 
  FaUserInjured, 
  FaSync, 
  FaSpinner, 
  FaArrowLeft,
  FaCheckCircle 
} from 'react-icons/fa';
import "../../css/DoctorPatientsTab.css";

const DoctorPatientsTab = ({
  myPatients,
  loading,
  selectedPatient,
  selectedPatientData,
  recordForm,
  setRecordForm,
  handleSelectPatient,
  handleUpdateRecords,
  fetchMyPatients,
  setSelectedPatient,
  isInsideNetwork
}) => {
  return (
    <div className="patients-content-wrapper">
      {!selectedPatient ? (
        /* VIEW 1: PATIENT REGISTRY (List View) */
        <>
          {/* Header */}
          <div className="patients-tab-header">
            <div className="header-left-group">
              <div className="header-icon-box">
                <FaUserInjured />
              </div>
              <div className="header-title-box">
                <h2>Patient Registry</h2>
                <p>
                  Manage medical records and track {myPatients.length} active patients
                </p>
              </div>
            </div>
            <button
              className="btn btn-outline btn-sm btn-refresh"
              onClick={fetchMyPatients}
              disabled={loading.myPatients}
            >
              {loading.myPatients ? <FaSpinner className="spin-icon" /> : <FaSync />} Refresh List
            </button>
          </div>

          {/* Table Content */}
          <div className="patients-table-container">
            {loading.myPatients ? (
              <div className="loading-state">
                <FaSpinner className="spin-icon large-spinner" />
                <p>Loading patient records...</p>
              </div>
            ) : myPatients.length > 0 ? (
              <div className="table-scroll-area">
                <table className="patients-table">
                  <thead>
                    <tr>
                      <th className="th-patient">Patient / Email</th>
                      <th className="th-demographics">Demographics</th>
                      <th className="th-diagnosis">Medical Diagnosis</th>
                      <th>Last Update</th>
                      <th>Status</th>
                      <th className="th-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myPatients.map((patient, idx) => (
                      <tr key={idx}>
                        <td>
                          <div className="patient-cell">
                            <div className="patient-name">{patient.name}</div>
                            <div className="patient-email">{patient.email}</div>
                            <div className="patient-id-badge">{patient.patient_id}</div>
                          </div>
                        </td>
                        <td>
                          <div className="demographics-cell">
                            {patient.age ? `${patient.age} yrs` : "—"} <span className="separator-pipe">|</span> {patient.gender || "—"}
                          </div>
                        </td>
                        <td>
                          <div className="diagnosis-cell">
                            {patient.diagnosis || <span className="text-muted">Not Diagnosed</span>}
                          </div>
                        </td>
                        <td>
                          <div className="date-cell">
                            {patient.last_updated_at ? new Date(patient.last_updated_at).toLocaleDateString() : "Never"}
                          </div>
                        </td>
                        <td>
                          <div className="status-cell">
                            <span className={`badge ${patient.diagnosis ? 'badge-active' : 'badge-new'}`}>
                              {patient.diagnosis ? "Active" : "New"}
                            </span>
                          </div>
                        </td>
                        <td className="col-actions">
                          <button 
                            className="btn-details"
                            onClick={() => handleSelectPatient(patient.name)}
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon-circle">
                  <FaUserInjured />
                </div>
                <h3>No Patients Found</h3>
                <p>Patients assigned to you will appear here.</p>
              </div>
            )}
          </div>
        </>
      ) : (
        /* VIEW 2: EDIT FORM (Full View) */
        selectedPatientData && (
          <div className="patient-edit-full-view">
            {/* Edit Header */}
            <div className="edit-header">
              <div className="edit-header-left">
                <button 
                  className="btn-back-registry"
                  onClick={() => setSelectedPatient("")}
                >
                  <FaArrowLeft /> Back to Registry
                </button>
                <div className="separator"></div>
                <div>
                  <h3 className="edit-patient-name">{selectedPatientData.name}</h3>
                  <p className="edit-last-update">
                    Last updated: {selectedPatientData.last_updated_at ? new Date(selectedPatientData.last_updated_at).toLocaleString() : "Never"}
                  </p>
                </div>
              </div>
              <div className="status-indicator">
                <span className={`badge ${selectedPatientData.diagnosis ? 'badge-active' : 'badge-new'}`}>
                  {selectedPatientData.diagnosis ? "Active Record" : "New Record"}
                </span>
              </div>
            </div>

            {/* Edit Body */}
            <div className="edit-form-scroll">
              <div className="edit-form-wrapper">
                <form onSubmit={handleUpdateRecords} className="record-form">
                  
                  <div className="form-section">
                    <h4 className="form-section-title">
                      1. Primary Diagnosis
                    </h4>
                    <div className="form-group">
                      <label>
                        Medical Condition <span className="required-star">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        value={recordForm.diagnosis}
                        onChange={(e) => setRecordForm({ ...recordForm, diagnosis: e.target.value })}
                        placeholder="e.g. Chronic Hypertension, Type 2 Diabetes..."
                        required
                      />
                    </div>
                  </div>

                  <div className="form-section">
                    <h4 className="form-section-title">
                      2. Clinical Details
                    </h4>
                    <div className="form-grid-2">
                      <div className="form-group">
                        <label>Treatment Plan & Medication</label>
                        <textarea
                          className="form-textarea"
                          rows="8"
                          value={recordForm.treatment}
                          onChange={(e) => setRecordForm({ ...recordForm, treatment: e.target.value })}
                          placeholder="List prescribed medications, therapies, and dosage instructions..."
                        />
                      </div>
                      <div className="form-group">
                        <label>Doctor's Notes & Observations</label>
                        <textarea
                          className="form-textarea"
                          rows="8"
                          value={recordForm.notes}
                          onChange={(e) => setRecordForm({ ...recordForm, notes: e.target.value })}
                          placeholder="Enter clinical observations, patient complaints, or follow-up instructions..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-actions-footer">
                    <button 
                      type="button" 
                      className="btn btn-outline btn-cancel" 
                      onClick={() => setSelectedPatient("")}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="btn btn-blue btn-save" 
                      disabled={loading.update} 
                    >
                      {loading.update ? <FaSpinner className="spin-icon" /> : <FaCheckCircle />} 
                      Save & Update Record
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default DoctorPatientsTab;
