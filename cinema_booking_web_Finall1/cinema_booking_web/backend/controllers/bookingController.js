const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Film = require("../models/Film");
const logger = require("../utils/logger");

const TICKET_PRICE = 150;

const normalizeSeats = (seats) => {
  return seats.map((seat) => seat.trim().toUpperCase());
};

// @desc    Create new booking
// @route   POST /booking
// @access  Private
const createBooking = async (req, res) => {
  const { filmId, seats, bookingDate } = req.body;

  try {
    if (!mongoose.Types.ObjectId.isValid(filmId)) {
      return res.status(400).json({ error: "Invalid film ID" });
    }

    const film = await Film.findById(filmId);
    if (!film) {
      return res.status(404).json({ error: "Film not found" });
    }

    const normalizedSeats = normalizeSeats(seats);

    const uniqueSeats = new Set(normalizedSeats);
    if (uniqueSeats.size !== normalizedSeats.length) {
      return res
        .status(400)
        .json({
          error: "Duplicate seats are not allowed in the same booking request",
        });
    }

    const selectedDate = new Date(bookingDate);
    if (isNaN(selectedDate.getTime())) {
      return res.status(400).json({ error: "Invalid booking date" });
    }

    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingBookings = await Booking.find({
      film: filmId,
      status: { $in: ["pending", "confirmed"] },
      bookingDate: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });

    const alreadyBookedSeats = existingBookings.flatMap((booking) =>
      booking.seats.map((seat) => seat.toUpperCase()),
    );
    const conflictingSeats = normalizedSeats.filter((seat) =>
      alreadyBookedSeats.includes(seat),
    );

    if (conflictingSeats.length > 0) {
      return res.status(400).json({
        error: "Some seats are already booked",
        conflictingSeats,
      });
    }

    const totalPrice = normalizedSeats.length * TICKET_PRICE;

    const booking = new Booking({
      user: req.user._id,
      film: filmId,
      seats: normalizedSeats,
      totalPrice,
      bookingDate: selectedDate,
    });

    const savedBooking = await booking.save();

    logger.info(
      `Booking created. Booking ID: ${savedBooking._id}, User ID: ${req.user._id}, IP: ${req.ip}`,
    );
    res.status(201).json(savedBooking);
  } catch (error) {
    logger.error(`Create booking error: ${error.message}`);
    res.status(500).json({ error: "Server error while creating booking" });
  }
};

// @desc    Get user bookings
// @route   GET /booking/user
// @access  Private
const getOwnBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id }).populate(
      "film",
      "title posterUrl duration",
    );
    res.json(bookings);
  } catch (error) {
    logger.error(`Get bookings error: ${error.message}`);
    res.status(500).json({ error: "Server error while fetching bookings" });
  }
};

// @desc    Delete/Cancel a booking
// @route   DELETE /booking/:id
// @access  Private
const deleteBooking = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid booking ID" });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const isOwner = booking.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      logger.warn(
        `BOLA attempt detected. User ${req.user._id} tried to cancel booking ${booking._id}`,
      );
      return res
        .status(403)
        .json({ error: "User not authorized to delete this booking" });
    }

    if (booking.status === "cancelled") {
      return res.status(400).json({ error: "Booking is already cancelled" });
    }

    if (new Date(booking.bookingDate) < new Date()) {
      return res
        .status(400)
        .json({ error: "Cannot cancel a booking for a past date" });
    }

    booking.status = "cancelled";
    await booking.save();

    logger.info(
      `Booking cancelled. Booking ID: ${booking._id}, User ID: ${req.user._id}, IP: ${req.ip}`,
    );
    res.json({ message: "Booking cancelled" });
  } catch (error) {
    logger.error(`Delete booking error: ${error.message}`);
    res.status(500).json({ error: "Server error while cancelling booking" });
  }
};

// @desc    Get booked seats for a film on a specific date
// @route   GET /booking/seats
// @access  Public
const getBookedSeats = async (req, res) => {
  const { filmId, date } = req.query;

  if (!filmId || !date) {
    return res
      .status(400)
      .json({ error: "filmId and date query parameters are required" });
  }

  if (!mongoose.Types.ObjectId.isValid(filmId)) {
    return res.status(400).json({ error: "Invalid film ID" });
  }

  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    return res.status(400).json({ error: "Invalid date" });
  }

  try {
    const startOfDay = new Date(parsedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(parsedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await Booking.find({
      film: filmId,
      status: { $in: ["pending", "confirmed"] },
      bookingDate: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });

    const bookedSeats = bookings.reduce((acc, booking) => {
      return acc.concat(booking.seats.map((seat) => seat.toUpperCase()));
    }, []);

    res.json({ bookedSeats });
  } catch (error) {
    logger.error(`Get booked seats error: ${error.message}`);
    res.status(500).json({ error: "Server error while fetching booked seats" });
  }
};

module.exports = {
  createBooking,
  getOwnBookings,
  deleteBooking,
  getBookedSeats,
};
