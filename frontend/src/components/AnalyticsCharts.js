import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "../api";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "../css/AnalyticsCharts.css";
import "../css/Notifications.css";
import { FaTimes } from "react-icons/fa";

const AnalyticsCharts = ({ logs = [], users = [], doctorLogs = [], nurseLogs = [], patients = [] }) => {
  const [trustTrendData, setTrustTrendData] = useState([]);
  const [accessDistribution, setAccessDistribution] = useState([]);
  const [dailyAccessData, setDailyAccessData] = useState([]);
  const [roleDistribution, setRoleDistribution] = useState([]);
  const [insights, setInsights] = useState({
    highestTrustUser: "Loading...",
    mostActiveDoctor: "Loading...",
    successRate: "0%",
    avgResponseTime: "142ms",
    systemUptime: "99.9%",
  });
  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  const [loading, setLoading] = useState(true);

  // ✅ Fetch Real Access Logs OR use props
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);
        let logsData = logs;
        let usersData = users;

        // ✅ If no props provided, fetch from API
        if (!logs || logs.length === 0) {
          try {
            const logsRes = await axios.get(`${API_URL}/access_logs/admin`);
            logsData = logsRes.data.logs || [];
          } catch (err) {
            console.error("Error fetching access logs:", err);
            logsData = [];
          }
        }

        if (!users || users.length === 0) {
          try {
            const usersRes = await axios.get(`${API_URL}/get_all_users`);
            usersData = usersRes.data.users || [];
          } catch (err) {
            console.error("Error fetching users:", err);
            usersData = [];
          }
        }

        // 📊 Process Access Distribution
        const normalAccess = logsData.filter((l) => l.action?.includes("Normal")).length;
        const restrictedAccess = logsData.filter((l) => l.action?.includes("Restricted")).length;
        const emergencyAccess = logsData.filter((l) => l.action?.includes("Emergency")).length;
        const deniedAccess = logsData.filter((l) => l.status === "Denied").length;

        setAccessDistribution([
          { name: "Normal", value: normalAccess, color: "#10b981" },
          { name: "Restricted", value: restrictedAccess, color: "#2563eb" },
          { name: "Emergency", value: emergencyAccess, color: "#ef4444" },
          { name: "Denied", value: deniedAccess, color: "#f59e0b" },
        ]);

        // 📈 Process Trust Score Trend (Last 7 days)
        const groupedByDay = {};
        logsData.forEach((log) => {
          const date = new Date(log.timestamp);
          const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
          if (!groupedByDay[dayName]) {
            groupedByDay[dayName] = { count: 0, totalTrust: 0 };
          }
          groupedByDay[dayName].count++;
        });

        const trendData = Object.keys(groupedByDay).map((day) => ({
          day,
          score: Math.floor(Math.random() * 30) + 70, // Simulated trust trend
        }));

        setTrustTrendData(trendData.slice(0, 7));

        // 📋 Daily Access Attempts (Last 6 days)
        const dailyData = [];
        for (let i = 5; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

          const dayLogs = logsData.filter((log) => {
            const logDate = new Date(log.timestamp);
            return logDate.toDateString() === date.toDateString();
          });

          dailyData.push({
            date: dateStr,
            granted: dayLogs.filter((l) => l.status === "Granted" || l.status === "Approved").length,
            denied: dayLogs.filter((l) => l.status === "Denied").length,
            flagged: dayLogs.filter((l) => l.status === "Flagged").length,
          });
        }

        setDailyAccessData(dailyData);

        // 👥 Role Distribution
        const doctors = usersData.filter((u) => u.role?.toLowerCase() === "doctor").length;
        const nurses = usersData.filter((u) => u.role?.toLowerCase() === "nurse").length;
        const patientCount = usersData.filter((u) => u.role?.toLowerCase() === "patient").length;
        const admins = usersData.filter((u) => u.role?.toLowerCase() === "admin").length;

        setRoleDistribution([
          { name: "Doctors", value: doctors, color: "#3b82f6" },
          { name: "Nurses", value: nurses, color: "#10b981" },
          { name: "Patients", value: patientCount, color: "#8b5cf6" },
          { name: "Admins", value: admins, color: "#f59e0b" },
        ]);

        // 💡 Calculate Insights
        const highestTrust = usersData.reduce(
          (max, u) => ((u.trust_score || 0) > (max.trust_score || 0) ? u : max),
          { name: "N/A", trust_score: 0 }
        );

        const doctorAccessCounts = {};
        logsData.forEach((log) => {
          if (log.doctor_role?.toLowerCase() === "doctor") {
            doctorAccessCounts[log.doctor_name] = (doctorAccessCounts[log.doctor_name] || 0) + 1;
          }
        });

        const mostActive = Object.entries(doctorAccessCounts).reduce(
          (max, [name, count]) => (count > max.count ? { name, count } : max),
          { name: "N/A", count: 0 }
        );

        const totalAttempts = logsData.length;
        const successfulAccess = logsData.filter((l) => l.status === "Granted" || l.status === "Approved").length;
        const successRate = totalAttempts > 0 ? ((successfulAccess / totalAttempts) * 100).toFixed(1) : 0;

        setInsights({
          highestTrustUser: `${highestTrust.name} (${highestTrust.trust_score}%)`,
          mostActiveDoctor: `${mostActive.name} (${mostActive.count} accesses)`,
          successRate: `${successRate}%`,
          avgResponseTime: "142ms",
          systemUptime: "99.9%",
        });

        console.log("✅ Analytics data loaded:", {
          logsCount: logsData.length,
          usersCount: usersData.length,
          normalAccess,
          restrictedAccess,
          emergencyAccess,
          deniedAccess,
        });

        setLoading(false);
      } catch (error) {
        console.error("Error fetching analytics data:", error);
        setLoading(false);
      }
    };

    fetchAnalyticsData();
    const interval = setInterval(fetchAnalyticsData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [logs, users]); // ✅ Depend on prop changes

  // ✅ Show loading state
  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
        <p>📊 Loading analytics data...</p>
      </div>
    );
  }

  // Example: show toast if no data
  if (!trustTrendData.length && !accessDistribution.length && !dailyAccessData.length && !roleDistribution.length) {
    return (
      <>
        {toast.show && (
          <div className={`toast-notification toast-${toast.type}`}>
            <div className="toast-content">
              <span>⚠️ No analytics data available. Please generate some access logs first.</span>
            </div>
            <button className="toast-close" onClick={() => setToast({ ...toast, show: false })}>
              <FaTimes />
            </button>
          </div>
        )}
        <div style={{ 
          textAlign: "center", 
          padding: "2rem", 
          color: "#64748b",
          backgroundColor: "#f8fafc",
          borderRadius: "8px",
          border: "1px solid #e2e8f0"
        }}>
          <p>📊 No analytics data to display yet.</p>
          <p style={{ fontSize: "0.9rem", marginTop: "0.5rem" }}>
            Try accessing patient records or performing login actions to generate analytics data.
          </p>
        </div>
      </>
    );
  }

  return (
    <div className="analytics-charts-container">
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
      {/* Row 1: Trust Score Trend & Access Distribution */}
      <div className="charts-row">
        <div className="chart-card">
          <h3>📈 Trust Score Trend (7 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trustTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="day" />
              <YAxis domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#2563eb"
                strokeWidth={3}
                dot={{ fill: "#2563eb", r: 6 }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>🎯 Access Type Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={accessDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {accessDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Daily Access Attempts */}
      <div className="charts-row full-width">
        <div className="chart-card">
          <h3>📊 Daily Access Attempts</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={dailyAccessData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip
                contentStyle={{
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Bar dataKey="granted" fill="#10b981" name="Granted" />
              <Bar dataKey="denied" fill="#ef4444" name="Denied" />
              <Bar dataKey="flagged" fill="#f59e0b" name="Flagged" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: User Role Distribution & Insights */}
      <div className="charts-row">
        <div className="chart-card">
          <h3>👥 User Role Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={roleDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {roleDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card insights">
          <h3>💡 Key Insights</h3>
          <div className="insight-item">
            <span className="insight-label">Highest Trust Score:</span>
            <span className="insight-value">{insights.highestTrustUser}</span>
          </div>
          <div className="insight-item">
            <span className="insight-label">Most Active Doctor:</span>
            <span className="insight-value">{insights.mostActiveDoctor}</span>
          </div>
          <div className="insight-item">
            <span className="insight-label">Access Success Rate:</span>
            <span className="insight-value">{insights.successRate}</span>
          </div>
          <div className="insight-item">
            <span className="insight-label">Avg Response Time:</span>
            <span className="insight-value">{insights.avgResponseTime}</span>
          </div>
          <div className="insight-item">
            <span className="insight-label">System Uptime:</span>
            <span className="insight-value">{insights.systemUptime}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsCharts;
