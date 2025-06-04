const express = require('express');
const router = express.Router();
const { reportError } = require('../controllers/error.controller');

// Route for error reporting
router.post('/report', reportError);

module.exports = router;
