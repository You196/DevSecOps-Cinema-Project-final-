const express = require('express');
const router = express.Router();
const { getFilms, getFilmById } = require('../controllers/filmController');

router.route('/')
  .get(getFilms);

router.route('/:id')
  .get(getFilmById);

module.exports = router;
