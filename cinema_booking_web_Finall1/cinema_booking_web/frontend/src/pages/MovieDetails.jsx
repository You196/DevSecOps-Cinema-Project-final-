import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Clock,
  Calendar as CalendarIcon,
  Star,
  Check,
} from "lucide-react";
import dayjs from "dayjs";
import { apiClient } from "../api/client";
import { sanitizeMovie } from "../utils/security";

const MovieDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);

  // Generate some realistic upcoming dates for booking
  const upcomingDates = Array.from({ length: 5 }).map((_, i) =>
    dayjs().add(i, "day"),
  );
  const [selectedDate, setSelectedDate] = useState(
    upcomingDates[0].format("YYYY-MM-DD"),
  );
  const [selectedTime, setSelectedTime] = useState(null);

  const showTimes = ["14:30", "17:00", "19:30", "22:00"];

  useEffect(() => {
    const fetchMovie = async () => {
      try {
        const res = await apiClient.get(`/movies/${id}`);
        setMovie(sanitizeMovie(res.data));
      } catch (err) {
        console.error("Failed to fetch movie details", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMovie();
  }, [id]);

  if (loading) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "100px",
          fontSize: "1.5rem",
          color: "var(--primary)",
        }}
      >
        Loading Movie Details...
      </div>
    );
  }

  if (!movie) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "100px",
          fontSize: "1.5rem",
          color: "white",
        }}
      >
        Movie not found
      </div>
    );
  }

  const handleContinue = () => {
    if (selectedDate && selectedTime) {
      // Pass the date and time via state to the Booking page
      navigate(`/book/${id}`, {
        state: { date: selectedDate, time: selectedTime },
      });
    }
  };

  return (
    <div className="site-wrapper" style={{ padding: "40px 60px" }}>
      <button
        onClick={() => navigate("/")}
        className="glass-card"
        style={{
          backgroundColor: "white",
          padding: "10px 20px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "40px",
          cursor: "pointer",
          border: "none",
        }}
      >
        <ArrowLeft size={18} /> Back to Movies
      </button>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "60px" }}
      >
        {/* Left Col: Poster Graphic */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          style={{
            position: "relative",
            borderRadius: "20px",
            overflow: "hidden",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
          }}
        >
          <img
            src={movie.posterUrl}
            alt={movie.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              background:
                "linear-gradient(to top, rgba(0,0,0,0.9), transparent)",
              padding: "40px 30px",
            }}
          >
            <span
              style={{
                background: "var(--primary)",
                padding: "5px 12px",
                borderRadius: "4px",
                fontSize: "0.8rem",
                fontWeight: "bold",
              }}
            >
              {movie.genre || "Action"}
            </span>
            <h1
              style={{
                fontSize: "3rem",
                fontWeight: "800",
                margin: "10px 0 5px 0",
              }}
            >
              {movie.title}
            </h1>
            <div
              style={{
                display: "flex",
                gap: "20px",
                alignItems: "center",
                color: "var(--text-dim)",
              }}
            >
              <span
                style={{ display: "flex", alignItems: "center", gap: "5px" }}
              >
                <Clock size={16} /> {movie.duration || "120"} mins
              </span>
              <span
                style={{ display: "flex", alignItems: "center", gap: "5px" }}
              >
                <Star size={16} fill="var(--accent)" color="var(--accent)" />{" "}
                4.8 Rating
              </span>
            </div>
          </div>
        </motion.div>

        {/* Right Col: Booking Selection */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: "flex", flexDirection: "column", gap: "40px" }}
        >
          <div>
            <h2 style={{ fontSize: "2rem", marginBottom: "20px" }}>Synopsis</h2>
            <p
              style={{
                color: "var(--text-dim)",
                fontSize: "1.1rem",
                lineHeight: "1.6",
              }}
            >
              {movie.description ||
                "No description provided for this movie. Get ready for an epic cinematic adventure."}
            </p>
          </div>

          <div className="glass-card" style={{ padding: "30px" }}>
            <h3
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "20px",
              }}
            >
              <CalendarIcon size={20} color="var(--primary)" /> Select Date
            </h3>
            <div
              style={{
                display: "flex",
                gap: "15px",
                overflowX: "auto",
                paddingBottom: "10px",
              }}
            >
              {upcomingDates.map((dateObj, i) => {
                const dateStr = dateObj.format("YYYY-MM-DD");
                const isSelected = selectedDate === dateStr;
                return (
                  <div
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    style={{
                      minWidth: "80px",
                      padding: "15px 10px",
                      textAlign: "center",
                      borderRadius: "12px",
                      cursor: "pointer",
                      border: isSelected
                        ? "2px solid var(--primary)"
                        : "1px solid var(--glass-border)",
                      background: isSelected
                        ? "rgba(255, 75, 43, 0.1)"
                        : "var(--glass)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: isSelected
                          ? "var(--primary)"
                          : "var(--text-dim)",
                        marginBottom: "5px",
                        textTransform: "uppercase",
                      }}
                    >
                      {dateObj.format("MMM")}
                    </div>
                    <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
                      {dateObj.format("DD")}
                    </div>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-dim)",
                        marginTop: "5px",
                      }}
                    >
                      {i === 0 ? "Today" : dateObj.format("ddd")}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass-card" style={{ padding: "30px" }}>
            <h3
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "20px",
              }}
            >
              <Clock size={20} color="var(--primary)" /> Select Time
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "15px",
              }}
            >
              {showTimes.map((time) => {
                const isSelected = selectedTime === time;
                return (
                  <div
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    style={{
                      padding: "15px",
                      textAlign: "center",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: "bold",
                      border: isSelected
                        ? "2px solid var(--primary)"
                        : "1px solid var(--glass-border)",
                      background: isSelected ? "var(--primary)" : "transparent",
                      color: isSelected ? "white" : "var(--text-dim)",
                      transition: "all 0.2s",
                    }}
                  >
                    {time}
                  </div>
                );
              })}
            </div>
          </div>

          <button
            className="btn-premium"
            disabled={!selectedDate || !selectedTime}
            onClick={handleContinue}
            style={{
              padding: "20px",
              fontSize: "1.2rem",
              justifyContent: "center",
              opacity: !selectedDate || !selectedTime ? 0.5 : 1,
            }}
          >
            Continue to Seat Selection <Check size={20} />
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default MovieDetails;
