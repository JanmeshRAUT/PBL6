import React, { useState, useEffect, useRef } from "react";
import "../css/TrustScore.css";

const TrustScoreMeter = ({ score }) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  const animationRef = useRef(null);
  const previousScoreRef = useRef(0);

  useEffect(() => {
    // ✅ Only animate if score actually changed
    if (score === previousScoreRef.current) {
      return;
    }

    // ✅ Clear any existing animation
    if (animationRef.current) {
      clearInterval(animationRef.current);
    }

    const startScore = previousScoreRef.current;
    const endScore = score;
    const duration = 1000; // 1 second animation
    const steps = 50;
    const increment = (endScore - startScore) / steps;
    const stepDuration = duration / steps;

    let currentStep = 0;

    animationRef.current = setInterval(() => {
      currentStep++;

      if (currentStep >= steps) {
        setAnimatedScore(endScore);
        clearInterval(animationRef.current);
        animationRef.current = null;
        previousScoreRef.current = endScore;
      } else {
        setAnimatedScore(Math.round(startScore + increment * currentStep));
      }
    }, stepDuration);

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [score]); // ✅ Only run when actual score prop changes

  const getStrokeColor = () => {
    if (animatedScore > 80) return "url(#greenGradient)";
    if (animatedScore > 50) return "url(#yellowGradient)";
    return "url(#redGradient)";
  };

  const getStatusText = () => {
    if (animatedScore > 80) return "✅ Fully Trusted Access";
    if (animatedScore > 50) return "⚠️ Monitor Access Behavior";
    return "❌ Restricted — Low Trust Level";
  };

  const getTrustBadge = () => {
    if (animatedScore > 80)
      return <span className="badge badge-green">High Trust</span>;
    if (animatedScore > 50)
      return <span className="badge badge-yellow">Moderate Trust</span>;
    return <span className="badge badge-red">Low Trust</span>;
  };

  /* 
     Semi-circle calculation:
     - Circumference = PI * Radius (for half circle)
     - We use a full circle SVG but trace only half of it using dasharray
  */
  const radius = 80;
  const strokeWidth = 12;
  const normalizedRadius = radius - strokeWidth * 0.5;
  const circumference = normalizedRadius * 2 * Math.PI;
  // We want to show a semi-circle (50% of circle)
  // The progress should map 0-100 score to 0-50% of the circle
  const strokeDashoffset = circumference - ((animatedScore / 200) * circumference); 
  // Base background track should be exactly half circle
  const trackOffset = circumference * 0.5;

  return (
    <div className="trust-meter-card">
      <div className="trust-meter-flex">
        <div className="meter-circle">
          <svg className="meter-svg" viewBox="0 0 160 160">
            <defs>
              <linearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#34d399" />
              </linearGradient>
              <linearGradient id="yellowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#fbbf24" />
              </linearGradient>
              <linearGradient id="redGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#f87171" />
              </linearGradient>
            </defs>

            {/* Background Track (Half Circle) */}
            <circle
              cx="80"
              cy="80"
              r={normalizedRadius}
              stroke="#e2e8f0"
              strokeWidth={strokeWidth}
              fill="none"
              style={{ strokeDasharray: circumference, strokeDashoffset: trackOffset }}
              transform="rotate(0 80 80)"
            />

            {/* Progress Arc */}
            <circle
              className="meter-progress"
              cx="80"
              cy="80"
              r={normalizedRadius}
              stroke={getStrokeColor()}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          
          <div className="meter-score">
            <span className="score-value">{animatedScore}</span>
            <span className="meter-unit">Trust Score</span>
          </div>
        </div>

        <div className="meter-details">
          <div className="meter-header">
            {getTrustBadge()}
            <h3 className="trust-level-title" aria-hidden="true"> </h3>
          </div>
          <p className="trust-description">{getStatusText()}</p>
          <div className="meter-bar-bg">
            <div
              className="meter-bar"
              style={{
                width: `${animatedScore}%`,
                background:
                  animatedScore > 80
                    ? "linear-gradient(90deg,#10b981,#34d399)"
                    : animatedScore > 50
                    ? "linear-gradient(90deg,#f59e0b,#fbbf24)"
                    : "linear-gradient(90deg,#ef4444,#f87171)",
              }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrustScoreMeter;
