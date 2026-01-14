import React, { useState, useEffect } from 'react';

export default function Background() {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <svg
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: windowSize.width,
        height: windowSize.height,
        zIndex: -1
      }}
    >
      <defs>
        <radialGradient id="bg" cx="50%" cy="100%" r="75%" fx="50%" fy="100%">
          <stop offset="0%" stopColor="#e600ff" stopOpacity="1" />
          <stop offset="40%" stopColor="#4b0082" stopOpacity="1" />
          <stop offset="100%" stopColor="#000000" stopOpacity="1" />
        </radialGradient>
      </defs>
      <rect width={windowSize.width} height={windowSize.height} fill="url(#bg)" />
    </svg>
  );
}
