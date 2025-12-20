import React, { useState } from "react";
import { FaUsers, FaSync, FaSearch } from "react-icons/fa";

const UsersList = ({ users, fetchUsers, loading }) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <section className="ehr-section">
      <div className="section-header">
        <h2>
          <FaUsers /> System Users (users collection)
        </h2>
        <button
          className="btn btn-blue btn-sm"
          onClick={fetchUsers}
          disabled={loading}
        >
          <FaSync /> Refresh
        </button>
      </div>

      <p className="section-description">
        Users registered with roles for authentication
      </p>

      <div className="search-box-wrapper">
        <FaSearch className="search-icon" />
        <input
          type="text"
          placeholder="Search users..."
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
              <th>Role</th>
              <th>Trust Score</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((u, idx) => (
                <tr key={idx}>
                  <td className="user-name">{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`role-badge role-${u.role || "user"}`}>
                      {u.role || "User"}
                    </span>
                  </td>
                  <td>
                    <div className="trust-bar">
                      <div
                        className="trust-fill"
                        style={{
                          width: `${u.trust_score || 80}%`,
                          background:
                            (u.trust_score || 80) > 70
                              ? "#10b981"
                              : (u.trust_score || 80) > 40
                              ? "#f59e0b"
                              : "#ef4444",
                        }}
                      />
                      <span className="trust-text">
                        {u.trust_score || 80}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="4"
                  style={{
                    textAlign: "center",
                    color: "#64748b",
                    padding: "2rem",
                  }}
                >
                  No users found
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
