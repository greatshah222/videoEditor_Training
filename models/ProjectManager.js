const { JSDOM } = require('jsdom');

const fs = require('fs');
const fsPromises = require('fs').promises;

const path = require('path');

// const RWlock = require('rwlock');
const RWlock = require('async-rwlock').RWLock;

module.exports = {
  init() {
    return (
      '<mlt><playlist id="videotrack0"/><playlist id="audiotrack0"/>' +
      '<tractor id="main"><multitrack><track producer="videotrack0" /><track producer="audiotrack0" />' +
      '</multitrack></tractor></mlt>'
    );
  },

  //   Saving the project into local system

  async save(project, data, release = undefined) {
    console.log(process.env.PROJECT_PATH, 'ProjectManager');
    console.log(project);
    const filepath = path.join(
      process.env.PROJECT_PATH,
      project,
      'project.mlt'
    );
    const saveProject = async () => {
      try {
        await fsPromises.writeFile(filepath, process.env.DECLAREXML + data);
        if (typeof release !== 'undefined') release();
        await console.log(`File ${filepath} updated`);
      } catch (error) {
        console.log(`unable to update file ${filepath}`);
        console.log(error);
      }
    };
    await saveProject();
  },
  // loading the project for writing or reading from the system

  async load(project, mode) {
    try {
      const lock = new RWlock();
      const filepath = path.join(
        process.env.PROJECT_PATH,
        project,
        'project.mlt'
      );

      let lockFile = mode === 'r' ? lock.readLock : lock.writeLock;

      // file will be locked till we release the lock which is done by calling the release function

      await lockFile();
      /* 
        r+ flag means to open it in read +write mode
        fd also called file Descriptor  is number given by the computer/app to locate ot easily later
        
        */
      const toReadFIle = await fsPromises.open(filepath, 'r+');

      // the file gets stored in the data variable

      const data = await fsPromises.readFile(toReadFIle);
      console.log(data.toString(), 'data');

      const dom = new JSDOM(data, { contentType: 'application/xml' });
      const document = dom.window.document;

      // console.log(document, 'ProjectManager');
      return [document];
    } catch (error) {
      console.log(error);
    }
  },

  getDirectory(projectID) {
    return path.join(process.env.PROJECT_PATH, projectID);
  },
};
