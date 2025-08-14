const express = require('express');
const router = express.Router();

const { getAnUser, createAnUser, getUsers, getProfile, updateUser } = require('../controllers/userController');
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
  .patch(updateUser)

module.exports = router;
