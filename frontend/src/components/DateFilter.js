import React, { useState } from "react";
import { FaCalendarAlt, FaTimes } from "react-icons/fa";
import "../css/DateFilter.css";

/**
 * DateFilter Component
 * Provides date range filtering for logs
 */
const DateFilter = ({ onFilterChange, onClear, compact }) => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleStartDateChange = (e) => {
    const date = e.target.value;
    setStartDate(date);
    onFilterChange({ startDate: date, endDate });
  };

  const handleEndDateChange = (e) => {
    const date = e.target.value;
    setEndDate(date);
    onFilterChange({ startDate, endDate: date });
  };

  const handleClear = () => {
    setStartDate("");
    setEndDate("");
    onClear();
  };

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split("T")[0];



  // ✅ COMPACT MODE (For headers)
  if (compact) {
    return (
      <div className="date-filter-compact" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <input
          type="date"
          value={startDate}
          onChange={handleStartDateChange}
          max={today}
          className="med-date-input sm"
          placeholder="Start"
          title="Start Date"
        />
        <span style={{color: '#94a3b8', fontWeight: 'bold'}}>-</span>
        <input
          type="date"
          value={endDate}
          onChange={handleEndDateChange}
          max={today}
          className="med-date-input sm"
          placeholder="End"
          title="End Date"
        />
        {(startDate || endDate) && (
          <button 
            onClick={handleClear}
            className="med-btn med-btn-icon danger med-btn-sm"
            style={{ width: '32px', height: '32px' }}
            title="Clear Date Filter"
          >
            <FaTimes />
          </button>
        )}
      </div>
    );
  }

  // ✅ STANDARD MODE
  return (
    <div className="date-filter-container">
      <div className="date-filter-header">
        <h3>
          <FaCalendarAlt /> Filter by Date Range
        </h3>
      </div>

      <div className="date-filter-controls">
        <div className="date-input-group">
          <label htmlFor="start-date">Start Date</label>
          <input
            id="start-date"
            type="date"
            value={startDate}
            onChange={handleStartDateChange}
            max={today}
            className="date-input"
          />
        </div>

        <div className="date-input-group">
          <label htmlFor="end-date">End Date</label>
          <input
            id="end-date"
            type="date"
            value={endDate}
            onChange={handleEndDateChange}
            max={today}
            className="date-input"
          />
        </div>

        {(startDate || endDate) && (
          <button className="btn-clear-filter" onClick={handleClear}>
            <FaTimes /> Clear Filters
          </button>
        )}
      </div>

      {startDate && endDate && (
        <div className="date-filter-status">
          📅 Showing logs from <strong>{startDate}</strong> to <strong>{endDate}</strong>
        </div>
      )}
    </div>
  );
};

export default DateFilter;
