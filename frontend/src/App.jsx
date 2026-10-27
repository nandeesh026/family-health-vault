import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import Auth from "./Auth";
import FamilyMembers from "./FamilyMembers";
import Reports from "./Reports";
import Trends from "./Trends";
import EmergencyQR from "./EmergencyQR";
import EmergencyCard from "./EmergencyCard";

const API_URL = "http://127.0.0.1:5000/api";

function MainApp() {
  const [user, setUser] = useState(null);
  const [familyId, setFamilyId] = useState(null);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedFamilyId = localStorage.getItem("familyId");
    if (storedUser) setUser(JSON.parse(storedUser));
    if (storedFamilyId) setFamilyId(storedFamilyId);
  }, []);

  const fetchMembers = async () => {
    if (!familyId) return;
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get(`${API_URL}/families/${familyId}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMembers(res.data.members);
    } catch (err) {
      console.error("Could not fetch members", err);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [familyId]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("familyId");
    setUser(null);
    setFamilyId(null);
  };

  if (!user) {
    return <Auth onLoginSuccess={(u, fid) => { setUser(u); setFamilyId(fid); }} />;
  }

  return (
    <div>
      <div style={{ textAlign: "right", padding: 10 }}>
        <span style={{ marginRight: 10 }}>Welcome, {user.name}</span>
        <button onClick={handleLogout}>Log Out</button>
      </div>
      <FamilyMembers familyId={familyId} />
      <hr style={{ margin: "40px auto", maxWidth: 700 }} />
      <Reports members={members} />
      <hr style={{ margin: "40px auto", maxWidth: 700 }} />
      <Trends members={members} />
      <hr style={{ margin: "40px auto", maxWidth: 700 }} />
      <EmergencyQR members={members} />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public route — no login needed, accessible by scanning a QR code */}
        <Route path="/emergency/:memberId" element={<EmergencyCard />} />
        {/* Everything else is the main logged-in app */}
        <Route path="*" element={<MainApp />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;