import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function Home() {
  const navigate = useNavigate();
  const [sparkles, setSparkles] = useState([]);

  useEffect(() => {
    const newSparkles = [];
    for (let i = 0; i < 30; i++) {
      newSparkles.push({
        top: `${getRandomInt(0, 100)}%`,
        left: `${getRandomInt(0, 100)}%`,
        size: `${getRandomInt(2, 6)}px`,
        delay: `${Math.random() * 3}s`,
      });
    }
    setSparkles(newSparkles);
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-radial-gradient text-gray-200 px-4 overflow-hidden">
      {sparkles.map(({ top, left, size, delay }, index) => (
        <span
          key={index}
          className="sparkle"
          style={{
            top,
            left,
            width: size,
            height: size,
            animationDelay: delay,
          }}
        />
      ))}
      <img
        src="assets/logoHome.png"
        alt="GridBot Logo"
        className="w-80 h-80"
      />
      <button
        onClick={() => navigate("/login")}
        className="purple-button"
      >
        Mulai Sekarang
      </button>
    </div>
  );
}
