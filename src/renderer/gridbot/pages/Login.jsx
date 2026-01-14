import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sparkles, setSparkles] = useState([]);

  // 1) AUTO-REDIRECT kalau sudah login dan belum expired
  useEffect(() => {
    const token     = localStorage.getItem("token");
    const expiresAt = localStorage.getItem("expiresAt");
    if (token && expiresAt) {
      const now       = new Date();
      const expDate   = new Date(expiresAt);
      if (expDate > now) {
        // token masih berlaku
        if (token === "admin-token") {
          navigate("/admin");
        } else {
          navigate("/generator-choice");
        }
        return;
      } else {
        // token kedaluwarsa, bersihkan
        localStorage.removeItem("token");
        localStorage.removeItem("expiresAt");
      }
    }
  }, [navigate]);

  // 2) Sparkles background effect
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

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // ambil MAC address dari Electron main
      const macAddress = await window.electronAPI.getMacAddress();

      // cek kredensial
      const { data, error: fetchErr } = await supabase
        .from("users_imagen")
        .select("*")
        .eq("username", username)
        .eq("password", password);

      if (fetchErr) {
        setError("Failed to fetch user");
        setIsLoading(false);
        return;
      }
      if (!data || data.length === 0) {
        setError("Invalid username or password");
        setIsLoading(false);
        return;
      }

      const user = data[0];

      // batasi deviceId
      if (user.deviceId) {
        if (user.deviceId !== macAddress) {
          setError("This account is only allowed to be used on the registered device.");
          setIsLoading(false);
          return;
        }
      } else {
        // pertama kali login, simpan deviceId
        const { error: updateErr } = await supabase
          .from("users_imagen")
          .update({ deviceId: macAddress })
          .eq("id", user.id);

        if (updateErr) {
          setError("Failed to register device. Please try again.");
          setIsLoading(false);
          return;
        }
      }

      // berhasil login → set token & expiresAt
      const now = new Date();
      if (user.isAdmin) {
        localStorage.setItem("token", "admin-token");
        if (user.expiresAt) localStorage.setItem("expiresAt", user.expiresAt);
        navigate("/admin");
      } else {
        if (user.expiresAt) {
          const expDate = new Date(user.expiresAt);
          if (expDate > now) {
            localStorage.setItem("token", "user-token");
            localStorage.setItem("expiresAt", user.expiresAt);
            navigate("/generator-choice");
          } else {
            setError("Account expired. Please contact support.");
          }
        } else {
          setError("Account expiration date not set. Access denied.");
        }
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-radial-gradient text-gray-200 px-4 overflow-hidden">
      {sparkles.map(({ top, left, size, delay }, idx) => (
        <span
          key={idx}
          className="sparkle"
          style={{ top, left, width: size, height: size, animationDelay: delay }}
        />
      ))}

      <div className="bg-white/5 border border-white/15 rounded-2xl backdrop-blur-md px-8 pb-5 max-w-md w-full shadow-lg animate-fadeInUp">
        <img
          src="assets/logoHome.png"
          alt="GridBot Logo"
          className="w-40 h-40 mx-auto"
        />

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="bg-white/10 border-none rounded-lg p-3 text-white outline-none backdrop-blur-sm"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="bg-white/10 border-none rounded-lg p-3 text-white outline-none backdrop-blur-sm"
            required
          />

          {error && (
            <p className="text-red-500 text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="purple-button disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
            {isLoading ? (
              <>
                Logging in...
                <Loader2 className="w-5 h-5 animate-spin" />
              </>
            ) : (
              "Login"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
