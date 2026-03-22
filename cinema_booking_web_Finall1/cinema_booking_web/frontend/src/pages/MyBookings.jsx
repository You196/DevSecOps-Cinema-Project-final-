import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import { sanitizeBooking, sanitizeText, sanitizeToken } from "../utils/security";

export default function MyBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMyBookings();
  }, []);

  const fetchMyBookings = async () => {
    try {
      setLoading(true);
      setError("");

      const token = sanitizeToken(localStorage.getItem("token") || "");

      if (!token) {
        setError("Please sign in first");
        setTimeout(() => navigate("/auth"), 1000);
        return;
      }

      const res = await apiClient.get("/booking/user", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const safeBookings = Array.isArray(res.data)
        ? res.data.map(sanitizeBooking).filter(Boolean)
        : [];
      setBookings(safeBookings);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.clear();
        setError("Your session expired. Please sign in again.");
        setTimeout(() => navigate("/auth"), 1200);
        return;
      }

      setError(
        sanitizeText(err.response?.data?.error, "Failed to load your bookings")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    try {
      const token = sanitizeToken(localStorage.getItem("token") || "");

      await apiClient.delete(`/booking/${bookingId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setBookings((prev) =>
        prev.map((booking) =>
          booking._id === bookingId
            ? { ...booking, status: "cancelled" }
            : booking
        )
      );
    } catch (err) {
      alert(sanitizeText(err.response?.data?.error, "Failed to cancel booking"));
    }
  };

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <h1 style={titleStyle}>MY BOOKINGS</h1>
          <p style={subtleTextStyle}>Loading your reservations...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={headerRowStyle}>
          <div>
            <h1 style={titleStyle}>MY BOOKINGS</h1>
            <p style={subtleTextStyle}>
              View your reservations and ticket details
            </p>
          </div>

          <button style={backButtonStyle} onClick={() => navigate("/")}>
            ← Back Home
          </button>
        </div>

        {error && <p style={errorTextStyle}>{error}</p>}

        {!bookings.length ? (
          <div style={emptyCardStyle}>
            <h2 style={{ color: "#fff", marginBottom: "12px" }}>
              No bookings yet
            </h2>
            <p style={subtleTextStyle}>
              You have not reserved any tickets yet.
            </p>
            <button style={primaryButtonStyle} onClick={() => navigate("/")}>
              Browse Movies
            </button>
          </div>
        ) : (
          <div style={gridStyle}>
            {bookings.map((booking) => {
              const bookingDate = new Date(booking.bookingDate);
              const createdAt = new Date(booking.createdAt);

              return (
                <div key={booking._id} style={bookingCardStyle}>
                  <div style={bookingHeaderStyle}>
                    <div>
                      <h2 style={movieTitleStyle}>
                        {booking.film?.title || "Movie"}
                      </h2>
                      <p style={ticketIdStyle}>
                        Ticket ID: {booking._id.slice(-8).toUpperCase()}
                      </p>
                    </div>

                    <span
                      style={{
                        ...statusBadgeStyle,
                        background:
                          booking.status === "confirmed"
                            ? "rgba(82,196,26,0.18)"
                            : booking.status === "cancelled"
                            ? "rgba(255,77,79,0.18)"
                            : "rgba(250,173,20,0.18)",
                        color:
                          booking.status === "confirmed"
                            ? "#52c41a"
                            : booking.status === "cancelled"
                            ? "#ff4d4f"
                            : "#faad14",
                      }}
                    >
                      {booking.status.toUpperCase()}
                    </span>
                  </div>

                  <div style={detailsGridStyle}>
                    <div style={detailBoxStyle}>
                      <span style={labelStyle}>Date</span>
                      <span style={valueStyle}>
                        {bookingDate.toLocaleDateString()}
                      </span>
                    </div>

                    <div style={detailBoxStyle}>
                      <span style={labelStyle}>Time</span>
                      <span style={valueStyle}>
                        {bookingDate.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div style={detailBoxStyle}>
                      <span style={labelStyle}>Tickets</span>
                      <span style={valueStyle}>{booking.seats?.length || 0}</span>
                    </div>

                    <div style={detailBoxStyle}>
                      <span style={labelStyle}>Total</span>
                      <span style={valueStyle}>${booking.totalPrice?.toFixed(2)}</span>
                    </div>
                  </div>

                  <div style={sectionStyle}>
                    <p style={sectionTitleStyle}>Reserved Seats</p>
                    <div style={seatWrapStyle}>
                      {booking.seats?.map((seat) => (
                        <span key={seat} style={seatBadgeStyle}>
                          {seat}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={sectionStyle}>
                    <p style={sectionTitleStyle}>Ticket Details</p>
                    <div style={ticketBoxStyle}>
                      <p style={ticketLineStyle}>
                        <strong>Movie:</strong> {booking.film?.title || "N/A"}
                      </p>
                      <p style={ticketLineStyle}>
                        <strong>Duration:</strong>{" "}
                        {booking.film?.duration
                          ? `${booking.film.duration} min`
                          : "N/A"}
                      </p>
                      <p style={ticketLineStyle}>
                        <strong>Reserved On:</strong>{" "}
                        {createdAt.toLocaleDateString()}{" "}
                        {createdAt.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>

                  {booking.film?.posterUrl && (
                    <img
                      src={booking.film.posterUrl}
                      alt={booking.film.title}
                      style={posterStyle}
                    />
                  )}

                  {booking.status !== "cancelled" && bookingDate > new Date() && (
                    <button
                      style={cancelButtonStyle}
                      onClick={() => handleCancelBooking(booking._id)}
                    >
                      Cancel Booking
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top right, rgba(255,70,70,0.12), transparent 28%), #000",
  padding: "32px",
  boxSizing: "border-box",
};

const containerStyle = {
  maxWidth: "1400px",
  margin: "0 auto",
};

const headerRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  marginBottom: "28px",
};

const titleStyle = {
  color: "#ff4d5a",
  fontSize: "48px",
  fontWeight: "900",
  margin: 0,
  letterSpacing: "1px",
};

const subtleTextStyle = {
  color: "#bfbfbf",
  fontSize: "18px",
  marginTop: "8px",
};

const backButtonStyle = {
  background: "#111",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.12)",
  padding: "14px 20px",
  borderRadius: "14px",
  cursor: "pointer",
  fontWeight: "700",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
  gap: "24px",
};

const bookingCardStyle = {
  background: "rgba(15,15,15,0.95)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "24px",
  padding: "24px",
  boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
};

const bookingHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  marginBottom: "20px",
};

const movieTitleStyle = {
  color: "#fff",
  fontSize: "28px",
  fontWeight: "800",
  margin: 0,
};

const ticketIdStyle = {
  color: "#8c8c8c",
  fontSize: "13px",
  marginTop: "8px",
};

const statusBadgeStyle = {
  padding: "8px 12px",
  borderRadius: "999px",
  fontWeight: "800",
  fontSize: "12px",
};

const detailsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "12px",
  marginBottom: "20px",
};

const detailBoxStyle = {
  background: "#141414",
  borderRadius: "16px",
  padding: "14px",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const labelStyle = {
  color: "#8c8c8c",
  fontSize: "13px",
};

const valueStyle = {
  color: "#fff",
  fontSize: "16px",
  fontWeight: "700",
};

const sectionStyle = {
  marginBottom: "18px",
};

const sectionTitleStyle = {
  color: "#ff4d5a",
  fontSize: "16px",
  fontWeight: "800",
  marginBottom: "10px",
};

const seatWrapStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
};

const seatBadgeStyle = {
  background: "#ff4d5a",
  color: "#fff",
  padding: "8px 12px",
  borderRadius: "12px",
  fontWeight: "700",
  fontSize: "14px",
};

const ticketBoxStyle = {
  background: "#141414",
  borderRadius: "16px",
  padding: "16px",
};

const ticketLineStyle = {
  color: "#e8e8e8",
  margin: "8px 0",
  fontSize: "15px",
};

const posterStyle = {
  width: "100%",
  height: "220px",
  objectFit: "cover",
  borderRadius: "18px",
  marginTop: "12px",
  marginBottom: "18px",
};

const cancelButtonStyle = {
  width: "100%",
  background: "linear-gradient(90deg, #ff4d6d, #ff5a3d)",
  color: "#fff",
  border: "none",
  padding: "16px",
  borderRadius: "16px",
  fontWeight: "800",
  fontSize: "16px",
  cursor: "pointer",
};

const emptyCardStyle = {
  background: "rgba(15,15,15,0.95)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "24px",
  padding: "40px",
  textAlign: "center",
};

const primaryButtonStyle = {
  marginTop: "20px",
  background: "linear-gradient(90deg, #ff4d6d, #ff5a3d)",
  color: "#fff",
  border: "none",
  padding: "14px 22px",
  borderRadius: "14px",
  fontWeight: "800",
  cursor: "pointer",
};

const errorTextStyle = {
  color: "#ff4d4f",
  marginBottom: "18px",
  fontSize: "15px",
};
