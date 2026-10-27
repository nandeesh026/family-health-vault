import { useState } from "react";
import axios from "axios";

const API_URL = "http://127.0.0.1:5000/api";

export default function Auth({ onLoginSuccess }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", family_name: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const endpoint = mode === "login" ? "/login" : "/register";
      const payload =
        mode === "login"
          ? { email: form.email, password: form.password }
          : form;

      const res = await axios.post(`${API_URL}${endpoint}`, payload);

      localStorage.setItem("token", res.data.access_token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      if (res.data.family) {
        localStorage.setItem("familyId", res.data.family.id);
      }

      setMessage(mode === "login" ? "Login successful!" : "Registration successful!");

      // Tell App.jsx we're logged in, so it can switch pages
      if (onLoginSuccess) {
        onLoginSuccess(res.data.user, res.data.family ? res.data.family.id : null);
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || "Something went wrong";
      setMessage(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "60px auto", fontFamily: "sans-serif" }}>
      <h2>{mode === "login" ? "Log In" : "Create Account"}</h2>

      <form onSubmit={handleSubmit}>
        {mode === "register" && (
          <>
            <div style={{ marginBottom: 10 }}>
              <label>Full Name</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                style={{ width: "100%", padding: 8 }}
              />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label>Family Name (optional)</label>
              <input
                type="text"
                name="family_name"
                value={form.family_name}
                onChange={handleChange}
                placeholder="e.g. The Gowda Family"
                style={{ width: "100%", padding: 8 }}
              />
            </div>
          </>
        )}

        <div style={{ marginBottom: 10 }}>
          <label>Email</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            style={{ width: "100%", padding: 8 }}
          />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>Password</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
            style={{ width: "100%", padding: 8 }}
          />
        </div>

        <button type="submit" disabled={loading} style={{ width: "100%", padding: 10 }}>
          {loading ? "Please wait..." : mode === "login" ? "Log In" : "Register"}
        </button>
      </form>

      {message && <p style={{ marginTop: 15, color: message.includes("successful") ? "green" : "red" }}>{message}</p>}

      <p style={{ marginTop: 20, textAlign: "center" }}>
        {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
        <button
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setMessage("");
          }}
          style={{ background: "none", border: "none", color: "blue", cursor: "pointer" }}
        >
          {mode === "login" ? "Register" : "Log In"}
        </button>
      </p>
    </div>
  );
}