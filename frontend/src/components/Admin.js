import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "../api";
import { useNavigate } from "react-router-dom";
import "../css/AdminDashboard.css";

const AdminDashboard = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("doctor");
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      alert("Unauthorized! Please login as Admin.");
      navigate("/admin/login");
    } else {
      fetchUsers(token);
    }
  }, [navigate]);

const fetchUsers = async (token) => {
  try {
    const response = await axios.get(`${API_URL}/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("✅ Users fetched:", response.data);
    setUsers(response.data.users || []);
  } catch (err) {
    console.error("❌ Error fetching users:", err.response?.data || err);
  }
};


  const handleAssignRole = async () => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      alert("Session expired. Please login again.");
      navigate("/admin/login");
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/assign_role`,
        { name, email, role },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert(response.data.message);
      setName("");
      setEmail("");
      fetchUsers(token);
    } catch (error) {
      alert(error.response?.data?.error || "❌ Error assigning role");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    navigate("/");
  };

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>MedTrust AI – Admin Panel</h1>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </header>

      <div className="role-box">
        <h2>Assign Role to User</h2>
        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="email"
          placeholder="User Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="doctor">Doctor</option>
          <option value="nurse">Nurse</option>
          <option value="patient">Patient</option>
        </select>
        <button onClick={handleAssignRole}>Assign Role</button>
      </div>

      <div className="user-table-container">
        <h2>Registered Users</h2>
        <table className="user-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Trust Score</th>
            </tr>
          </thead>
          <tbody>
            {users.length > 0 ? (
              users.map((u, i) => (
                <tr key={i}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td className="capitalize">{u.role}</td>
                  <td>{u.trust_score || "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="no-users">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDashboard;
