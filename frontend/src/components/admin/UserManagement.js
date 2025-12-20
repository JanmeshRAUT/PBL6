import React, { useState } from "react";
import axios from "axios";
import { API_URL } from "../../api";
import {
  FaUserPlus,
  FaSync,
  FaSearch,
  FaEdit,
  FaTimes,
  FaCheckCircle,
} from "react-icons/fa";

const UserManagement = ({ users, fetchUsers, loading, fetchPatients }) => {
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "",
    age: "",
    gender: "Male",
  });
  const [editingUser, setEditingUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Register User
  const handleRegisterUser = async (e) => {
    e.preventDefault();
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.role) {
      alert("❌ All required fields must be filled!");
      return;
    }

    if (newUser.role === "patient") {
      if (!newUser.age || newUser.age < 1) {
        alert("❌ Age is required for patients!");
        return;
      }
    }

    try {
      const token = localStorage.getItem("adminToken");
      const res = await axios.post(`${API_URL}/register_user`, {
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        age: parseInt(newUser.age) || 0,
        gender: newUser.gender || "Not specified",
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        alert("✅ " + res.data.message);
        setNewUser({ name: "", email: "", role: "", age: "", gender: "Male" });
        fetchUsers();
        fetchPatients();
      }
    } catch (error) {
      alert(error.response?.data?.message || "❌ Error registering user");
    }
  };

  // Update User Role
  const handleUpdateUserRole = async (e, userEmail) => {
    e.preventDefault();
    if (!editingUser.name || !editingUser.role) {
      alert("❌ Name and role are required!");
      return;
    }

    try {
      const token = localStorage.getItem("adminToken");
      const res = await axios.post(`${API_URL}/assign_role`, {
        name: editingUser.name,
        email: userEmail,
        role: editingUser.role,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        alert("✅ " + res.data.message);
        setEditingUser(null);
        fetchUsers();
      } else {
        alert("❌ " + (res.data.error || "Failed to update role"));
      }
    } catch (error) {
      console.error("Update role error:", error);
      alert(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "❌ Error updating user role"
      );
    }
  };

  // Delete User
  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Are you sure you want to delete user ${user.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem("adminToken");
      const res = await axios.delete(`${API_URL}/delete_user/${user.email}`, {
         headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
         alert("🗑️ " + res.data.message);
         fetchUsers();
      }
    } catch (error) {
      console.error("Delete user error:", error);
      alert("❌ Failed to delete user: " + (error.response?.data?.error || error.message));
    }
  };

  return (
    <>
      {/* Register New User Form */}
      <section className="ehr-section">
        <h2>➕ Register New User & Assign Role</h2>
        <p className="section-description">
          Create new user accounts and assign roles (Doctor, Nurse, Patient,
          Admin)
        </p>

        <form
          className="register-form"
          style={{ width: "100%", maxWidth: "100%" }}
          onSubmit={handleRegisterUser}
        >
          <input
            type="text"
            placeholder="Full Name *"
            value={newUser.name}
            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
            className="input"
            required
          />
          <input
            type="email"
            placeholder="Email Address *"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            className="input"
            required
          />

          <div className="form-row-inline">
            <input
              type="number"
              placeholder={
                newUser.role === "patient" ? "Age *" : "Age (optional)"
              }
              value={newUser.age}
              onChange={(e) => setNewUser({ ...newUser, age: e.target.value })}
              className="input"
              min="1"
              max="150"
              required={newUser.role === "patient"}
            />
            <select
              value={newUser.gender}
              onChange={(e) => setNewUser({ ...newUser, gender: e.target.value })}
              className="input"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
              <option value="Not specified">Prefer not to say</option>
            </select>
          </div>

          <select
            value={newUser.role}
            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
            className="input"
            required
          >
            <option value="">-- Select Role * --</option>
            <option value="doctor">Doctor</option>
            <option value="nurse">Nurse</option>
            <option value="patient">Patient</option>
            <option value="admin">Admin</option>
          </select>

          <button type="submit" className="btn btn-blue">
            <FaUserPlus /> Register User
          </button>
        </form>

        <div className="role-info">
          <h3>📋 Role Descriptions:</h3>
          <ul>
            <li>
              <strong>Doctor:</strong> Full access to patient records, can request
              emergency access
            </li>
            <li>
              <strong>Nurse:</strong> Limited access, temporary access only (30
              mins)
            </li>
            <li>
              <strong>Patient:</strong> Can view their own access history (⚠️ Age
              & Gender required)
            </li>
            <li>
              <strong>Admin:</strong> System administration, user management,
              analytics
            </li>
          </ul>
        </div>
      </section>

      {/* Users List with Edit/Role Assignment */}
      <section className="ehr-section">
        <div className="section-header">
          <h2>
            <FaSearch /> Find & Edit Users
          </h2>
          <button
            className="btn btn-blue btn-sm"
            onClick={fetchUsers}
            disabled={loading}
          >
            <FaSync /> {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        <div className="search-box-wrapper">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search by name or email..."
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
                <th>Actions</th>
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
                        {u.role || "Unassigned"}
                      </span>
                    </td>
                    <td>
                      <div className="trust-bar">
                        <div
                          className="trust-fill"
                          style={{
                            width: `${u.trust_score || 80}%`,
                          }}
                        />
                        <span className="trust-text">
                          {u.trust_score || 80}%
                        </span>
                      </div>
                    </td>
                    <td className="action-buttons">
                      <button
                        className="btn-icon btn-edit"
                        title="Edit Role"
                        onClick={() =>
                          setEditingUser({ name: u.name, role: u.role })
                        }
                      >
                        <FaEdit />
                      </button>
                      <button
                        className="btn-icon btn-delete"
                        title="Delete User"
                        style={{ color: "#ef4444", marginLeft: "10px" }}
                        onClick={() => handleDeleteUser(u)}
                      >
                        <FaTimes />
                      </button>
                    </td>
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
                    {searchQuery
                      ? "No users match your search"
                      : "No users registered yet"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Edit User Role Modal */}
      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit User Role</h3>
              <button
                className="modal-close-btn"
                onClick={() => setEditingUser(null)}
              >
                <FaTimes />
              </button>
            </div>

            <div className="modal-body">
              <form
                onSubmit={(e) => {
                  const userEmail = filteredUsers.find(
                    (u) => u.name === editingUser.name
                  )?.email;
                  handleUpdateUserRole(e, userEmail);
                }}
              >
                <div className="form-group">
                  <label>User Name</label>
                  <input
                    type="text"
                    value={editingUser.name}
                    readOnly
                    className="input"
                    style={{ background: "#f1f5f9", cursor: "not-allowed" }}
                  />
                </div>

                <div className="form-group">
                  <label>Assign Role</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, role: e.target.value })
                    }
                    className="input"
                    required
                  >
                    <option value="">-- Select Role --</option>
                    <option value="doctor">Doctor</option>
                    <option value="nurse">Nurse</option>
                    <option value="patient">Patient</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-gray"
                    onClick={() => setEditingUser(null)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-blue">
                    <FaCheckCircle /> Update Role
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserManagement;
