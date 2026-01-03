import React, { useState } from "react";
import { FaUsers, FaSync, FaSearch } from "react-icons/fa";

const UsersList = ({ users, fetchUsers, loading }) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.user_id && u.user_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.patient_id && u.patient_id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <section className="admin-section">
      <div className="admin-section-header">
        <h2>
          <FaUsers /> System Directory
        </h2>
        <button
          className="med-btn med-btn-primary med-btn-sm"
          onClick={fetchUsers}
          disabled={loading}
        >
          <FaSync /> <span>Refresh</span>
        </button>
      </div>

      <div className="admin-content-area no-padding-bottom">
        <p className="section-description no-padding mb-2">
          Registry of all authenticated personnel and their permissions.
        </p>
        
        <div className="med-search-bar">
            <FaSearch className="med-search-icon" />
            <input
            type="text"
            placeholder="Search directory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="med-search-input"
            />
        </div>
      </div>

      <div className="admin-table-wrapper no-top-border">
        <table className="admin-table">
          <thead>
            <tr>
              <th>System ID</th>
              <th>User Name</th>
              <th>Email Address</th>
              <th>Assigned Role</th>
              <th>Security Trust Score</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((u, idx) => (
                <tr key={idx}>
                  <td className="text-mono sub-strong">{u.user_id || u.patient_id || "—"}</td>
                  <td className="user-name">{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`role-badge role-${(u.role || "user").toLowerCase()}`}>
                      {u.role || "User"}
                    </span>
                  </td>
                  <td>
                    {(() => {
                        const score = u.trust_score || 80;
                        let colorClass = "trust-safe";
                        if (score <= 40) colorClass = "trust-crit";
                        else if (score <= 70) colorClass = "trust-warn";
                        
                        return (
                            <div className="trust-widget">
                                <div className="trust-track">
                                    <div 
                                        className={`trust-indicator ${colorClass}`} 
                                        style={{ width: `${score}%` }} 
                                    />
                                </div>
                                <span className="trust-value">{score}%</span>
                            </div>
                        );
                    })()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4">
                  <div className="empty-state">
                    <span className="empty-state-icon">👥</span>
                    <span>No users found</span>
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

export default UsersList;
