import { JSDOM } from 'jsdom';

const fs = require('fs');
const path = require('path');

const RWlock = require('rwlock');
const {JSDOM}= require('jsdom')

export default {
  init() {

    return (
      '<mlt><playlist id="videotrack0"/><playlist id="audiotrack0"/>' +
      '<tractor id="main"><multitrack><track producer="videotrack0" /><track producer="audiotrack0" />' +
      '</multitrack></tractor></mlt>'
    );
  },

  //   Saving the project into local system

  async save(project, data, release = undefined) {
    const filepath = path.join(process.env.PROJECTPATH, project, 'project.mlt');
    const saveProject = async () => {

      try {
        await fs.writeFile(filepath, process.env.DECLAREXML + data);
        if (typeof release !== 'undefined') release();
        await console.log(`File ${filepath} updated`);
      } catch (error) {
        console.log(`unable to update file ${filepath}`);
      }
    };
    await saveProject();
  },
  // loading the project for writing or reading from the system

  async load(project, mode) {
    const lock = new RWlock();
    const filepath = path.join(process.env.PROJECTPATH, project, 'project.mlt');

    let lockFile = mode === 'r' ? lock.async.readLock : lock.async.writeLock;

    // file will be locked till we release the lock which is done by calling the release function

    return lockFile(filepath, (release) => {
      /* 
        r+ flag means to open it in read +write mode
        fd also called file Descriptor  is number given by the computer/app to locate ot easily later
        
        */
     await fs.open(filepath, 'r+', (err, fd) => {
          // we are opening the file than reading it or writing it 
        if (err) {
          release();
          return console.log(err);
        }

        // the file gets stored in the data variable

        await fs.readFile(fd,(err,data)=>{
            if(err){
                release();
                return console.log(err);

            }
            const dom = new JSDOM(data, { contentType: 'application/xml' });        
            const document = dom.window.document;


            if(mode ==='r') release()
            return [document,fd,release]

        })
      });
    });
  },


  getDirectory(projectID){
    return path.join(process.env.PROJECTPATH,projectID)
  }
};
