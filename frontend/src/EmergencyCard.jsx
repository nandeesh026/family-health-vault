export default function EmergencyQR({ members }) {
  const baseUrl = window.location.origin;

  return (
    <div style={{ maxWidth: 700, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h2>Emergency QR Cards</h2>
      <p style={{ color: "#666", fontSize: 14 }}>
        Each family member has a QR code linking to a public page showing only their blood group,
        allergies, current medications, and emergency contact — no login required. Print this and
        keep it in a wallet, bag, or on a fridge.
      </p>

      {members.length === 0 ? (
        <p style={{ color: "#888" }}>Add a family member first to generate their QR card.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 20,
            marginTop: 20
          }}
        >
          {members.map((m) => {
            const emergencyUrl = `${baseUrl}/emergency/${m.id}`;
            const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(emergencyUrl)}`;

            return (
              <div
                key={m.id}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  padding: 16,
                  textAlign: "center"
                }}
              >
                <strong>{m.name}</strong>
                <div style={{ margin: "10px 0" }}>
                  <img src={qrImageUrl} alt={`QR code for ${m.name}`} width={180} height={180} />
                </div>
                <a href={emergencyUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>
                  Open emergency page
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}