const fs = require('fs');

const path = require('path');

exports.home = (req, res) => res.status(200).render('home', {});
exports.project = (req, res) => res.status(200).render('project');

exports.finished = (req, res) => {
  const { projectID } = req.params;
  const finalOutputFile = path.resolve(
    path.join(process.env.PROJECT_PATH, projectID, 'output.mp4')
  );

  fs.access(finalOutputFile, fs.constants.R_OK, (err) => {
    if (err) return res.sendStatus(404);
    res.sendFile(finalOutputFile);
  });
};
