import React, { useState, useMemo } from "react";
import axios from "axios";
import { API_URL } from "../../api";
import {
  FaUserPlus,
  FaSearch,
  FaEdit,
  FaTrashAlt,
  FaUserMd,
  FaUserNurse,
  FaUserInjured,
  FaUsers,
  FaCheckCircle,
  FaUser,
  FaEnvelope,
  FaIdCard,
  FaVenusMars,
  FaBirthdayCake,
  FaArrowLeft,
} from "react-icons/fa";
import "../../css/AdminDashboard.css";

const UserManagement = ({ users, fetchUsers, loading, fetchPatients }) => {
  const [viewMode, setViewMode] = useState("list"); // 'list' | 'add'
  const [searchQuery, setSearchQuery] = useState("");
  const [editingUser, setEditingUser] = useState(null); // { name: '', role: '' }

  // Registration User State
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "doctor",
    age: "", // Kept for legacy compatibility if needed
    gender: "Male",
    dob: "",
    contact: "",
    bloodGroup: "A+",
    address: "",
  });

  // --- Computed Stats ---
  const stats = useMemo(() => {
    return {
      total: users.length,
      doctors: users.filter((u) => u.role === "doctor").length,
      nurses: users.filter((u) => u.role === "nurse").length,
      patients: users.filter((u) => u.role === "patient").length,
      admins: users.filter((u) => u.role === "admin").length,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [users, searchQuery]);

  // --- Handlers ---
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
      const res = await axios.post(
        `${API_URL}/register_user`,
        {
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          age: parseInt(newUser.age) || 0,
          gender: newUser.gender || "Not specified",
          // New Professional Fields
          dob: newUser.dob,
          contact: newUser.contact,
          blood_group: newUser.bloodGroup,
          address: newUser.address,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.data.success) {
        alert("✅ " + res.data.message);
        setNewUser({ 
          name: "", email: "", role: "doctor", age: "", gender: "Male",
          dob: "", contact: "", bloodGroup: "A+", address: ""
        });
        fetchUsers();
        fetchPatients();
        setViewMode("list");
      }
    } catch (error) {
      alert(error.response?.data?.message || "❌ Error registering user");
    }
  };

  const handleUpdateUserRole = async (e, userEmail) => {
    e.preventDefault();
    if (!editingUser.name || !editingUser.role) return;

    try {
      const token = localStorage.getItem("adminToken");
      const res = await axios.post(
        `${API_URL}/assign_role`,
        {
          name: editingUser.name,
          email: userEmail,
          role: editingUser.role,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.data.success) {
        alert("✅ Role Updated Successfully");
        setEditingUser(null);
        fetchUsers();
      } else {
        alert("❌ " + (res.data.error || "Failed to update role"));
      }
    } catch (error) {
      console.error("Update Error:", error);
      alert("❌ Error updating user role");
    }
  };

  const handleDeleteUser = async (user) => {
    if (
      !window.confirm(
        `Are you sure you want to PERMANENTLY delete ${user.name}? This action cannot be undone.`
      )
    )
      return;

    try {
      const token = localStorage.getItem("adminToken");
      const res = await axios.delete(`${API_URL}/delete_user/${user.email}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        alert("✅ User deleted successfully");
        fetchUsers();
      }
    } catch (error) {
      alert("❌ Failed to delete user: " + (error.response?.data?.message || error.message));
    }
  };

  const getInitials = (name) => {
    return name
      ? name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()
      : "??";
  };

  // --- Views ---

  // Refactored Stats Grid - Professional Cards
  const renderStats = () => (
    <div className="analytics-grid">
      <div className="stat-card">
        <div className="stat-icon bg-blue-soft text-blue">
          <FaUsers />
        </div>
        <div className="stat-content">
          <h3>Total Users</h3>
          <p className="stat-value">{stats.total}</p>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon bg-blue-soft text-blue">
          <FaUserMd />
        </div>
        <div className="stat-content">
          <h3>Doctors</h3>
          <p className="stat-value">{stats.doctors}</p>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon bg-green-soft text-green">
          <FaUserNurse />
        </div>
        <div className="stat-content">
          <h3>Nurses</h3>
          <p className="stat-value">{stats.nurses}</p>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon bg-red-soft text-red">
          <FaUserInjured />
        </div>
        <div className="stat-content">
          <h3>Patients</h3>
          <p className="stat-value">{stats.patients}</p>
        </div>
      </div>
    </div>
  );

  const renderListView = () => (
    <>
      {/* Stats - Now part of the clean layout */}
      {renderStats()}

      {/* Main Table Section */}
      <div className="admin-section with-stats">
        <div className="admin-section-header">
          <h2>User Directory</h2>
          <div className="flex-align-center gap-4">
            <div className="med-search-bar">
                <FaSearch className="med-search-icon" />
                <input
                    type="text"
                    className="med-search-input"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <button
                className="med-btn med-btn-primary"
                onClick={() => setViewMode("add")}
            >
                <FaUserPlus /> <span>Add User</span>
            </button>
          </div>
        </div>

        <div className="admin-table-wrapper no-top-border">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Trust Score</th>
                <th style={{ textAlign: "right", paddingRight: "1.5rem" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u, idx) => (
                  <tr key={idx}>
                    <td>
                      <div className="flex-align-center gap-3">
                        <div className="avatar-base">
                            {getInitials(u.name)}
                        </div>
                        <div className="flex-col">
                            <div className="user-name">{u.name}</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`role-badge role-${u.role}`}>
                        {u.role || "Unassigned"}
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
                    <td style={{ textAlign: "right" }}>
                      <div className="flex-row" style={{ justifyContent: "flex-end", gap: "0.5rem" }}>
                          <button
                            className="med-btn med-btn-icon"
                            title="Edit Permissions"
                            onClick={() => setEditingUser({ name: u.name, role: u.role })}
                          >
                            <FaEdit />
                          </button>
                          <button
                            className="med-btn med-btn-icon danger"
                            title="Delete User"
                            onClick={() => handleDeleteUser(u)}
                          >
                            <FaTrashAlt />
                          </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4">
                    <div className="empty-state">
                        <span className="empty-state-icon"><FaSearch /></span>
                        <span>No users found for "{searchQuery}"</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  /* --- Views --- */

  const renderAddModal = () => (
    <div className="modal-overlay" onClick={() => setViewMode("list")}>
      <div 
        className="modal-content premium-modal" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '800px' }} // Wider for the grid layout
      >
        <div className="modal-header">
           <h3><FaUserPlus /> Register New User</h3>
           <button className="med-btn med-btn-icon" onClick={() => setViewMode("list")}>
             <FaArrowLeft />
           </button>
        </div>
        
        <div className="modal-body">


        <form onSubmit={handleRegisterUser} className="premium-form">
          <div className="form-grid">
            {/* Full Name */}
            <div className="form-group">
              <label>Full Name</label>
              <div className="input-with-icon">
                <FaUser className="input-icon" />
                <input
                  type="text"
                  placeholder="e.g. Dr. Sarah Smith"
                  value={newUser.name}
                  onChange={(e) =>
                    setNewUser({ ...newUser, name: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="form-group">
              <label>Email Address</label>
              <div className="input-with-icon">
                <FaEnvelope className="input-icon" />
                <input
                  type="email"
                  placeholder="sarah.smith@medtrust.com"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            {/* Role Selection */}
            <div className="form-group">
              <label>System Role</label>
              <div className="input-with-icon">
                <FaIdCard className="input-icon" />
                <select
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser({ ...newUser, role: e.target.value })
                  }
                >
                  <option value="doctor">Doctor</option>
                  <option value="nurse">Nurse</option>
                  <option value="patient">Patient</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            {/* Gender Selection */}
            <div className="form-group">
              <label>Gender</label>
              <div className="input-with-icon">
                <FaVenusMars className="input-icon" />
                <select
                  value={newUser.gender}
                  onChange={(e) =>
                    setNewUser({ ...newUser, gender: e.target.value })
                  }
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Conditional Patient Fields - Professional Medical Expansion */}
            {newUser.role === "patient" && (
              <>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <div className="section-divider">
                        <span>Patient Demographics</span>
                    </div>
                </div>

                {/* Date of Birth (replaces simple Age) */}
                <div className="form-group">
                  <label>Date of Birth</label>
                  <div className="input-with-icon">
                    <FaBirthdayCake className="input-icon" />
                    <input
                      type="date"
                      value={newUser.dob}
                      onChange={(e) => {
                         // Auto-calculate age for legacy field support
                         const birthDate = new Date(e.target.value);
                         const today = new Date();
                         let age = today.getFullYear() - birthDate.getFullYear();
                         const m = today.getMonth() - birthDate.getMonth();
                         if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                             age--;
                         }
                         setNewUser({ ...newUser, dob: e.target.value, age: age });
                      }}
                      required
                    />
                  </div>
                </div>

                 {/* Blood Group */}
                 <div className="form-group">
                  <label>Blood Group</label>
                  <div className="input-with-icon">
                    <FaIdCard className="input-icon" />
                    <select
                      value={newUser.bloodGroup}
                      onChange={(e) =>
                        setNewUser({ ...newUser, bloodGroup: e.target.value })
                      }
                    >
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                </div>

                {/* Contact Number */}
                <div className="form-group">
                  <label>Contact Number</label>
                  <div className="input-with-icon">
                    <FaIdCard className="input-icon" /> {/* Reusing Icon or add FaPhone if imported */}
                    <input
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={newUser.contact}
                      onChange={(e) =>
                        setNewUser({ ...newUser, contact: e.target.value })
                      }
                    />
                  </div>
                </div>

                {/* Patient Address */}
                <div className="form-group">
                  <label>Residential Address</label>
                  <div className="input-with-icon">
                    <FaCheckCircle className="input-icon" /> {/* Placeholder icon */}
                    <input
                      type="text"
                      placeholder="Street Address, City, Zip"
                      value={newUser.address}
                      onChange={(e) =>
                        setNewUser({ ...newUser, address: e.target.value })
                      }
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="med-btn med-btn-secondary"
              onClick={() => setViewMode("list")}
            >
              Cancel
            </button>
            <button type="submit" className="med-btn med-btn-primary">
              <FaCheckCircle /> Create Account
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="user-management-container">
      {renderListView()}
      
      {/* Registration Modal */}
      {viewMode === "add" && renderAddModal()}

      {/* EDIT MODAL */}
      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Permissions</h3>
            </div>
            <div className="modal-body">
              <p className="text-muted mb-2">Update role for <strong>{editingUser.name}</strong></p>
              <select
                className="med-search-bar w-full"
                style={{ paddingLeft: '1rem', background: 'white', border: '1px solid #e2e8f0' }}
                value={editingUser.role}
                onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
              >
                <option value="doctor">Doctor</option>
                <option value="nurse">Nurse</option>
                <option value="patient">Patient</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="modal-footer">
              <button className="med-btn med-btn-secondary" onClick={() => setEditingUser(null)}>Cancel</button>
              <button 
                className="med-btn med-btn-primary"
                onClick={(e) => {
                    const userEmail = users.find(u => u.name === editingUser.name)?.email;
                    handleUpdateUserRole(e, userEmail);
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
