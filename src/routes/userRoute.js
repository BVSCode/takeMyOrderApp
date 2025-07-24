const express = require('express');

const router = express.Router();

const { getAnUser, createAnUser } = require('../controllers/userController');

router.
  route('/')
  .post(createAnUser)

router.
  route('/:id')
  .get(getAnUser)

module.exports = router;