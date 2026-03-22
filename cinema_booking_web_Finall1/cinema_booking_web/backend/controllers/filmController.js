const Film = require('../models/Film');
const logger = require('../utils/logger');

// @desc    Get all films
// @route   GET /movies
// @access  Public
const getFilms = async (req, res) => {
  try {
    const films = await Film.find({});
    res.json(films);
  } catch (error) {
    logger.error(`Get films error: ${error.message}`);
    res.status(500).json({ error: 'Server error while fetching films' });
  }
};

// @desc    Get single film by ID
// @route   GET /movies/:id
// @access  Public
const getFilmById = async (req, res) => {
  try {
    const film = await Film.findById(req.params.id);
    if (!film) {
      return res.status(404).json({ error: 'Film not found' });
    }
    res.json(film);
  } catch (error) {
    logger.error(`Get film by ID error: ${error.message}`);
    res.status(500).json({ error: 'Server error while fetching film' });
  }
};

module.exports = {
  getFilms,
  getFilmById
};
