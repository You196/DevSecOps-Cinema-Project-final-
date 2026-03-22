import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import {
  safeParseJSON,
  sanitizeMovie,
  sanitizeToken,
  sanitizeUser,
} from "../utils/security";

export default function Home() {
  const navigate = useNavigate();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = sanitizeToken(localStorage.getItem("token") || "");
  const user = sanitizeUser(safeParseJSON(localStorage.getItem("user"), null));

  useEffect(() => {
    fetchMovies();
  }, []);

  const fetchMovies = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/movies");
      const safeMovies = Array.isArray(res.data)
        ? res.data.map(sanitizeMovie).filter(Boolean)
        : [];
      setMovies(safeMovies);
    } catch (err) {
      console.error("Failed to fetch movies:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthClick = () => {
    if (token) {
      localStorage.clear();
      navigate("/auth");
    } else {
      navigate("/auth");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top right, rgba(255,70,70,0.10), transparent 28%), #000",
        color: "#fff",
        padding: "24px",
      }}
    >
      <div
        style={{
          maxWidth: "1450px",
          margin: "0 auto",
        }}
      >
        {/* Navbar */}
        <div
          style={{
            background: "rgba(15,15,15,0.95)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "28px",
            padding: "18px 26px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "40px",
          }}
        >
          <h1
            style={{
              color: "#ff4d5a",
              fontSize: "44px",
              fontWeight: "900",
              margin: 0,
              letterSpacing: "1px",
            }}
          >
            ROYALE
          </h1>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "18px",
            }}
          >
            <button
              onClick={() => navigate("/")}
              style={navLinkStyle}
            >
              Movies
            </button>

            {token && (
              <button
                onClick={() => navigate("/my-bookings")}
                style={navLinkStyle}
              >
                My Bookings
              </button>
            )}

            <button
              onClick={handleAuthClick}
              style={authButtonStyle}
            >
              {token ? `LOG OUT${user?.name ? ` (${user.name})` : ""}` : "SIGN IN"}
            </button>
          </div>
        </div>

        {/* Hero */}
        <div style={{ marginBottom: "34px" }}>
          <h2
            style={{
              fontSize: "78px",
              fontWeight: "900",
              lineHeight: 1,
              margin: "0 0 16px 0",
            }}
          >
            NOW SHOWING
          </h2>
          <p
            style={{
              color: "#bfbfbf",
              fontSize: "22px",
              margin: 0,
            }}
          >
            Experience the magic of cinema in premium quality.
          </p>
        </div>

        {/* Movies */}
        {loading ? (
          <p style={{ color: "#bfbfbf", fontSize: "18px" }}>Loading movies...</p>
        ) : !movies.length ? (
          <div
            style={{
              minHeight: "350px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#bfbfbf",
              fontSize: "28px",
            }}
          >
            No movies available right now. Check back soon!
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "24px",
            }}
          >
            {movies.map((movie, index) => (
              <div
                key={movie._id || `movie-${index}`}
                style={{
                  background: "rgba(15,15,15,0.96)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "22px",
                  overflow: "hidden",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
                }}
              >
                <img
                  src={movie.posterUrl}
                  alt={movie.title}
                  style={{
                    width: "100%",
                    height: "360px",
                    objectFit: "cover",
                  }}
                />

                <div style={{ padding: "18px" }}>
                  <h3
                    style={{
                      margin: "0 0 10px 0",
                      fontSize: "24px",
                      fontWeight: "800",
                    }}
                  >
                    {movie.title}
                  </h3>

                  <p
                    style={{
                      color: "#bfbfbf",
                      margin: "0 0 8px 0",
                      fontSize: "15px",
                    }}
                  >
                    {movie.genre}
                  </p>

                  <p
                    style={{
                      color: "#8c8c8c",
                      margin: "0 0 16px 0",
                      fontSize: "14px",
                    }}
                  >
                    {movie.duration} min
                  </p>

                  <button
                    onClick={() => navigate(`/movie/${movie._id}`)}
                    style={bookButtonStyle}
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <footer
          style={{
            marginTop: "50px",
            paddingTop: "18px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            textAlign: "center",
            color: "#bfbfbf",
          }}
        >
          © 2026 Cinema Royale Premium. All rights reserved.
        </footer>
      </div>
    </div>
  );
}

const navLinkStyle = {
  background: "transparent",
  border: "none",
  color: "#d9d9d9",
  fontSize: "18px",
  cursor: "pointer",
  fontWeight: "500",
};

const authButtonStyle = {
  background: "linear-gradient(90deg, #ff4d6d, #ff5a3d)",
  color: "#fff",
  border: "none",
  borderRadius: "16px",
  padding: "14px 22px",
  fontWeight: "800",
  fontSize: "16px",
  cursor: "pointer",
};

const bookButtonStyle = {
  width: "100%",
  background: "linear-gradient(90deg, #ff4d6d, #ff5a3d)",
  color: "#fff",
  border: "none",
  borderRadius: "14px",
  padding: "14px",
  fontWeight: "800",
  fontSize: "16px",
  cursor: "pointer",
};
