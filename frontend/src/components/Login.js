import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "../api";
import "../css/Login.css";
import "../css/Notifications.css"; // <-- Add this if not present
import { FaTimes } from "react-icons/fa";
import { auth } from "./firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";

const Login = ({ onLogin }) => {
	const [step, setStep] = useState(1);
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [role, setRole] = useState("");
	const [otp, setOtp] = useState("");
	const [sessionId, setSessionId] = useState("");
	const [timer, setTimer] = useState(180);
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState("");
	const [toast, setToast] = useState({ show: false, message: "", type: "" });

	// ✅ Check if email is admin
	const isAdminEmail = (testEmail) => {
		const adminEmails = ["admin@ehr.com", "admin@medtrust.com"];
		return adminEmails.includes(testEmail.toLowerCase());
	};

	useEffect(() => {
		let interval;
		if (step === 2 && timer > 0) {
			interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
		}
		return () => clearInterval(interval);
	}, [step, timer]);

	const formatTime = (sec) => {
		const m = String(Math.floor(sec / 60)).padStart(2, "0");
		const s = String(sec % 60).padStart(2, "0");
		return `${m}:${s}`;
	};

	const handleLogin = async (e) => {
		e.preventDefault();

		// ✅ Check if admin login
		if (isAdminEmail(email)) {
			if (!password) {
				return setMessage("❌ Enter password!");
			}
			try {
				setLoading(true);
				setMessage("Verifying admin credentials...");

				// ✅ Authenticate with Firebase using email & password
				const userCredential = await signInWithEmailAndPassword(auth, email, password);
				const idToken = await userCredential.user.getIdToken();

				// ✅ Verify with backend
				const res = await axios.post(
					`${API_URL}/admin/login`,
					{},
					{
						headers: { Authorization: `Bearer ${idToken}` },
					}
				);

				if (res.data.success) {
					setMessage("✅ Admin authenticated!");
					onLogin("admin", "Admin");
				} else {
					setMessage("❌ " + (res.data.error || "Admin verification failed"));
				}
			} catch (error) {
				console.error("Admin auth error:", error);
				if (error.code === "auth/user-not-found") {
					setMessage("❌ Admin email not found in Firebase");
				} else if (error.code === "auth/wrong-password") {
					setMessage("❌ Incorrect password");
				} else if (error.response?.data?.error) {
					setMessage("❌ " + error.response.data.error);
				} else {
					setMessage("❌ Admin authentication failed");
				}
			} finally {
				setLoading(false);
			}
			return;
		}

		// ✅ Validation for non-admin users
		if (!name.trim() || !role) {
			return setMessage("❌ Enter name & role!");
		}
		if (!email.trim()) {
			return setMessage("❌ Enter email address!");
		}
		if (!email.includes("@")) {
			return setMessage("❌ Enter a valid email address!");
		}

		try {
			setLoading(true);
			setMessage("");
			
			// ✅ NEW: Show loading message for verification
			setMessage("🔍 Verifying credentials with database...");
			
			const res = await axios.post(`${API_URL}/user_login`, {
				name,
				role,
				email,
			});

			if (res.data.success) {
				setSessionId(res.data.session_id);
				setStep(2);
				setTimer(180);
				setOtp("");
				setMessage((res.data.message || "✅ OTP sent to your email"));
			} else {
				// ✅ NEW: Enhanced error messages from backend
				const errorMsg = res.data.error || "Login failed";
				if (errorMsg.includes("mismatch")) {
					setMessage("❌ Name or role does not match our records. Please verify and try again.");
				} else if (errorMsg.includes("not found")) {
					setMessage("❌ User account not found. Please contact your administrator.");
				} else {
					setMessage("❌ " + errorMsg);
				}
			}
		} catch (error) {
			console.error("Login error:", error);
			if (error.response?.data?.error) {
				const errorMsg = error.response.data.error;
				// ✅ NEW: Parse error message intelligently
				if (errorMsg.includes("mismatch") || errorMsg.includes("Expected:")) {
					setMessage("❌ " + errorMsg);
				} else if (errorMsg.includes("not found")) {
					setMessage("❌ User not found in our system.");
				} else {
					setMessage("❌ " + errorMsg);
				}
			} else {
				setMessage("❌ Failed to verify credentials. Check your internet connection and try again.");
			}
		} finally {
			setLoading(false);
		}
	};

	const handleVerifyOtp = async (e) => {
		e.preventDefault();
		if (!otp.trim()) return setMessage("Enter OTP!");

		try {
			setLoading(true);
			setMessage("");
			const res = await axios.post(`${API_URL}/verify_otp`, {
				session_id: sessionId,
				otp,
			});

			if (res.data.verified) {
				onLogin(role, name);
			} else {
				setMessage("❌ " + (res.data.error || "Incorrect or expired OTP"));
			}
		} catch {
			setMessage("❌ OTP verification failed");
		} finally {
			setLoading(false);
		}
	};

	const resendOtp = async () => {
		if (!sessionId) return;
		try {
			setLoading(true);
			setMessage("");
			const res = await axios.post(`${API_URL}/resend_otp`, {
				session_id: sessionId,
			});
			if (res.data.sent) {
				setTimer(180);
				setOtp("");
				setMessage("✅ OTP resent. Check your email.");
			} else {
				setMessage("❌ " + (res.data.error || "Unable to resend OTP"));
			}
		} catch {
			setMessage("❌ Resend failed");
		} finally {
			setLoading(false);
		}
	};

	const goBack = () => {
		setStep(1);
		setOtp("");
		setPassword("");
		setSessionId("");
		setTimer(180);
		setMessage("");
	};

	// Helper to remove leading emoji from backend messages
	const cleanToastMessage = (msg) => {
		return (msg || "").replace(
			/^[\u2705\u274C\u26A0\u2139\u1F691\u1F6A8\u1F198\u1F4E2\u1F4A1\u1F514\u1F6AB\u1F512\u1F4DD\u1F4C8\u1F4C9\u1F4CA\u1F4CB\u1F4CC\u1F4CD\u1F4CE\u1F4CF\u1F4D0\u1F4D1\u1F4D2\u1F4D3\u1F4D4\u1F4D5\u1F4D6\u1F4D7\u1F4D8\u1F4D9\u1F4DA\u1F4DB\u1F4DC\u1F4DD\u1F4DE\u1F4DF\u1F4E0\u1F4E1\u1F4E2\u1F4E3\u1F4E4\u1F4E5\u1F4E6\u1F4E7\u1F4E8\u1F4E9\u1F4EA\u1F4EB\u1F4EC\u1F4ED\u1F4EE\u1F4EF\u1F4F0\u1F4F1\u1F4F2\u1F4F3\u1F4F4\u1F4F5\u1F4F6\u1F4F7\u1F4F8\u1F4F9\u1F4FA\u1F4FB\u1F4FC\u1F4FD\u1F4FE\u1F4FF\u1F500\u1F501\u1F502\u1F503\u1F504\u1F505\u1F506\u1F507\u1F508\u1F509\u1F50A\u1F50B\u1F50C\u1F50D\u1F50E\u1F50F\u1F510\u1F511\u1F512\u1F513\u1F514\u1F515\u1F516\u1F517\u1F518\u1F519\u1F51A\u1F51B\u1F51C\u1F51D\u1F51E\u1F51F\u1F520\u1F521\u1F522\u1F523\u1F524\u1F525\u1F526\u1F527\u1F528\u1F529\u1F52A\u1F52B\u1F52C\u1F52D\u1F52E\u1F52F\u1F530\u1F531\u1F532\u1F533\u1F534\u1F535\u1F536\u1F537\u1F538\u1F539\u1F53A\u1F53B\u1F53C\u1F53D\u1F549\u1F54A\u1F54B\u1F54C\u1F54D\u1F54E\u1F550\u1F551\u1F552\u1F553\u1F554\u1F555\u1F556\u1F557\u1F558\u1F559\u1F55A\u1F55B\u1F55C\u1F55D\u1F55E\u1F55F\u1F560\u1F561\u1F562\u1F563\u1F564\u1F565\u1F566\u1F567\u1F56F\u1F570\u1F573\u1F574\u1F575\u1F576\u1F577\u1F578\u1F579\u1F57A\u1F587\u1F58A\u1F58B\u1F58C\u1F58D\u1F590\u1F595\u1F596\u1F5A4\u1F5A5\u1F5A8\u1F5B1\u1F5B2\u1F5BC\u1F5C2\u1F5C3\u1F5C4\u1F5D1\u1F5D2\u1F5D3\u1F5DC\u1F5DD\u1F5DE\u1F5E1\u1F5E3\u1F5E8\u1F5EF\u1F5F3\u1F5FA\u1F5FB\u1F5FC\u1F5FD\u1F5FE\u1F5FF\u1F600-\u1F64F\u1F680-\u1F6FF\u2600-\u26FF\u2700-\u27BF]\s*/g,
			""
		);
	};

	// Show toast when message changes
	useEffect(() => {
		if (message) {
			let type = "info";
			if (message.startsWith("✅")) type = "success";
			else if (message.startsWith("❌")) type = "error";
			else if (message.startsWith("⚠️")) type = "warning";
			else if (message.startsWith("ℹ️")) type = "info";
			setToast({ show: true, message: cleanToastMessage(message), type });
			const timer = setTimeout(() => setToast({ show: false, message: "", type: "" }), 4000);
			return () => clearTimeout(timer);
		}
	}, [message]);

	return (
		<div className="login-full">
			{/* Toast Notification */}
			{toast.show && (
				<div className={`toast-notification toast-${toast.type}`}>
					<div className="toast-content">
						<span>{toast.message}</span>
					</div>
					<button className="toast-close" onClick={() => setToast({ ...toast, show: false })}>
						<FaTimes />
					</button>
				</div>
			)}

			{/* Left Side Visual */}
			<div className="left-section">
				<div className="overlay">
					<h1 className="brand-title">MedTrust AI</h1>
					<p className="brand-text">
						Secure access to Electronic Health Records using AI-Driven Trust.
					</p>
				</div>
			</div>

			{/* Right Side Form */}
			<div className="right-section">
				<div className="form-wrapper">
					{step === 1 && (
						<form className="login-form" onSubmit={handleLogin}>
							{/* small logo + title */}
							<div className="form-head">
								<div className="logo">MT</div>
								<div>
									<h2 className="form-title">Sign In</h2>
									<p className="form-sub">
										Secure access to patient records
									</p>
								</div>
							</div>

							<label className="label">Full Name</label>
							<input
								className="input"
								placeholder="Enter your name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								aria-label="Full name"
							/>

							<label className="label">Email Address</label>
							<input
								className="input"
								type="email"
								placeholder="Enter your email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								aria-label="Email"
							/>

							{/* ✅ Show password field for admin */}
							{isAdminEmail(email) && (
								<>
									<label className="label">Password</label>
									<input
										className="input"
										type="password"
										placeholder="Enter admin password"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										aria-label="Password"
									/>
								</>
							)}

							{/* ✅ Show role dropdown only for non-admin */}
							{!isAdminEmail(email) && (
								<>
									<label className="label">Select Role</label>
									<select
										className="input"
										value={role}
										onChange={(e) => setRole(e.target.value)}
										aria-label="Select role"
									>
										<option value="">-- Select Role --</option>
										<option value="doctor">Doctor</option>
										<option value="nurse">Nurse</option>
										<option value="patient">Patient</option>
									</select>
								</>
							)}

							{/* ✅ Show admin note if admin email detected */}
							{isAdminEmail(email) && (
								<div style={{
									background: "#eff6ff",
									border: "1px solid #2563eb",
									borderRadius: "8px",
									padding: "0.75rem",
									marginTop: "0.5rem",
									color: "#1e40af",
									fontSize: "0.875rem",
									fontWeight: "500"
								}}>
									🔐 Admin Account Detected - Firebase Authentication Required
								</div>
							)}

							<button
								className="btn"
								disabled={loading || !name.trim() || !email.trim() || (!isAdminEmail(email) && !role)}
							>
								{loading ? (
									isAdminEmail(email) 
										? "Authenticating Admin..." 
										: "Verifying Credentials..."
								) : (
									isAdminEmail(email) 
										? "🔐 Access Admin Panel" 
										: "Send OTP"
								)}
							</button>

							{message && <p className="message">{message}</p>}
						</form>
					)}

					{step === 2 && (
						<form className="login-form otp-mode" onSubmit={handleVerifyOtp}>
							<div className="otp-card-header">
								<h2 className="otp-title">Security Check</h2>
								<p className="otp-subtitle">
									Enter the 6-digit code sent to your email
								</p>
							</div>

							<div style={{ textAlign: "center" }}>
								<div className={`otp-timer ${timer < 30 ? "timer-active" : ""}`}>
									⏱ Expiring in {formatTime(timer)}
								</div>
							</div>

							{/* progress bar */}
							<div className="progress-wrap" aria-hidden>
								<div
									className="progress"
									style={{ width: `${(timer / 180) * 100}%` }}
								/>
							</div>

							<div className="input-group">
								<input
									className="otp"
									placeholder="• • • • • •"
									maxLength="6"
									value={otp}
									onChange={(e) =>
										setOtp(e.target.value.replace(/\D/g, ""))
									}
									inputMode="numeric"
									aria-label="OTP"
									autoFocus
								/>
							</div>

							<button
								className="btn"
								disabled={loading || !otp.trim()}
							>
								{loading ? "Verifying..." : "Verify Identity →"}
							</button>

							<div className="otp-actions">
								<button
									type="button"
									className="link-back"
									onClick={goBack}
								>
									← Go Back
								</button>
								
								<div style={{ textAlign: "right" }}>
									<button
										type="button"
										className="link-btn"
										onClick={resendOtp}
										disabled={loading || timer > 0}
									>
										Resend Code
									</button>
									{timer > 0 && (
										<span className="note">
											Wait {formatTime(timer)}
										</span>
									)}
								</div>
							</div>

							{message && <p className="message">{message}</p>}
						</form>
					)}
				</div>
			</div>
		</div>
	);
};

export default Login;
