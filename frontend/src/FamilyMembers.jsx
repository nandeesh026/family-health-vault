import { useState, useEffect } from "react";
import axios from "axios";

const API_URL = "http://127.0.0.1:5000/api";

export default function FamilyMembers({ familyId }) {
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({
    name: "",
    relation: "",
    blood_group: "",
    allergies: "",
    current_medications: "",
    emergency_contact_name: "",
    emergency_contact_phone: ""
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const fetchMembers = async () => {
    try {
      const res = await axios.get(`${API_URL}/families/${familyId}/members`, authHeader);
      setMembers(res.data.members);
    } catch (err) {
      setMessage("Could not load family members. Try logging in again.");
    }
  };

  useEffect(() => {
    if (familyId) fetchMembers();
  }, [familyId]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      await axios.post(`${API_URL}/families/${familyId}/members`, form, authHeader);
      setMessage("Member added successfully!");
      setForm({
        name: "",
        relation: "",
        blood_group: "",
        allergies: "",
        current_medications: "",
        emergency_contact_name: "",
        emergency_contact_phone: ""
      });
      fetchMembers();
    } catch (err) {
      const errMsg = err.response?.data?.error || "Something went wrong";
      setMessage(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h2>Family Members</h2>

      {members.length === 0 ? (
        <p style={{ color: "#888" }}>No family members added yet.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {members.map((m) => (
            <li
              key={m.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: 12,
                marginBottom: 10
              }}
            >
              <strong>{m.name}</strong>
              {m.relation && ` — ${m.relation}`}
              {m.blood_group && ` | Blood group: ${m.blood_group}`}
              {m.allergies && (
                <div style={{ fontSize: 14, color: "#b45309" }}>Allergies: {m.allergies}</div>
              )}
              {m.current_medications && (
                <div style={{ fontSize: 14, color: "#555" }}>Medications: {m.current_medications}</div>
              )}
              {m.emergency_contact_name && (
                <div style={{ fontSize: 14, color: "#666" }}>
                  Emergency contact: {m.emergency_contact_name}
                  {m.emergency_contact_phone && ` (${m.emergency_contact_phone})`}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <hr style={{ margin: "30px 0" }} />

      <h3>Add a Family Member</h3>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 10 }}>
          <label>Name</label>
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
          <label>Relation (e.g. Father, Daughter, Self)</label>
          <input
            type="text"
            name="relation"
            value={form.relation}
            onChange={handleChange}
            style={{ width: "100%", padding: 8 }}
          />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>Blood Group</label>
          <input
            type="text"
            name="blood_group"
            value={form.blood_group}
            onChange={handleChange}
            placeholder="e.g. O+"
            style={{ width: "100%", padding: 8 }}
          />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>Allergies (comma-separated)</label>
          <input
            type="text"
            name="allergies"
            value={form.allergies}
            onChange={handleChange}
            placeholder="e.g. Penicillin, Peanuts"
            style={{ width: "100%", padding: 8 }}
          />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>Current Medications</label>
          <input
            type="text"
            name="current_medications"
            value={form.current_medications}
            onChange={handleChange}
            placeholder="e.g. Metformin 500mg"
            style={{ width: "100%", padding: 8 }}
          />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>Emergency Contact Name</label>
          <input
            type="text"
            name="emergency_contact_name"
            value={form.emergency_contact_name}
            onChange={handleChange}
            style={{ width: "100%", padding: 8 }}
          />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>Emergency Contact Phone</label>
          <input
            type="text"
            name="emergency_contact_phone"
            value={form.emergency_contact_phone}
            onChange={handleChange}
            style={{ width: "100%", padding: 8 }}
          />
        </div>

        <button type="submit" disabled={loading} style={{ width: "100%", padding: 10 }}>
          {loading ? "Adding..." : "Add Member"}
        </button>
      </form>

      {message && (
        <p style={{ marginTop: 15, color: message.includes("successfully") ? "green" : "red" }}>
          {message}
        </p>
      )}
    </div>
  );
}