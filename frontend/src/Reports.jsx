import { useState, useEffect } from "react";
import axios from "axios";

const API_URL = "http://127.0.0.1:5000/api";

export default function Reports({ members }) {
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [reports, setReports] = useState([]);
  const [file, setFile] = useState(null);
  const [reportType, setReportType] = useState("lab_report");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifyResults, setVerifyResults] = useState({});
  const [expandedReport, setExpandedReport] = useState({});

  const token = localStorage.getItem("token");
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const fetchReports = async (memberId) => {
    if (!memberId) return;
    try {
      const res = await axios.get(`${API_URL}/members/${memberId}/reports`, authHeader);
      setReports(res.data.reports);
    } catch (err) {
      setMessage("Could not load reports");
    }
  };

  useEffect(() => {
    if (selectedMemberId) fetchReports(selectedMemberId);
  }, [selectedMemberId]);

  const handleUpload = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!selectedMemberId) {
      setMessage("Please select a family member first");
      return;
    }
    if (!file) {
      setMessage("Please choose a file to upload");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("report_type", reportType);

    setLoading(true);
    try {
      await axios.post(`${API_URL}/members/${selectedMemberId}/reports`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });
      setMessage("Report uploaded and processed successfully!");
      setFile(null);
      fetchReports(selectedMemberId);
    } catch (err) {
      const errMsg = err.response?.data?.error || "Upload failed";
      setMessage(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (reportId) => {
    try {
      const res = await axios.get(`${API_URL}/reports/${reportId}/verify`, authHeader);
      setVerifyResults({ ...verifyResults, [reportId]: res.data });
    } catch (err) {
      setVerifyResults({ ...verifyResults, [reportId]: { status: "ERROR", message: "Could not verify" } });
    }
  };

  const toggleDetails = async (reportId) => {
    if (expandedReport[reportId]) {
      setExpandedReport({ ...expandedReport, [reportId]: null });
      return;
    }
    try {
      const res = await axios.get(`${API_URL}/reports/${reportId}`, authHeader);
      setExpandedReport({ ...expandedReport, [reportId]: res.data });
    } catch (err) {
      setExpandedReport({ ...expandedReport, [reportId]: { error: "Could not load details" } });
    }
  };

  const ocrStatusLabel = (status) => {
    switch (status) {
      case "done": return { text: "OCR complete", color: "green" };
      case "pending": return { text: "OCR pending", color: "#999" };
      case "failed": return { text: "OCR failed", color: "red" };
      case "unsupported": return { text: "OCR not run (PDF not yet supported)", color: "#999" };
      default: return { text: status, color: "#999" };
    }
  };

  return (
    <div style={{ maxWidth: 650, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h2>Medical Reports</h2>

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

      {selectedMemberId && (
        <>
          <form onSubmit={handleUpload} style={{ marginBottom: 20 }}>
            <div style={{ marginBottom: 10 }}>
              <label>Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                style={{ width: "100%", padding: 8 }}
              >
                <option value="lab_report">Lab Report</option>
                <option value="prescription">Prescription</option>
                <option value="scan">Scan / X-ray</option>
                <option value="discharge_summary">Discharge Summary</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div style={{ marginBottom: 10 }}>
              <label>File (PNG or JPG for OCR reading; PDF supported for storage only)</label>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setFile(e.target.files[0])}
                style={{ width: "100%", padding: 8 }}
              />
            </div>

            <button type="submit" disabled={loading} style={{ width: "100%", padding: 10 }}>
              {loading ? "Uploading and reading..." : "Upload Report"}
            </button>
          </form>

          {message && (
            <p style={{ color: message.includes("successfully") ? "green" : "red" }}>{message}</p>
          )}

          <h3>Uploaded Reports</h3>
          {reports.length === 0 ? (
            <p style={{ color: "#888" }}>No reports uploaded yet for this member.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {reports.map((r) => {
                const ocrLabel = ocrStatusLabel(r.ocr_status);
                const details = expandedReport[r.id];

                return (
                  <li
                    key={r.id}
                    style={{
                      border: "1px solid #ddd",
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 10
                    }}
                  >
                    <strong>{r.original_filename}</strong> ({r.report_type})
                    <div style={{ fontSize: 13, color: "#666" }}>
                      Uploaded: {new Date(r.uploaded_at).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 13, color: ocrLabel.color, fontWeight: "bold" }}>
                      {ocrLabel.text}
                    </div>
                    <div style={{ fontSize: 12, color: "#999", wordBreak: "break-all" }}>
                      Hash: {r.file_hash}
                    </div>

                    <div style={{ marginTop: 8 }}>
                      <button onClick={() => handleVerify(r.id)} style={{ marginRight: 10 }}>
                        Verify Integrity
                      </button>
                      {r.ocr_status === "done" && (
                        <button onClick={() => toggleDetails(r.id)} style={{ marginRight: 10 }}>
                          {expandedReport[r.id] ? "Hide Details" : "View Extracted Values"}
                        </button>
                      )}
                      <a href={`${API_URL}/reports/${r.id}/download`} target="_blank" rel="noreferrer">
                        Download
                      </a>
                    </div>

                    {verifyResults[r.id] && (
                      <div
                        style={{
                          marginTop: 8,
                          padding: 8,
                          borderRadius: 6,
                          background: verifyResults[r.id].status === "VERIFIED" ? "#e6ffed" : "#ffe6e6",
                          color: verifyResults[r.id].status === "VERIFIED" ? "green" : "red"
                        }}
                      >
                        <strong>{verifyResults[r.id].status}</strong>: {verifyResults[r.id].message}
                      </div>
                    )}

                    {details && !details.error && (
                      <div style={{ marginTop: 10, borderTop: "1px solid #eee", paddingTop: 10 }}>
                        <strong>Extracted Values:</strong>
                        {details.extracted_values.length === 0 ? (
                          <p style={{ color: "#888", fontSize: 14 }}>
                            No recognizable lab values were found in this report. OCR works best with
                            clear typed text listing parameters like "Hemoglobin: 13.5 g/dL".
                          </p>
                        ) : (
                          <ul style={{ paddingLeft: 20 }}>
                            {details.extracted_values.map((v) => (
                              <li
                                key={v.id}
                                style={{ color: v.is_abnormal ? "red" : "#333", fontSize: 14 }}
                              >
                                {v.parameter_name}: {v.value} {v.unit}
                                {v.is_abnormal && " ⚠ Outside normal range"}
                                {" "}
                                (normal: {v.normal_range_low}–{v.normal_range_high})
                              </li>
                            ))}
                          </ul>
                        )}
                        <details style={{ marginTop: 8 }}>
                          <summary style={{ cursor: "pointer", fontSize: 13, color: "#666" }}>
                            Show raw OCR text
                          </summary>
                          <pre
                            style={{
                              whiteSpace: "pre-wrap",
                              fontSize: 12,
                              background: "#f7f7f7",
                              padding: 8,
                              borderRadius: 6
                            }}
                          >
                            {details.ocr_raw_text}
                          </pre>
                        </details>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}