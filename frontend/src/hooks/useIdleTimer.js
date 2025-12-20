import { useEffect, useRef } from 'react';

/**
 * Custom hook to handle session timeout due to inactivity.
 * @param {number} timeout - Timeout duration in milliseconds.
 * @param {function} onTimeout - Callback to execute when timeout is reached.
 * @param {boolean} isActive - Whether the timer should be active (e.g. only when logged in).
 */
const useIdleTimer = (timeout, onTimeout, isActive = true) => {
  const timeoutRef = useRef(null);

  useEffect(() => {
    // If not active (e.g. user not logged in), do nothing
    if (!isActive) return;

    const resetTimer = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(onTimeout, timeout);
    };

    // Events to monitor for activity
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    
    // Initial timer start
    resetTimer();

    // Attach event listeners
    // Use capture: true to ensure we catch events even if propagation is stopped
    events.forEach(event => window.addEventListener(event, resetTimer, { capture: true }));

    // Cleanup
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      events.forEach(event => window.removeEventListener(event, resetTimer, { capture: true }));
    };
  }, [timeout, onTimeout, isActive]);
};

export default useIdleTimer;
