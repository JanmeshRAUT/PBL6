import React, { useState, useCallback } from "react";
import axios from "axios";
import { API_URL } from "../api";
import { getAuth } from "firebase/auth";
import { FaTimes, FaSpinner } from "react-icons/fa";
import "../css/PatientFormModal.css";

const PatientFormModal = ({ isOpen, onClose, doctorName, onSuccess }) => {
  // ✅ Helper: Get Firebase ID token
  const getFirebaseToken = useCallback(async () => {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (currentUser) {
        return await currentUser.getIdToken();
      }
      return null;
    } catch (error) {
      console.error("Error getting Firebase token:", error);
      return null;
    }
  }, []);
  const [formData, setFormData] = useState({
    patient_name: "",
    patient_email: "",
    age: "",
    gender: "Male",
    diagnosis: "",
    treatment: "",
    notes: ""
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.patient_name || !formData.patient_email || !formData.diagnosis) {
      setMessage("❌ Please fill all required fields");
      return;
    }

    try {
      setLoading(true);
      const token = await getFirebaseToken();
      const res = await axios.post(`${API_URL}/add_patient`, {
        doctor_name: doctorName,
        ...formData
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.data.success) {
        setMessage("✅ " + res.data.message);
        setTimeout(() => {
          onSuccess();
          onClose();
          setFormData({
            patient_name: "",
            patient_email: "",
            age: "",
            gender: "Male",
            diagnosis: "",
            treatment: "",
            notes: ""
          });
        }, 1500);
      }
    } catch (error) {
      setMessage("❌ " + (error.response?.data?.message || "Error adding patient"));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content patient-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>➕ Add Patient Details</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <form className="patient-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Patient Name *</label>
            <input
              type="text"
              name="patient_name"
              value={formData.patient_name}
              onChange={handleChange}
              placeholder="Full name"
              required
            />
          </div>

          <div className="form-group">
            <label>Email Address *</label>
            <input
              type="email"
              name="patient_email"
              value={formData.patient_email}
              onChange={handleChange}
              placeholder="Email"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Age</label>
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleChange}
                placeholder="Age"
                min="1"
              />
            </div>
            <div className="form-group">
              <label>Gender</label>
              <select name="gender" value={formData.gender} onChange={handleChange}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Diagnosis *</label>
            <input
              type="text"
              name="diagnosis"
              value={formData.diagnosis}
              onChange={handleChange}
              placeholder="Primary diagnosis"
              required
            />
          </div>

          <div className="form-group">
            <label>Treatment Plan</label>
            <textarea
              name="treatment"
              value={formData.treatment}
              onChange={handleChange}
              placeholder="Treatment details"
              rows="3"
            />
          </div>

          <div className="form-group">
            <label>Clinical Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Additional notes"
              rows="3"
            />
          </div>

          {message && <p className={`form-message ${message.includes("✅") ? "success" : "error"}`}>{message}</p>}

          <div className="modal-footer">
            <button type="button" className="btn btn-gray" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-blue" disabled={loading}>
              {loading ? <><FaSpinner className="spin-icon" /> Saving...</> : "Save Patient"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PatientFormModal;
