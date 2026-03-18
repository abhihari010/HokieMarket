import { useState, useEffect } from "react";
import axios from "axios";

// 1. Define the shape of the data coming from FastAPI
interface DbResponse {
  status: string;
  database: string;
  message?: string; // Optional, in case of error
}

function App() {
  // 2. Tell the state it will hold a DbResponse or null
  const [dbInfo, setDbInfo] = useState<DbResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Axios will now know 'response.data' matches our DbResponse interface
        const response = await axios.get<DbResponse>(
          "http://127.0.0.1:8000/api/test-db",
        );
        setDbInfo(response.data);
      } catch (error) {
        console.error("Connection failed:", error);
        setDbInfo({
          status: "Error",
          database: "None",
          message: "Backend Unreachable",
        });
      } finally {
        setLoading(false);
      }
    };

    checkConnection();
  }, []);

  return (
    <div
      style={{
        textAlign: "center",
        marginTop: "80px",
        fontFamily: "system-ui",
      }}
    >
      <h1>Hokie Market</h1>
      <p style={{ color: "#666" }}>
        Deliverable 4: DBMS-Interface Connection Confirmation
      </p>

      <main style={{ marginTop: "40px" }}>
        {loading ? (
          <p>Pinging Database...</p>
        ) : (
          <div
            style={{
              padding: "30px",
              border: "3px solid",
              borderColor: dbInfo?.status === "Success" ? "#4CAF50" : "#F44336",
              display: "inline-block",
              borderRadius: "15px",
              backgroundColor: "#fff",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            }}
          >
            <h2
              style={{
                color: dbInfo?.status === "Success" ? "#4CAF50" : "#F44336",
                marginTop: 0,
              }}
            >
              {dbInfo?.status === "Success"
                ? "✓ SYSTEM CONNECTED"
                : "✗ CONNECTION ERROR"}
            </h2>

            {dbInfo?.status === "Success" ? (
              <div style={{ textAlign: "left", marginTop: "15px" }}>
                <p>
                  <strong>DBMS:</strong> MySQL (Port 3308)
                </p>
                <p>
                  <strong>Database:</strong> {dbInfo.database}
                </p>
                <p>
                  <strong>Environment:</strong> React (TSX) + FastAPI
                </p>
              </div>
            ) : (
              <p style={{ color: "#d32f2f" }}>{dbInfo?.message}</p>
            )}
          </div>
        )}
      </main>

      <footer style={{ marginTop: "50px", fontSize: "0.8rem", color: "#999" }}>
        Project Phase: Database Integration & Data Population
      </footer>
    </div>
  );
}

export default App;
