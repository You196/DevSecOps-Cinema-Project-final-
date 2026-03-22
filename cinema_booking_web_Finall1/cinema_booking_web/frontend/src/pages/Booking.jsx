import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiClient } from "../api/client";
import { sanitizeMovie, sanitizeText, sanitizeToken } from "../utils/security";

const ROWS = ["A", "B", "C", "D", "E", "F"];
const SEATS_PER_ROW = 8;
const TICKET_PRICE = 12.5;

export default function Booking() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(17, 0, 0, 0);
    return formatForInput(d);
  });

  const [selectedSeats, setSelectedSeats] = useState([]);
  const [reservedSeats, setReservedSeats] = useState([]);

  const [paymentDetails, setPaymentDetails] = useState({
    cardNumber: "",
    expiry: "",
    cvv: "",
  });

  const [paymentError, setPaymentError] = useState("");
  const [pageError, setPageError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMovie();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (id && selectedDate) {
      fetchReservedSeats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, selectedDate]);

  async function fetchMovie() {
    try {
      setLoading(true);
      setPageError("");

      const res = await apiClient.get(`/movies/${id}`);
      setMovie(sanitizeMovie(res.data));
    } catch (err) {
      setPageError(
        sanitizeText(err.response?.data?.error, "Failed to load movie details")
      );
    } finally {
      setLoading(false);
    }
  }

  async function fetchReservedSeats() {
    try {
      const dateOnly = selectedDate.split("T")[0];
      const res = await apiClient.get("/booking/seats", {
        params: {
          filmId: id,
          date: dateOnly,
        },
      });
      const safeSeats = Array.isArray(res.data?.bookedSeats)
        ? res.data.bookedSeats
            .map((s) => sanitizeText(String(s)).toUpperCase().replace(/[^A-Z0-9]/g, ""))
            .filter(Boolean)
        : [];
      setReservedSeats(safeSeats);
    } catch (err) {
      console.error("Seat fetch error:", err);
      setReservedSeats([]);
    }
  }

  function toggleSeat(seat) {
    setBookingSuccess("");
    setPaymentError("");
    setPageError("");

    if (reservedSeats.includes(seat)) return;

    setSelectedSeats((prev) => {
      if (prev.includes(seat)) {
        return prev.filter((s) => s !== seat);
      }
      return [...prev, seat];
    });
  }

  function handlePaymentChange(e) {
    const { name, value } = e.target;
    setPaymentDetails((prev) => ({
      ...prev,
      [name]: value,
    }));
    setPaymentError("");
  }

  const total = useMemo(
    () => (selectedSeats.length * TICKET_PRICE).toFixed(2),
    [selectedSeats]
  );

  function cleanCardNumber(value) {
    return value.replace(/\s+/g, "").replace(/-/g, "");
  }

  function detectCardType(number) {
    const cleaned = cleanCardNumber(number);

    if (/^4\d{12}(\d{3})?(\d{3})?$/.test(cleaned)) return "Visa";
    if (
      /^(5[1-5]\d{14}|2(2[2-9]\d{12}|[3-6]\d{13}|7[01]\d{12}|720\d{12}))$/.test(
        cleaned
      )
    ) {
      return "Mastercard";
    }
    if (/^3[47]\d{13}$/.test(cleaned)) return "American Express";

    return "Unknown";
  }

  function isValidExpiry(expiry) {
    if (!/^\d{2}\/\d{2}$/.test(expiry)) return false;

    const [monthStr, yearStr] = expiry.split("/");
    const month = parseInt(monthStr, 10);
    const year = parseInt(`20${yearStr}`, 10);

    if (month < 1 || month > 12) return false;

    const now = new Date();
    const expiryDate = new Date(year, month);
    return expiryDate > now;
  }

  function isValidCVV(cvv, cardType) {
    if (cardType === "American Express") return /^\d{4}$/.test(cvv);
    return /^\d{3}$/.test(cvv);
  }

  function validatePayment({ cardNumber, expiry, cvv }) {
    const cleaned = cleanCardNumber(cardNumber);
    const cardType = detectCardType(cleaned);

    if (!cleaned) return "Please enter a card number";
    if (!/^\d+$/.test(cleaned)) return "Card number must contain digits only";
    if (cardType === "Unknown") {
      return "Please enter a valid Visa, Mastercard, or American Express card";
    }
    if (!isValidExpiry(expiry)) {
      return "Please enter a valid future expiry date in MM/YY format";
    }
    if (!isValidCVV(cvv, cardType)) {
      return cardType === "American Express"
        ? "American Express CVV must be 4 digits"
        : "CVV must be 3 digits";
    }

    return "";
  }

  async function handleConfirmBooking() {
    setPageError("");
    setPaymentError("");
    setBookingSuccess("");

    const token = sanitizeToken(localStorage.getItem("token") || "");
    if (!token) {
      setPageError("Please sign in before booking");
      setTimeout(() => navigate("/auth"), 1000);
      return;
    }

    if (!selectedSeats.length) {
      setPageError("Please select at least one seat");
      return;
    }

    const paymentValidationError = validatePayment(paymentDetails);
    if (paymentValidationError) {
      setPaymentError(paymentValidationError);
      return;
    }

    try {
      setSubmitting(true);

      const bookingPayload = {
        filmId: id,
        seats: selectedSeats,
        bookingDate: new Date(selectedDate).toISOString(),
      };

      console.log("Sending booking payload:", bookingPayload);

      const res = await apiClient.post("/booking", bookingPayload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Booking success response:", res.data);

      setBookingSuccess("Booking confirmed successfully");

      setReservedSeats((prev) => [
        ...new Set([...prev, ...selectedSeats.map((s) => s.toUpperCase())]),
      ]);

      setSelectedSeats([]);
      setPaymentDetails({
        cardNumber: "",
        expiry: "",
        cvv: "",
      });

      await fetchReservedSeats();
    } catch (err) {
      console.error("Booking error full:", err);

      if (err.response?.status === 401) {
        setPageError(
          "Your session expired or your account is no longer available. Please sign in again."
        );
        localStorage.clear();
        setTimeout(() => navigate("/auth"), 1200);
        return;
      }

      const msg =
        err.response?.data?.conflictingSeats?.length
          ? `These seats are already booked: ${err.response.data.conflictingSeats.join(", ")}`
          : err.response?.data?.error ||
            err.response?.data?.details?.join(", ") ||
            "Booking failed";

      setPageError(sanitizeText(msg, "Booking failed"));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h2 style={{ color: "#fff" }}>Loading booking page...</h2>
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h2 style={{ color: "#fff" }}>Movie not found</h2>
          <button style={backButtonStyle} onClick={() => navigate("/")}>
            ← Back Home
          </button>
        </div>
      </div>
    );
  }

  const cardType = detectCardType(paymentDetails.cardNumber);

  return (
    <div style={pageStyle}>
      <div style={{ width: "100%", maxWidth: "1560px" }}>
        <button style={backButtonStyle} onClick={() => navigate(-1)}>
          ← Back to Movie Details
        </button>

        {pageError && <p style={errorTextStyle}>{pageError}</p>}
        {bookingSuccess && <p style={successTextStyle}>{bookingSuccess}</p>}

        <div style={layoutStyle}>
          <div style={seatingCardStyle}>
            <div style={screenBarStyle} />
            <p style={screenTextStyle}>SCREEN THIS WAY</p>

            <div style={seatGridWrapper}>
              {ROWS.map((row) => (
                <div key={row} style={rowStyle}>
                  <span style={rowLabelStyle}>{row}</span>

                  {[...Array(SEATS_PER_ROW)].map((_, index) => {
                    const seat = `${row}${index + 1}`;
                    const isReserved = reservedSeats.includes(seat);
                    const isSelected = selectedSeats.includes(seat);

                    return (
                      <button
                        key={seat}
                        onClick={() => toggleSeat(seat)}
                        disabled={isReserved}
                        style={{
                          ...seatStyle,
                          background: isReserved
                            ? "#6b7280"
                            : isSelected
                            ? "#ff5a57"
                            : "#202020",
                          boxShadow: isSelected
                            ? "0 0 16px rgba(255,90,87,0.55)"
                            : "none",
                          cursor: isReserved ? "not-allowed" : "pointer",
                          opacity: isReserved ? 0.95 : 1,
                        }}
                        title={seat}
                      />
                    );
                  })}
                </div>
              ))}
            </div>

            <div style={legendStyle}>
              <div style={legendItemStyle}>
                <span style={{ ...legendBoxStyle, background: "#202020" }} />
                <span>Available</span>
              </div>
              <div style={legendItemStyle}>
                <span style={{ ...legendBoxStyle, background: "#6b7280" }} />
                <span>Reserved</span>
              </div>
              <div style={legendItemStyle}>
                <span style={{ ...legendBoxStyle, background: "#ff5a57" }} />
                <span>Selected</span>
              </div>
            </div>
          </div>

          <div style={summaryCardStyle}>
            <h2 style={summaryTitleStyle}>Summary</h2>

            <div style={{ marginBottom: "14px" }}>
              <h3 style={movieTitleStyle}>{movie.title}</h3>
              <p style={subtleTextStyle}>
                {selectedDate ? formatSummaryDate(selectedDate) : "Choose time"}
              </p>
            </div>

            <hr style={dividerStyle} />

            <div style={summaryRowStyle}>
              <span style={subtleTextStyle}>Tickets ({selectedSeats.length})</span>
              <span style={priceStyle}>${total}</span>
            </div>

            <div style={seatBadgeWrapperStyle}>
              {selectedSeats.length ? (
                selectedSeats.map((seat) => (
                  <span key={seat} style={seatBadgeStyle}>
                    {seat}
                  </span>
                ))
              ) : (
                <span style={subtleTextStyle}>No seats selected</span>
              )}
            </div>

            <hr style={dividerStyle} />

            <label style={sectionLabelStyle}>Show Date & Time</label>
            <input
              type="datetime-local"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedSeats([]);
                setPageError("");
                setBookingSuccess("");
              }}
              style={inputStyle}
            />

            <label style={sectionLabelStyle}>Payment Details</label>

            <input
              type="text"
              name="cardNumber"
              placeholder="Card Number"
              value={paymentDetails.cardNumber}
              onChange={handlePaymentChange}
              style={inputStyle}
            />

            <p style={cardHintStyle}>
              Card type: <span style={{ color: "#fff", fontWeight: "700" }}>{cardType}</span>
            </p>

            <div style={smallInputsRowStyle}>
              <input
                type="text"
                name="expiry"
                placeholder="MM/YY"
                value={paymentDetails.expiry}
                onChange={handlePaymentChange}
                style={{ ...inputStyle, marginBottom: 0 }}
              />

              <input
                type="text"
                name="cvv"
                placeholder="CVV"
                value={paymentDetails.cvv}
                onChange={handlePaymentChange}
                style={{ ...inputStyle, marginBottom: 0 }}
              />
            </div>

            {paymentError && <p style={errorTextStyle}>{paymentError}</p>}

            <div style={totalRowStyle}>
              <span style={totalLabelStyle}>TOTAL</span>
              <span style={totalValueStyle}>${total}</span>
            </div>

            <button
              type="button"
              onClick={handleConfirmBooking}
              disabled={submitting}
              style={{
                ...confirmButtonStyle,
                opacity: submitting ? 0.7 : 1,
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? "PROCESSING..." : "CONFIRM BOOKING"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatForInput(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function formatSummaryDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} · ${hh}:${min}`;
}

const pageStyle = {
  minHeight: "100vh",
  background: "radial-gradient(circle at top right, rgba(255,70,70,0.12), transparent 28%), #000",
  padding: "28px",
  boxSizing: "border-box",
};

const cardStyle = {
  maxWidth: "700px",
  margin: "80px auto",
  background: "#0b0b0b",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "28px",
  padding: "32px",
};

const backButtonStyle = {
  background: "#0f0f0f",
  color: "#bfbfbf",
  border: "1px solid rgba(255,255,255,0.08)",
  padding: "14px 22px",
  borderRadius: "999px",
  cursor: "pointer",
  marginBottom: "20px",
  fontSize: "16px",
};

const layoutStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 380px",
  gap: "28px",
};

const seatingCardStyle = {
  background: "#0b0b0b",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "28px",
  padding: "36px 40px",
  minHeight: "700px",
};

const summaryCardStyle = {
  background: "rgba(20, 10, 10, 0.9)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "28px",
  padding: "32px",
  height: "fit-content",
  color: "#fff",
};

const screenBarStyle = {
  width: "86%",
  height: "8px",
  margin: "26px auto 34px",
  borderRadius: "999px",
  background: "linear-gradient(90deg, #ff4d6d, #ff5a3d)",
  boxShadow: "0 0 18px rgba(255,90,87,0.55)",
};

const screenTextStyle = {
  textAlign: "center",
  color: "#bfbfbf",
  letterSpacing: "4px",
  marginBottom: "32px",
};

const seatGridWrapper = {
  display: "flex",
  flexDirection: "column",
  gap: "18px",
  alignItems: "center",
};

const rowStyle = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
};

const rowLabelStyle = {
  width: "18px",
  color: "#bfbfbf",
  fontSize: "24px",
  marginRight: "10px",
};

const seatStyle = {
  width: "36px",
  height: "36px",
  border: "none",
  borderRadius: "8px",
};

const legendStyle = {
  display: "flex",
  gap: "28px",
  justifyContent: "center",
  marginTop: "56px",
  color: "#fff",
};

const legendItemStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  color: "#d9d9d9",
};

const legendBoxStyle = {
  width: "16px",
  height: "16px",
  borderRadius: "4px",
  display: "inline-block",
};

const summaryTitleStyle = {
  color: "#fff",
  fontSize: "22px",
  marginBottom: "24px",
};

const movieTitleStyle = {
  color: "#ff5a57",
  fontSize: "20px",
  margin: 0,
};

const subtleTextStyle = {
  color: "#bfbfbf",
  fontSize: "15px",
  marginTop: "8px",
};

const dividerStyle = {
  border: "none",
  borderTop: "1px solid rgba(255,255,255,0.08)",
  margin: "20px 0",
};

const summaryRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "14px",
};

const priceStyle = {
  color: "#fff",
  fontWeight: "700",
  fontSize: "18px",
};

const seatBadgeWrapperStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  minHeight: "30px",
};

const seatBadgeStyle = {
  padding: "6px 10px",
  background: "#151515",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "8px",
  fontSize: "14px",
};

const sectionLabelStyle = {
  display: "block",
  color: "#fff",
  fontWeight: "700",
  marginBottom: "12px",
  marginTop: "12px",
};

const inputStyle = {
  width: "100%",
  padding: "16px 18px",
  marginBottom: "12px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "#f0f3fa",
  color: "#111",
  fontSize: "16px",
  boxSizing: "border-box",
  outline: "none",
};

const cardHintStyle = {
  color: "#bfbfbf",
  fontSize: "13px",
  marginTop: "2px",
  marginBottom: "12px",
};

const smallInputsRowStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
  marginBottom: "4px",
};

const totalRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: "18px",
  marginBottom: "18px",
};

const totalLabelStyle = {
  color: "#fff",
  fontSize: "18px",
  fontWeight: "800",
};

const totalValueStyle = {
  color: "#ff5a57",
  fontSize: "20px",
  fontWeight: "800",
};

const confirmButtonStyle = {
  width: "100%",
  padding: "18px",
  borderRadius: "16px",
  border: "none",
  background: "linear-gradient(90deg, #ff4d6d, #ff5a3d)",
  color: "#fff",
  fontWeight: "800",
  fontSize: "18px",
  boxShadow: "0 12px 22px rgba(255,90,87,0.25)",
};

const errorTextStyle = {
  color: "#ff4d4f",
  marginBottom: "14px",
  fontSize: "14px",
};

const successTextStyle = {
  color: "#52c41a",
  marginBottom: "14px",
  fontSize: "14px",
};
