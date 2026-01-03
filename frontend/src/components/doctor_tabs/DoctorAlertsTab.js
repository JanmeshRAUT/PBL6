import React from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';
import "../../css/DoctorAlertsTab.css";

const DoctorAlertsTab = () => {
  const alerts = [
    { 
      title: "System Maintenance Scheduled", 
      msg: "The EHR system will undergo maintenance on Saturday at 2:00 AM UTC. Please save your work.", 
      type: "info", 
      time: "2 hours ago" 
    },
    { 
      title: "New Security Protocol", 
      msg: "Multi-factor authentication (MFA) will be mandatory starting next week. Please set up your device in settings.", 
      type: "warning", 
      time: "1 day ago" 
    },
    { 
      title: "Network Policy Update", 
      msg: "External access restrictions have been updated. Review your permissions tab for details.", 
      type: "alert", 
      time: "3 days ago" 
    }
  ];

  return (
    <div className="alerts-wrapper">
      <h2 className="alerts-header">
        <FaExclamationTriangle className="icon-amber" /> System Alerts
      </h2>
      
      <div className="alerts-list">
        {alerts.map((alert, i) => (
          <div key={i} className={`alert-card ${alert.type}`}>
            <div>
              <h4 className="alert-title">{alert.title}</h4>
              <p className="alert-msg">{alert.msg}</p>
            </div>
            <span className="alert-time">{alert.time}</span>
          </div>
        ))}
        
        <div className="alerts-footer">
          End of alerts
        </div>
      </div>
    </div>
  );
};

export default DoctorAlertsTab;
