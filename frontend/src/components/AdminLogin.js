import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebaseConfig";
import "../css/Login.css";

const AdminLogin = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      // ✅ Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const token = await userCredential.user.getIdToken();

      // ✅ Verify with Backend
      const response = await axios.post(
        "http://localhost:5000/admin/login",
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        // ✅ Store token and redirect
        onLogin(token);
        setMessage("✅ Admin login successful!");
        setTimeout(() => {
          navigate("/admin/dashboard");
        }, 1000);
      } else {
        setMessage("❌ Unauthorized: Not an admin user");
      }
    } catch (error) {
      console.error("Admin login error:", error);

      if (error.code === "auth/user-not-found") {
        setMessage("❌ User not found");
      } else if (error.code === "auth/wrong-password") {
        setMessage("❌ Invalid password");
      } else if (error.response?.data?.error) {
        setMessage("❌ " + error.response.data.error);
      } else {
        setMessage("❌ Login failed. Check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-full">
      {/* Left Side Visual */}
      <div className="left-section">
        <div className="overlay">
          <h1 className="brand-title">MedTrust AI</h1>
          <p className="brand-text">
            Administrator Portal - Secure access to Electronic Health Records
            management.
          </p>
        </div>
      </div>

      {/* Right Side Form */}
      <div className="right-section">
        <div className="form-wrapper">
          <div className="form-head">
            <div
              className="logo"
              style={{
                background:
                  "linear-gradient(135deg, #f59e0b, #facc15)",
              }}
            >
              👨‍💼
            </div>
            <div>
              <h2 className="form-title">Admin Login</h2>
              <p className="form-sub">System Administrator Access</p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <label className="label">Email Address</label>
            <input
              className="input"
              type="email"
              placeholder="admin@ehr.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-label="Admin email"
            />

            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              aria-label="Password"
            />

            <button
              className="btn"
              disabled={loading || !email.trim() || !password.trim()}
              type="submit"
            >
              {loading ? "Authenticating..." : "🔐 Admin Login"}
            </button>

            {message && (
              <p
                className="message"
                style={{
                  color: message.includes("✅") ? "#10b981" : "#ef4444",
                  marginTop: "1rem",
                  textAlign: "center",
                  fontWeight: "500",
                }}
              >
                {message}
              </p>
            )}
          </form>

          <div
            style={{
              marginTop: "2rem",
              padding: "1rem",
              background: "#eff6ff",
              borderRadius: "8px",
              border: "1px solid #bae6fd",
              textAlign: "center",
              color: "#1e40af",
              fontSize: "0.85rem",
              lineHeight: "1.6",
            }}
          >
            <p style={{ margin: 0, marginBottom: "0.5rem" }}>
              <strong>Demo Credentials:</strong>
            </p>
            <p style={{ margin: 0 }}>
              Email: admin@ehr.com
              <br />
              Password: (Set up in Firebase)
            </p>
          </div>

          <div
            style={{
              marginTop: "1rem",
              textAlign: "center",
            }}
          >
            <a
              href="/"
              style={{
                color: "#2563eb",
                textDecoration: "none",
                fontSize: "0.9rem",
                fontWeight: "500",
              }}
            >
              ← Back to User Login
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
