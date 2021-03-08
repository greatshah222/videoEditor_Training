const express = require('express');
const {
  projectPOST,
  projectGET,
  projectPUT,
  projectFilePOST,
  projectFileDELETE,
  projectFilePUT,
  projectFilterDELETE,
  projectFilterPOST,
  projectItemDELETE,
  projectItemPUTmove,
  projectTransitionPOST,
  projectItemPUTsplit,
  projectTrackPOST,
  projectTrackDELETE,
} = require('../controller/apiController');
const { home, project, finished } = require('../controller/homeController');
const { addDuration, subDuration } = require('../models/TimeManager');

const router = express.Router();

router.get('/', home);
router.get('/project/:projectID', project);
router.get('/project/:projectID/output.mp4', finished);

// API route
router.post('/api', projectPOST);
router.get('/api/project/:projectID', projectGET);
router.put('/api/project/:projectID', projectPUT);

router.post('/api/project/:projectID/file', projectFilePOST);
router.delete('/api/project/:projectID/file/:fileID', projectFileDELETE);
router.put('/api/project/:projectID/file/:fileID', projectFilePUT);

router.post('/api/project/:projectID/filter', projectFilterPOST);
router.delete('/api/project/:projectID/filter', projectFilterDELETE);
router.post('/api/project/:projectID/transition', projectTransitionPOST);

router.delete('/api/project/:projectID/item', projectItemDELETE);
router.put('/api/project/:projectID/item/move', projectItemPUTmove);

router.put('/api/project/:projectID/item/split', projectItemPUTsplit);

router.post('/api/project/:projectID/track', projectTrackPOST);

router.delete('/api/project/:projectID/track/:trackID', projectTrackDELETE);

router.get('/api/addDuration', addDuration);
router.get('/api/subDuration', subDuration);
module.exports = router;
