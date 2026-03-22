const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    film: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Film",
      required: true,
    },
    seats: {
      type: [String],
      required: true,
      validate: {
        validator: function (v) {
          return v && v.length > 0;
        },
        message: "A booking must have at least one seat.",
      },
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
    },
    bookingDate: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

BookingSchema.index({ user: 1 });
BookingSchema.index({ film: 1, bookingDate: 1 });

module.exports = mongoose.model("Booking", BookingSchema);
