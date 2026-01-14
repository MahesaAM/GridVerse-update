import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clock } from "lucide-react";

export default function GeneratorChoice() {
  const navigate = useNavigate();
  const [expiresAtDisplay, setExpiresAtDisplay] = useState("");

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem("token");
    const expiresAt = localStorage.getItem("expiresAt");

    if (!token) {
      navigate("/login");
    } else if (token === "admin-token") {
      navigate("/admin");
    } else if (expiresAt && new Date(expiresAt) < new Date()) {
      localStorage.removeItem("token");
      localStorage.removeItem("expiresAt");
      navigate("/login");
    } else if (expiresAt) {
      try {
        const d = new Date(expiresAt);
        setExpiresAtDisplay(
          d.toLocaleDateString("id-ID", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        );
      } catch {
        setExpiresAtDisplay(expiresAt);
      }
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("expiresAt");
    navigate("/login");
  };

  return (
    <div className="relative flex h-screen bg-[#18191F] text-gray-300">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3">
        <button className="flex items-center bg-[#2E3042] px-4 py-1 rounded-full hover:bg-[#353846] transition">
          <Clock className="w-4 h-4 text-purple-400" />
          <span className="ml-2 text-sm text-gray-200">Expired</span>
          <span className="ml-1 text-sm text-gray-400">
            {expiresAtDisplay || "-"}
          </span>
        </button>
        <button
          onClick={handleLogout}
          title="Logout"
          className="w-8 h-8 flex items-center justify-center bg-white rounded-full transition"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4 text-black"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M5 3h10v2H7v14h8v2H5V3zm14 8l-4-4v3H9v2h6v3l4-4z" />
          </svg>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <h1 className="text-3xl font-bold mb-8 text-white">Choose Generator</h1>

        <div className="flex flex-wrap justify-center gap-6 w-full max-w-5xl">
          {/* Image Generator Card */}
          <div
            onClick={() => navigate("/image-generator")}
            className="bg-[#1C1E2B] p-6 rounded-xl cursor-pointer w-full md:w-96
                      hover:bg-[#2E3042] transition-colors duration-200
                      flex flex-col items-center"
          >
            <div className="w-24 h-24 bg-purple-600 rounded-full flex items-center justify-center mb-4">
              <span className="text-4xl font-bold text-white">Fx</span>
            </div>
            <h2 className="text-xl font-semibold mb-2">ImageFX</h2>
            <p className="text-gray-400 text-center">
              Generate beautiful images from text prompts
            </p>
          </div>



          {/* Whisk Generator Card */}
          <div
            onClick={() => navigate("/whisk-generator")}
            className="bg-[#1C1E2B] p-6 rounded-xl cursor-pointer w-full md:w-96
                      hover:bg-[#2E3042] transition-colors duration-200
                      flex flex-col items-center"
          >
            <div className="w-24 h-24 bg-amber-500 rounded-full flex items-center justify-center mb-4 overflow-hidden">
              <img
                src="assets/whisk.png"
                alt="Whisk Icon"
                className="w-full h-full object-cover"
              />
            </div>
            <h2 className="text-xl font-semibold mb-2">Whisk</h2>
            <p className="text-gray-400 text-center">
              Generate unique whisks from text prompts
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
