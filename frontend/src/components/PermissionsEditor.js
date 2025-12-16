import React, { useState, useEffect } from "react";
import { FaLock, FaUnlock, FaCheck, FaTimes, FaSave } from "react-icons/fa";
import "../css/PermissionsEditor.css";

const PermissionsEditor = () => {
  const [permissions, setPermissions] = useState({});
  const [selectedRole, setSelectedRole] = useState("doctor");
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [changes, setChanges] = useState({});

  // Professional RBAC Structure
  const ROLES = {
    doctor: {
      label: "👨‍⚕️ Doctor",
      description: "Senior Clinical Staff",
      color: "#3b82f6",
      tier: 3
    },
    nurse: {
      label: "👩‍⚕️ Nurse",
      description: "Clinical Support Staff",
      color: "#10b981",
      tier: 2
    },
    patient: {
      label: "🤐 Patient",
      description: "End User",
      color: "#8b5cf6",
      tier: 1
    },
    admin: {
      label: "👨‍💼 Admin",
      description: "System Administrator",
      color: "#f59e0b",
      tier: 4
    }
  };

  // Permission Categories
  const PERMISSION_CATEGORIES = {
    "Patient Records": {
      icon: "📋",
      permissions: {
        view_own_records: { label: "View Own Records", risk: "low" },
        view_assigned_patients: { label: "View Assigned Patients", risk: "medium" },
        view_all_patients: { label: "View All Patients", risk: "high" },
        export_patient_data: { label: "Export Patient Data", risk: "high" },
        view_patient_history: { label: "View Access History", risk: "medium" }
      }
    },
    "Record Management": {
      icon: "📝",
      permissions: {
        create_records: { label: "Create Medical Records", risk: "high" },
        edit_own_records: { label: "Edit Own Records", risk: "medium" },
        edit_any_records: { label: "Edit Any Records", risk: "high" },
        delete_records: { label: "Delete Records", risk: "critical" },
        update_diagnosis: { label: "Update Diagnosis", risk: "high" }
      }
    },
    "Access Control": {
      icon: "🔐",
      permissions: {
        normal_access: { label: "Normal Access", risk: "low" },
        restricted_access: { label: "Restricted Access", risk: "high" },
        emergency_access: { label: "Emergency/Break-Glass Access", risk: "critical" },
        temporary_access: { label: "Temporary Time-Limited Access", risk: "medium" },
        audit_own_access: { label: "Audit Own Access Logs", risk: "low" }
      }
    },
    "System Administration": {
      icon: "⚙️",
      permissions: {
        manage_users: { label: "Manage Users & Roles", risk: "critical" },
        view_system_logs: { label: "View System Logs", risk: "high" },
        export_reports: { label: "Export System Reports", risk: "high" },
        modify_permissions: { label: "Modify Permissions", risk: "critical" },
        view_analytics: { label: "View Analytics", risk: "medium" }
      }
    },
    "Security": {
      icon: "🛡️",
      permissions: {
        view_access_logs: { label: "View Access Logs", risk: "medium" },
        approve_access_requests: { label: "Approve Access Requests", risk: "high" },
        revoke_access: { label: "Revoke Access", risk: "high" },
        manage_security_policies: { label: "Manage Security Policies", risk: "critical" },
        view_audit_trail: { label: "View Complete Audit Trail", risk: "high" }
      }
    }
  };

  // Initialize permissions on mount
  useEffect(() => {
    const initialPermissions = {};
    Object.keys(ROLES).forEach(role => {
      initialPermissions[role] = getDefaultPermissions(role);
    });
    setPermissions(initialPermissions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Get default permissions
  const getDefaultPermissions = (role) => {
    const rolePermissions = {};

    Object.entries(PERMISSION_CATEGORIES).forEach(([category, categoryData]) => {
      Object.entries(categoryData.permissions).forEach(([permKey, permData]) => {
        const granted = determinePermission(role, permData.risk);
        rolePermissions[`${category}|${permKey}`] = granted;
      });
    });

    return rolePermissions;
  };

  // Permission logic
  const determinePermission = (role, risk) => {
    if (role === "admin") return true;
    if (role === "patient") return risk === "low";
    if (role === "nurse") return risk === "low" || risk === "medium";
    if (role === "doctor") return risk !== "critical";
    return false;
  };

  // Toggle permission
  const togglePermission = (role, permKey) => {
    const updated = {
      ...permissions,
      [role]: {
        ...permissions[role],
        [permKey]: !permissions[role][permKey]
      }
    };
    setPermissions(updated);
    setChanges({ ...changes, [role]: true });
    setShowSavePrompt(true);
  };

  // Save
  const handleSave = () => {
    alert("✅ Permission structure saved successfully!");
    console.log("Updated permissions:", permissions);
    setChanges({});
    setShowSavePrompt(false);
  };

  // Reset
  const handleReset = () => {
    const initialPermissions = {};
    Object.keys(ROLES).forEach(role => {
      initialPermissions[role] = getDefaultPermissions(role);
    });
    setPermissions(initialPermissions);
    setChanges({});
    setShowSavePrompt(false);
    alert("✅ Permissions reset to defaults!");
  };

  // Grant all
  const grantAllPermissions = (role) => {
    const newPermissions = {};
    Object.keys(permissions[role]).forEach(key => {
      newPermissions[key] = true;
    });

    setPermissions({ ...permissions, [role]: newPermissions });
    setChanges({ ...changes, [role]: true });
    setShowSavePrompt(true);
  };

  // Revoke all
  const revokeAllPermissions = (role) => {
    if (role === "admin") {
      alert("⚠️ Cannot revoke all permissions from Admin!");
      return;
    }

    const newPermissions = {};
    Object.keys(permissions[role]).forEach(key => {
      newPermissions[key] = false;
    });

    setPermissions({ ...permissions, [role]: newPermissions });
    setChanges({ ...changes, [role]: true });
    setShowSavePrompt(true);
  };

  return (
    <div className="permissions-editor-container">

      {/* Role Selector */}
      <div className="role-selector">
        {Object.entries(ROLES).map(([roleKey, roleData]) => (
          <button
            key={roleKey}
            className={`role-btn ${selectedRole === roleKey ? "active" : ""}`}
            onClick={() => setSelectedRole(roleKey)}
            style={{
              borderLeftColor: roleData.color,
              backgroundColor: selectedRole === roleKey ? `${roleData.color}15` : "white"
            }}
          >
            <div className="role-btn-content">
              <div className="role-btn-label">{roleData.label}</div>
              <div className="role-btn-desc">{roleData.description}</div>
              <div className="role-btn-tier">Tier {roleData.tier}</div>
            </div>
            {changes[roleKey] && <div className="unsaved-badge">●</div>}
          </button>
        ))}
      </div>

      {/* Permission Controls */}
      <div className="permission-controls">
        <button
          className="control-btn grant-all"
          onClick={() => grantAllPermissions(selectedRole)}
          disabled={selectedRole === "patient"}
        >
          <FaUnlock /> Grant All
        </button>
        <button
          className="control-btn revoke-all"
          onClick={() => revokeAllPermissions(selectedRole)}
          disabled={selectedRole === "admin"}
        >
          <FaLock /> Revoke All
        </button>
      </div>

      {/* Permissions Matrix */}
      <div className="permissions-matrix">
        {Object.entries(PERMISSION_CATEGORIES).map(([category, categoryData]) => (
          <div key={category} className="permission-category">
            <div className="category-header">
              <span className="category-icon">{categoryData.icon}</span>
              <h3>{category}</h3>
            </div>

            <div className="permissions-list">
              {Object.entries(categoryData.permissions).map(([permKey, permData]) => {
                const fullKey = `${category}|${permKey}`;
                const isGranted = permissions[selectedRole]?.[fullKey];
                const riskColor = {
                  low: "#10b981",
                  medium: "#f59e0b",
                  high: "#ef4444",
                  critical: "#991b1b"
                }[permData.risk];

                return (
                  <div key={fullKey} className="permission-item">
                    <div className="permission-info">
                      <div className="permission-label">{permData.label}</div>
                      <div className="permission-meta">
                        <span className="risk-badge" style={{ borderLeftColor: riskColor }}>
                          Risk: <strong>{permData.risk.toUpperCase()}</strong>
                        </span>
                      </div>
                    </div>

                    <button
                      className={`permission-toggle ${isGranted ? "granted" : "denied"}`}
                      onClick={() => togglePermission(selectedRole, fullKey)}
                      title={isGranted ? "Click to revoke" : "Click to grant"}
                    >
                      {isGranted ? (
                        <>
                          <FaCheck /> Granted
                        </>
                      ) : (
                        <>
                          <FaTimes /> Denied
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Permission Summary */}
      <div className="permission-summary">
        <h3>📊 Permission Summary</h3>
        <div className="summary-grid">
          {Object.entries(ROLES).map(([roleKey, roleData]) => {
            const totalPerms = Object.keys(PERMISSION_CATEGORIES).reduce(
              (sum, cat) => sum + Object.keys(PERMISSION_CATEGORIES[cat].permissions).length,
              0
            );
            const grantedPerms = Object.values(permissions[roleKey] || {}).filter(v => v).length;
            const percentage = ((grantedPerms / totalPerms) * 100).toFixed(0);

            return (
              <div key={roleKey} className="summary-card">
                <div className="summary-title">{roleData.label}</div>
                <div className="summary-stat">{grantedPerms}/{totalPerms}</div>
                <div className="summary-bar">
                  <div className="summary-fill" style={{ width: `${percentage}%` }} />
                </div>
                <div className="summary-percent">{percentage}%</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Save / Reset */}
      {showSavePrompt && (
        <div className="action-buttons">
          <button className="btn-save" onClick={handleSave}>
            <FaSave /> Save Changes
          </button>
          <button className="btn-reset" onClick={handleReset}>
            <FaTimes /> Reset to Defaults
          </button>
        </div>
      )}

      {/* Security Guidelines */}
      <div className="security-guidelines">
        <h3>🛡️ Security Best Practices</h3>
        <ul>
          <li>✅ <strong>Least Privilege:</strong> Grant only necessary permissions</li>
          <li>✅ <strong>Role Separation:</strong> Each role has unique responsibilities</li>
          <li>✅ <strong>Regular Audits:</strong> Review permissions quarterly</li>
          <li>✅ <strong>Emergency Access:</strong> Logged with justification</li>
          <li>✅ <strong>Critical Actions:</strong> Require dual approval</li>
        </ul>
      </div>

    </div>
  );
};

export default PermissionsEditor;
