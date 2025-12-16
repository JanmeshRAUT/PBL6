import React, { useState } from "react";
import "../css/JustificationModal.css";

const JustificationModal = ({ onClose, onSubmit }) => {
  const [justification, setJustification] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!justification.trim()) {
      alert("Please enter a justification for your request!");
      return;
    }
    onSubmit(justification.trim());
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Restricted Access Justification</h3>
          <button className="modal-close-btn" onClick={onClose}>✖</button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          <p>
            You are outside the hospital network.  
            Please provide a valid reason for requesting access.
          </p>
          <textarea
            rows="5"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="Explain your reason (e.g., reviewing patient case study)..."
          ></textarea>

          <div className="modal-footer">
            <button type="button" className="btn btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-submit">
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JustificationModal;
