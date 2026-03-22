const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const {
  createBooking,
  getOwnBookings,
  deleteBooking,
  getBookedSeats,
} = require("../controllers/bookingController");
const { verifyJWT } = require("../middleware/authMiddleware");
const { validateReq } = require("../middleware/validationMiddleware");
const Joi = require("joi");

const seatPattern = /^[A-Z]\d+$/;

const createBookingSchema = Joi.object({
  filmId: Joi.string()
    .custom((value, helpers) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error("any.invalid");
      }
      return value;
    })
    .required(),
  seats: Joi.array()
    .items(Joi.string().trim().uppercase().pattern(seatPattern).required())
    .min(1)
    .required(),
  bookingDate: Joi.date().iso().required(),
});

router
  .route("/")
  .post(verifyJWT, validateReq(createBookingSchema), createBooking);

router.route("/seats").get(getBookedSeats);

router.route("/user").get(verifyJWT, getOwnBookings);

router.route("/:id").delete(verifyJWT, deleteBooking);

module.exports = router;
