const mongoose = require('mongoose');

const FilmSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  duration: { type: Number, required: true }, // in minutes
  releaseDate: { type: Date },
  genre: { type: String },
  posterUrl: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Film', FilmSchema);
