import React from 'react';
import { FaLock, FaUserMd, FaCheckCircle } from 'react-icons/fa';
import "../../css/DoctorPermissionsTab.css";

const DoctorPermissionsTab = ({ user }) => {
  const permissions = [
    "View Patient Medical Records",
    "Update Patient Diagnosis & Treatment",
    "Request Temporary Emergency Access",
    "View Access Logs & History", 
    "Download Patient Reports (PDF)"
  ];

  return (
    <div className="permissions-wrapper">
      <h2 className="permissions-header">
        <FaLock className="icon-blue" /> Access Permissions & Roles
      </h2>
      
      <div className="permissions-grid">
        {/* Role Card */}
        <div className="permission-card">
          <h3 className="card-header">Current Role</h3>
          <div className="role-display">
            <div className="role-icon-box">
              <FaUserMd />
            </div>
            <div>
              <div className="role-info-title">{user.role}</div>
              <div className="role-info-subtitle">Verified Medical Practitioner</div>
            </div>
          </div>
        </div>

        {/* Permissions List */}
        <div className="permission-card">
          <h3 className="card-header">Authorized Actions</h3>
          <ul className="permissions-list">
            {permissions.map((perm, i) => (
              <li key={i} className="permission-item">
                <FaCheckCircle className="permission-icon" /> {perm}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DoctorPermissionsTab;
