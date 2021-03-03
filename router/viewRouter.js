const express = require('express');
const { home, project, finished } = require('../controller/homeController');

const router = express.Router();

router.get('/', home);
router.get('/project/:projectID', project);
router.get('/project/:projectID/output.mp4', finished);

module.exports = router;
