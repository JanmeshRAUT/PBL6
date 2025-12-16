import React, { useState, useEffect } from "react";
import "../css/EmergencyAccessModal.css";

const EmergencyAccessModal = ({ onClose }) => {
  const [reason, setReason] = useState("");
  const [show, setShow] = useState(false);


  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = () => {
    if (reason.trim().length < 5) {
      alert("Please provide a valid justification (minimum 5 characters).");
      return;
    }
    alert("✅ Emergency Access Granted – AI Verified 🚑");
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className={`modal-content ${show ? "modal-show" : ""}`}>
        <h2 className="modal-title">🚨 Emergency Access Justification</h2>
        <textarea
          className="modal-textarea"
          rows={4}
          placeholder="Explain reason for emergency access..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        ></textarea>
        <div className="modal-actions">
          <button className="modal-btn cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="modal-btn submit" onClick={handleSubmit}>
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmergencyAccessModal;
