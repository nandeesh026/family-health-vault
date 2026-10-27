import { useState, useEffect } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea
} from "recharts";

const API_URL = "http://127.0.0.1:5000/api";

export default function Trends({ members }) {
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [trends, setTrends] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const token = localStorage.getItem("token");
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const fetchTrends = async (memberId) => {
    if (!memberId) return;
    setLoading(true);
    setMessage("");
    try {
      const res = await axios.get(`${API_URL}/members/${memberId}/trends`, authHeader);
      setTrends(res.data.trends);
      if (Object.keys(res.data.trends).length === 0) {
        setMessage("No extracted values yet for this member. Upload a report with OCR-readable lab values first.");
      }
    } catch (err) {
      setMessage("Could not load trends");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedMemberId) fetchTrends(selectedMemberId);
  }, [selectedMemberId]);

  const formatDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <div style={{ maxWidth: 700, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h2>Health Trends</h2>

      <div style={{ marginBottom: 20 }}>
        <label>Select Family Member</label>
        <select
          value={selectedMemberId}
          onChange={(e) => setSelectedMemberId(e.target.value)}
          style={{ width: "100%", padding: 8 }}
        >
          <option value="">-- Choose a member --</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      {loading && <p>Loading trends...</p>}
      {message && <p style={{ color: "#888" }}>{message}</p>}

      {!loading && Object.keys(trends).map((paramName) => {
        const points = trends[paramName];

        // Only worth charting if there are at least 2 data points
        const chartData = points.map((p) => ({
          date: formatDate(p.date),
          value: p.value,
          isAbnormal: p.is_abnormal
        }));

        const normalLow = points[0]?.normal_range_low;
        const normalHigh = points[0]?.normal_range_high;
        const unit = points[0]?.unit || "";

        return (
          <div
            key={paramName}
            style={{
              marginBottom: 40,
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: 16
            }}
          >
            <h3 style={{ marginTop: 0 }}>
              {paramName} {unit && `(${unit})`}
            </h3>

            {points.length === 1 ? (
              <p style={{ color: "#888", fontSize: 14 }}>
                Only one reading so far ({points[0].value} {unit} on {formatDate(points[0].date)}).
                Upload another report with this value to see a trend line.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={["auto", "auto"]} />
                  <Tooltip />
                  <Legend />
                  {normalLow != null && normalHigh != null && (
                    <ReferenceArea
                      y1={normalLow}
                      y2={normalHigh}
                      fill="#e6ffed"
                      fillOpacity={0.6}
                      label={{ value: "Normal range", position: "insideTopLeft", fontSize: 11, fill: "#2a7a3a" }}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="value"
                    name={paramName}
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={(props) => {
                      const { cx, cy, payload } = props;
                      return (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={5}
                          fill={payload.isAbnormal ? "#dc2626" : "#2563eb"}
                          stroke="#fff"
                          strokeWidth={1}
                        />
                      );
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}

            <div style={{ fontSize: 13, color: "#666", marginTop: 8 }}>
              {points.filter((p) => p.is_abnormal).length > 0 && (
                <span style={{ color: "#dc2626" }}>
                  ⚠ {points.filter((p) => p.is_abnormal).length} reading(s) outside normal range
                  (shown as red dots)
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}