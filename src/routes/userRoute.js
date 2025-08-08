const express = require('express');
const router = express.Router();

const { getAnUser, createAnUser, getUsers, getProfile } = require('../controllers/userController');
// const { authenticateJWT } = require('../controllers/authController');

// router.use(authenticateJWT);

router
  .route('/profile')
  .get(getProfile)

router.
  route('/')
  .get(getUsers)
  .post(createAnUser)

router.
  route('/:id')
  .get(getAnUser)

module.exports = router;
