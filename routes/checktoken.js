const express = require('express')
const router = express.Router()
const authenticate = require('../middlewares/authenticate')
router.get('/checktoken', authenticate, (req, res) => {
    return res.status(200).json({message: 'Valid token'}); // Token is valid
  });
module.exports = router