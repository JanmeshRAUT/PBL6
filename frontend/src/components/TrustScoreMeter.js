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

  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (animatedScore / 100) * circumference;

  return (
    <div className="trust-meter-card">
      <div className="trust-meter-flex">
        <div className="meter-circle">
          <svg className="meter-svg" viewBox="0 0 100 100">
            <defs>
              <linearGradient
                id="greenGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#34d399" />
              </linearGradient>
              <linearGradient
                id="yellowGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#fbbf24" />
              </linearGradient>
              <linearGradient
                id="redGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#f87171" />
              </linearGradient>
            </defs>

            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="#e5e7eb"
              strokeWidth="8"
              fill="none"
            />
            <circle
              className="meter-progress"
              cx="50"
              cy="50"
              r="45"
              stroke={getStrokeColor()}
              strokeWidth="8"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="meter-score">
            {animatedScore}
            <span className="meter-unit">%</span>
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
