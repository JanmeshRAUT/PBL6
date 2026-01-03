import React from 'react';
import { FaFilePdf, FaLock } from 'react-icons/fa';
import "../../css/Skeleton.css";

const DoctorMedicalReport = ({ 
  patientData, 
  setShowPDFModal, 
  handleDownloadPDF,
  isLoading 
}) => {
  if (isLoading) {
    return (
        <section className="medical-report-container compact">
             <div className="report-loading-skeleton" style={{padding: "1rem"}}>
                {/* Header Skeleton */}
                <div style={{display: "flex", justifyContent: "space-between", marginBottom: "2rem"}}>
                    <div style={{width: "40%"}}> <div className="skeleton skeleton-title"></div> <div className="skeleton skeleton-text narrow"></div> </div>
                    <div style={{width: "20%"}}> <div className="skeleton skeleton-block" style={{height: "40px"}}></div> </div>
                </div>
                {/* Content Skeleton */}
                <div className="skeleton" style={{height: "1px", width: "100%", marginBottom: "1.5rem"}}></div>
                <div style={{display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem"}}>
                     <div className="skeleton skeleton-block" style={{height: "100px"}}></div>
                     <div className="skeleton skeleton-block" style={{height: "100px"}}></div>
                     <div className="skeleton skeleton-block" style={{height: "100px"}}></div>
                </div>
             </div>
        </section>
    )
  }

  if (!patientData || Object.keys(patientData).length === 0) return null;

  return (
    <section className="medical-report-container compact">
      {/* Compact Header */}
      <div className="report-header">
        <div>
          <h2 className="report-header-title">
            Medical Status Report
          </h2>
          <p className="report-subtitle">
            CONFIDENTIAL PATIENT RECORD
          </p>
        </div>
        <div className="report-actions">
          <button
            className="btn btn-blue btn-sm"
            onClick={() => setShowPDFModal(true)}
          >
            <FaFilePdf /> View
          </button>
          <button
            className="btn btn-gray btn-sm"
            onClick={handleDownloadPDF}
          >
            <FaFilePdf /> Download
          </button>
        </div>
      </div>

      {/* Compact Demographics Grid */}
      <div className="report-demographics">
        <div className="demographic-item">
          <strong>Patient Name</strong>
          <span>{patientData.name || "Unknown"}</span>
        </div>
        <div className="demographic-item">
          <strong>Email</strong>
          <span>{patientData.email || "N/A"}</span>
        </div>
        <div className="demographic-item">
          <strong>Age / Gender</strong>
          <span>{patientData.age || "—"} / {patientData.gender || "—"}</span>
        </div>
        <div className="demographic-item">
          <strong>Last Visit</strong>
          <span>{patientData.last_visit || "Not recorded"}</span>
        </div>
      </div>

      {/* Compact Content Grid */}
      <div className="report-content-grid">
        {/* Diagnosis */}
        <div>
          <h3 className="report-section-title">Medical Diagnosis</h3>
          <div className="diagnosis-box">
            {patientData.diagnosis || "Pending Evaluation"}
          </div>
        </div>

        {/* Treatment */}
        <div>
          <h3 className="report-section-title">Treatment Plan</h3>
          <p className="report-text">
            {patientData.treatment || "No treatment plan recorded."}
          </p>
        </div>

        {/* Notes */}
        <div>
          <h3 className="report-section-title">Clinical Notes</h3>
          <p className="report-text">
            {patientData.notes || "No clinical notes available."}
          </p>
        </div>
      </div>

      <div className="report-footer">
        <FaLock /> This report is encrypted and access-logged. Unauthorized sharing is prohibited.
      </div>
    </section>
  );
};

export default DoctorMedicalReport;
