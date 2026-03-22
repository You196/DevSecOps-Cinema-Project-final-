import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { fetchCsrfToken } from "./api/client";
import Home from "./pages/Home";
import MovieDetails from "./pages/MovieDetails";
import Booking from "./pages/Booking";
import Auth from "./pages/Auth";
import MyBookings from "./pages/MyBookings";

function App() {
  useEffect(() => {
    fetchCsrfToken().catch(() => {
      // CSRF token is refreshed automatically on write requests;
      // this bootstrap call just warms it up early.
    });
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/movie/:id" element={<MovieDetails />} />
        <Route path="/book/:id" element={<Booking />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/my-bookings" element={<MyBookings />} />
      </Routes>
    </Router>
  );
}

export default App;
