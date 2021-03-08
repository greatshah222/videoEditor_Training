const { access } = require('fs').promises;
const { constants } = require('fs');
const fs = require('fs');
const { exec } = require('child_process');
const fsPromises = require('fs').promises;
console.log(fsPromises);

const { v4: uuidv4 } = require('uuid');
const Busboy = require('busboy');

const {
  default: Mltxml,
  default: MltxmlManager,
} = require('../models/MltxmlManager');
const {
  addDuration,
  isVaidDuration,
  subDuration,
} = require('../models/TimeManager');
const ProjectManager = require('../models/ProjectManager');
const FileManager = require('../models/FileManager');
const { isset, isNaturalNumber } = require('../models/utils');

exports.projectPOST = async (req, res, next) => {
  const projectINIT = async () => {
    try {
      let projectID = uuidv4();
      fs.mkdir(path.join(process.env.PROJECT_PATH, projectID), {
        recursive: true,
      });
      await project.save(projectID, ProjectManager.init());
      return res.json({ project: projectID });
    } catch (error) {
      return next(error);
    }
  };

  await projectINIT();
};

exports.projectGET = async (req, res) => {
  const executeProjectGet = async () => {
    try {
      const projectID = req.params.projectID;

      // the below function returns [document,fd,release] so we need document from here
      const [document] = await ProjectManager.load(projectID, 'r');

      // creeating resource
      const resources = {};
      // the below document implies to the document obtained from project.load

      const producerNodes = await document.getElementsByTagName('producer');

      for (let producer of producerNodes) {
        let resource = {
          id,
          duraion: null,
          mime: null,
          name: null,
        };
        const properties = producer.getElementsByTagName('property');
        for (let property of properties) {
          switch (property.getAttribute('name')) {
            case 'musecut:mime_type':
              resource.mime = property.innerHTML;
              break;
            case 'length':
              resource.duration = property.innerHTML;
              break;
            case 'musecut:name':
              resource.name = property.innerHTML;
          }
        }
        resources[id] = resource;
      }

      // Timeline
      const timeline = {
        audio: [],
        video: [],
      };
      const tracks = document.querySelectorAll('mlt>playlist[id*="track"]');
      for (let track of tracks) {
        const trackEntry = {
          id: track.id,
          items: [],
        };

        const entries = track.childNodes;
        let time = '00:00:00,000';
        for (let entry of entries) {
          if (entry.tagName === 'blank') {
            time = await addDuration(entry.getAttribute('length'), time);
          }
          // Simple entry
          else if (
            new RegExp(/^producer/).test(entry.getAttribute('producer'))
          ) {
            const duration = await Mltxml.getDuration(entry, document);
            const startTime = time;
            time = await addDuration(duration.time, time);
            trackEntry.items.push({
              resource: entry.getAttribute('producer').replace(/^producer/, ''),
              in: duration.in,
              out: duration.out,
              start: startTime,
              end: time,
              filters: [],
              transitionTo: null,
              transitionFrom: null,
            });
          }
          // Tractor with playlist
          else {
            const tractor = document.getElementById(
              entry.getAttribute('producer')
            );
            const tracks = tractor.getElementsByTagName('multitrack').item(0)
              .childNodes;
            const trackFilters = tractor.getElementsByTagName('filter');
            let index = 0;
            for (let track of tracks) {
              const playlist = document.getElementById(
                track.getAttribute('producer')
              );
              const playlistEntry = playlist
                .getElementsByTagName('entry')
                .item(0);
              const duration = await Mltxml.getDuration(
                playlistEntry,
                document
              );
              const startTime = time;
              time = await addDuration(duration.time, time);
              let filters = [];
              for (let trackFilter of trackFilters) {
                if (trackFilter.getAttribute('track') === index.toString()) {
                  let serviceAlias = null;
                  for (let param of trackFilter.childNodes) {
                    if (param.getAttribute('name') === 'musecut:filter') {
                      serviceAlias = param.innerHTML;
                    }
                  }
                  if (serviceAlias !== null) {
                    filters.push({
                      service: serviceAlias,
                    });
                  } else {
                    filters.push({
                      service: trackFilter.getAttribute('mlt_service'),
                    });
                  }
                }
              }
              trackEntry.items.push({
                resource: playlistEntry
                  .getAttribute('producer')
                  .replace(/^producer/, ''),
                in: duration.in,
                out: duration.out,
                start: startTime,
                end: time,
                filters: filters,
                transitionTo: null,
                transitionFrom: null,
              });
              index++;
            }
          }
        }
        trackEntry['duration'] = time;

        if (new RegExp(/^videotrack\d+/).test(track.id)) {
          timeline.video.push(trackEntry);
        } else {
          timeline.audio.push(trackEntry);
        }
      }
      let processing = async () => {
        try {
          // we have directly taken acess from fs
          // refrence code link  https://nodejs.org/api/fs.html#fs_fspromises_access_path_mode

          const projectPath = project.getDirectory(req.params.projectID);
          await access(path.join(projectPath, 'processing'), constants.F_OK);

          const { stdout, stderr } = await exec(
            `cat ${path.join(
              projectPath,
              'stderr.log'
            )} | tr "\\r\\n" "\\n" | tr "\\r" "\\n" |` +
              ' grep percentage: | tail -1 | sed "s/.*percentage://"'
          );

          const parsed = Number.parseInt(stdout.trim());
          return !Number.isNaN(parsed) ? parsed : null;
        } catch (error) {
          console.log(error);
          return null;
        }
      };
      await processing();

      return res.json({
        project: req.params.projectID,
        resource: resources,
        timeline,
        processing: processing,
      });
    } catch (error) {
      console.log(error);
      fileErr(error, res);
    }
  };
  await executeProjectGet();
};

exports.projectPUT = async (req, res, next) => {
  const projectPath = ProjectManager.getDirectory(req.params.projectID);

  try {
    // wx creates the file if it does not exists
    await fsPromises.open(path.join(projectPath, 'processing'), 'wx');

    const { stdout, stderr } = await exec(
      `cd ${projectPath} && melt project.mlt -consumer avformat:output.mp4 acodec=aac vcodec=libx264 > stdout.log 2> stderr.log`
    );
    console.log(`Project ${req.params.projectID} finsished`);
    await fsPromises.unlink(path.join(projectPath, 'processing'));
    res.json({ msg: 'processing started' });
  } catch (error) {
    console.log(error);
    switch (error.code) {
      case 'EEXIST':
        return errorResponse(error.projectStillRendering403, res);
      case 'ENOENT':
        return errorResponse(error.projectNotFound404, res);
      default:
        return next(err);
    }
  }
};

exports.projectFilePOST = async (req, res, next) => {
  let busboy;
  // busboy is like multer
  try {
    busboy = new Busboy({
      headers: req.headers,
      highWaterMark: 2 * 1024 * 1024,
      limits: { files: 1 },
    });
  } catch (_) {
    // without anything means simply continue
  }

  if (!busboy) return errorResponse(error.uploadMissinfFile400, res);

  busboy.on('file', (fieldname, file, filename, transferEncoding, mimeType) => {
    const fileID = uuidv4();
    const extension = path.extname(filename);
    let filepath = path.join(
      process.env.PROJECT_PATH,
      req.params.projectID,
      fileID
    );
    if (extension.length > 1) filepath += extension;
    // opens the file as a readable stream
    const fstream = fs.createWriteStream(filepath);
    console.log(`Upload of "${filename}" started`);
    // this will wait unitl we know the readable stream is actually valid before piping
    fstream.on('open', () => {
      file.pipe(fstream);
    });

    fstream.on('finish', async () => {
      console.log(`Upload of ${filename} finished`);
      // we get lenght of duration from this function
      const length = await FileManager.getDuration(filepath, mimeType);
      // we get the values in array
      const [document, release] = await ProjectManager.load(
        req.params.projectID,
        'w'
      );
      const node = document.createElement('producer');
      node.id = 'producer' + fileID;
      node.innerHTML = `<property name="resource">${path.resolve(
        filepath
      )}</property>`;
      node.innerHTML += `<property name="musecut:mime_type">${mimeType}</property>`;
      node.innerHTML += `<property name="musecut:name">${filename}</property>`;

      if (length !== null) {
        if (isVaidDuration(length))
          node.innerHTML += `<property name="length">${length}</property>`;
        else {
          length = null;
          console.log(`Unable to get duration of ${mimeType}: ${filepath}`);
        }
      }

      const root = document.getElementsByTagName('mlt').item(0);
      root.prepend(node);
      try {
        await ProjectManager.save(
          req.params.projectID,
          root.outerHTML,
          release
        );
        res.json({
          msg: `Upload of "${filename}" OK`,
          resource_id: fileID,
          resource_mime: mimeType,
          length: length,
        });
      } catch (error) {
        next(err);
        fileErr(err, res);
      }
    });

    fstream.on('error', () => errorResponse(error.projectNotFound404, res));
  });

  return req.pipe(busboy);
};

exports.projectFileDELETE = async (req, res, next) => {
  try {
    const [document, release] = await ProjectManager.load(
      req.params.projectID,
      'w'
    );
    const root = document.getElementsByTagName('mlt').item(0);

    const entries = document.querySelectorAll(
      `mlt>playlist>entry[producer="producer${req.params.fileID}"]`
    );
    if (entries.length > 0)
      return errorResponse(error.sourceInUse403, res, release);

    const producer = document.querySelector(
      `mlt>producer[id="producer${req.params.fileID}"]`
    );
    if (producer === null)
      return errorResponse(error.sourceNotFound404, res, release);

    const filename = mltxmlManager.getProperty(producer, 'resource');
    if (filename === null) {
      release();
      return next(
        `Project "${req.params.projectID}", producer${req.params.fileID} misses resource tag`
      );
    }

    // try ro remove file,log failure
    await fsPromises.unlink(filename);
    producer.remove();
    await ProjectManager.save(req.params.projectID, root.outerHTML, release);
    return res.json({ msg: 'Resource removed successfulyy' });
  } catch (error) {
    next(error);
    fileErr(err, res);
  }
};

exports.projectFilePUT = async (req, res, next) => {
  try {
    if (!isset(req.body.track))
      return errorResponse(error.parameterTrackMissing400, res);

    const [document, release] = await ProjectManager.load(
      req.params.projectID,
      'w'
    );
    const root = document.getElementsByTagName('mlt').item(0);

    const producer = document.getElementById(`producer${req.params.fileID}`);
    if (producer === null)
      return errorResponse(error.sourceNotFound404, res, release);
    const length = MltxmlManager.getProperty(producer, 'length');
    const track = document.getElementById(req.body.track);
    if (track === null)
      return errorResponse(
        error.trackNotFound404(req.body.track),
        res,
        release
      );

    const newEntry = document.createElement('entry');
    newEntry.setAttribute('producer', 'producer' + req.params.fileID);
    const mime = MltxmlManager.getProperty(producer, 'musecut:mime_type');
    if (mime === null) {
      release();
      return next(
        `Project "${req.params.projectID}", producer "${req.params.fileID}" missing mime_type tag`
      );
    } else if (new RegExp(/^image\//).test(mime)) {
      if (new RegExp(/^videotrack\d+/).test(req.body.track) === false)
        return errorResponse(error.imgWrongTrack400, res, release);

      // Images needs duration parameter
      if (!isVaidDuration(req.body.duration))
        return errorResponse(error.parameterDurationMissing400, res, release);

      newEntry.setAttribute('in', '00:00:00,000');
      newEntry.setAttribute('out', req.body.duration);
    } else if (new RegExp(/^video\//).test(mime)) {
      if (length === null) {
        console.log(
          `Project "${req.params.projectID}", producer "${req.params.fileID}" missing length tag`
        );
        return errorResponse(error.videoDurationMissing400, res, release);
      }
      if (new RegExp(/^videotrack\d+/).test(req.body.track) === false)
        return errorResponse(error.videoWrongTrack400, res, release);
    } else if (new RegExp(/^audio\//).test(mime)) {
      if (length === null) {
        console.log(
          `Project "${req.params.projectID}", producer "${req.params.fileID}" missing length tag`
        );
        return errorResponse(error.audioDurationMissing400, res, release);
      }
      if (new RegExp(/^audiotrack\d+/).test(req.body.track) === false)
        return errorResponse(error.audioWrongTrack400, res, release);
    } else {
      // Reject everything except images, videos and audio
      return errorResponse(error.fileWrongTrack403, res, release);
    }
    track.appendChild(newEntry);
    await ProjectManager.save(req.params.projectID, root.outerHTML, release);

    return res.json({
      msg: 'Item added to timeline',
      timeline: req.body.track,
    });
  } catch (error) {
    next(error);
    fileErr(error, res);
  }
};

exports.projectFilterPOST = async (req, res, next) => {
  try {
    if (!isset(req.body.track, req.body.item, req.body.filter))
      return errorResponse(error.parameterFilterMissing400, res);

    const [document, release] = await ProjectManager.load(
      req.params.projectID,
      'w'
    );
    const root = document.getElementsByTagName('mlt').item(0);

    const track = document.getElementById(req.body.track);
    if (track === null)
      return errorResponse(
        error.trackNotFound404(req.body.track),
        res,
        release
      );

    const item = MltxmlManager.getItem(document, track, req.body.item);
    if (item === null)
      return errorResponse(
        error.itemNotFound404(req.body.item, req.body.track),
        res,
        release
      );

    let trackIndex;
    let newTractor;
    if (MltxmlManager.isSimpleNode(item)) {
      const newPlaylist = MltxmlManager.entryToPlaylist(item, document);

      // Create tractor before videotrack0
      newTractor = MltxmlManager.createTractor(document);
      newTractor.innerHTML = `<multitrack><track producer="${newPlaylist.id}"/></multitrack>`;

      trackIndex = 0;

      // Update track playlist
      item.removeAttribute('in');
      item.removeAttribute('out');
      item.setAttribute('producer', newTractor.id);
    } else {
      trackIndex = MltxmlManager.getTrackIndex(item);
      // Check if filter is already applied
      const filters = item.parentElement.parentElement.getElementsByTagName(
        'filter'
      );
      for (let filter of filters) {
        let filterName;
        if (filter.getAttribute('musecut:filter') !== null)
          filterName = filter.getAttribute('musecut:filter');
        else filterName = filter.getAttribute('mlt_service');
        if (
          filterName === req.body.filter &&
          filter.getAttribute('track') === trackIndex.toString()
        )
          return errorResponse(
            error.filterExists403(
              req.body.item,
              req.body.track,
              req.body.filter
            ),
            res,
            release
          );
      }

      newTractor = item.parentElement.parentElement;
      // Add new filter
      const newFilter = document.createElement('filter');
      let filterName = req.body.filter;
      if (isset(process.env.MAPFILTERNAMES[req.body.filter])) {
        filterName = process.env.MAPFILTERNAMES[req.body.filter];
        const newPropery = document.createElement('property');
        newPropery.setAttribute('name', 'musecut:filter');
        newPropery.innerHTML = req.body.filter;
        newFilter.appendChild(newPropery);
      }
      newFilter.setAttribute('mlt_service', filterName);
      newFilter.setAttribute('track', trackIndex.toString());
      newTractor.appendChild(newFilter);
    }
    if (isset(req.body.params)) {
      for (let param in req.body.params) {
        const newPropery = document.createElement('property');
        newPropery.setAttribute('name', param);
        if (typeof req.body.params[param] === 'number') {
          const value = req.body.params[param].toString();
          newPropery.innerHTML = value.replace(/\./, ',');
        } else {
          newPropery.innerHTML = req.body.params[param];
        }
        newFilter.appendChild(newPropery);
      }
    }
    await ProjectManager.save(req.params.projectID, root.outerHTML, release);
    return res.json({ msg: 'Filter added' });
  } catch (err) {
    next(err);
    fileErr(err, res);
  }
};

exports.projectFilterDELETE = async (req, res, next) => {
  try {
    if (!isset(req.body.track, req.body.item, req.body.filter))
      return errorResponse(error.parameterFilterMissing400, res);

    const [document, release] = await ProjectManager.load(
      req.params.projectID,
      'w'
    );
    const root = document.getElementsByTagName('mlt').item(0);

    const track = document.getElementById(req.body.track);
    if (track === null)
      return errorResponse(
        error.trackNotFound404(req.body.track),
        res,
        release
      );

    const item = MltxmlManager.getItem(document, track, req.body.item);
    if (item === null)
      return errorResponse(
        error.itemNotFound404(req.body.item, req.body.track),
        res,
        release
      );

    let filterName = req.body.filter;
    if (isset(process.env.MAPFILTERNAMES[req.body.filter]))
      filterName = process.env.MAPFILTERNAMES[req.body.filter];
    const tractor = item.parentElement.parentElement;
    const trackIndex = MltxmlManager.getTrackIndex(item);
    const filters = tractor.getElementsByTagName('filter');
    let filter;
    for (let entry of filters) {
      if (
        entry.getAttribute('mlt_service') === filterName &&
        entry.getAttribute('track') === trackIndex.toString()
      ) {
        if (filterName === req.body.filter) {
          filter = entry;
          break;
        }
        // filterName is alias
        const alias = MltxmlManager.getProperty(entry, 'musecut:filter');
        if (alias === req.body.filter) {
          filter = entry;
          break;
        }
      }
    }
    // check if filter exists
    if (MltxmlManager.isSimpleNode(item) || filter === undefined)
      return errorResponse(
        error.filterNotFound404(req.body.item, req.body.track, req.body.filter),
        res,
        release
      );
    filter.remove();
    // Tractor without filters, with one track
    if (
      !MltxmlManager.isUsedInTractor(item) &&
      tractor.getElementsByTagName('multitrack').item(0).childElementCount === 1
    ) {
      const playlist = document.getElementById(item.getAttribute('producer'));
      const entry = playlist.getElementsByTagName('entry').item(0);
      const tractorUsage = document.querySelector(
        `mlt>playlist>entry[producer="${tractor.id}"]`
      );
      tractorUsage.parentElement.insertBefore(entry, tractorUsage);

      tractorUsage.remove();
      tractor.remove();
      playlist.remove();
    }
    await ProjectManager.save(req.params.projectID, root.outerHTML, release);
    return res.json_({
      msg: 'Filter removed',
    });
  } catch (err) {
    next(err);
    fileErr(err, res);
  }
};

exports.projectTransitionPOST = async (req, res, next) => {
  try {
    // Required parameters: track, itemA, itemB, transition, duration
    if (
      !isset(
        req.body.track,
        req.body.itemA,
        req.body.itemB,
        req.body.transition,
        req.body.duration
      )
    )
      return errorResponse(error.parameterTransitionMissing400, res);

    if (
      !isNaturalNumber(req.body.itemA, req.body.itemB) ||
      !isVaidDuration(req.body.duration)
    )
      return errorResponse(error.parameterTransitionWrong400, res);
    if (req.body.itemB - req.body.itemA !== 1)
      return errorResponse(error.parameterTransitionOrder400, res);

    const [document, release] = await ProjectManager.load(
      req.params.projectID,
      'w'
    );
    const root = document.getElementsByTagName('mlt').item(0);

    const track = document.getElementById(req.body.track);
    if (track === null)
      return errorResponse(
        error.trackNotFound404(req.body.track),
        res,
        release
      );

    const itemA = mltxmlManager.getItem(document, track, req.body.itemA);
    const itemB = mltxmlManager.getItem(document, track, req.body.itemB);
    if (itemA === null)
      return errorResponse(
        error.itemNotFound404(req.body.itemA, req.body.track),
        res,
        release
      );
    if (itemB === null)
      return errorResponse(
        error.itemNotFound404(req.body.itemB, req.body.track),
        res,
        release
      );
    const durationA = MltxmlManager.getDuration(itemA, document);
    const durationB = MltxmlManager.getDuration(itemB, document);
    const waitBeforeTransition = subDuration(durationA.out, req.body.duration);
    if (
      req.body.duration > durationA.time ||
      req.body.duration > durationB.time
    )
      return errorResponse(error.transitionTooLong400, res, release);

    // Simple + Simple
    if (
      MltxmlManager.isSimpleNode(itemA) &&
      MltxmlManager.isSimpleNode(itemB)
    ) {
      // Create playlist after last producer
      const newPlaylistA = MltxmlManager.entryToPlaylist(itemA, document);
      const newPlaylistB = MltxmlManager.entryToPlaylist(itemB, document);
      newPlaylistB.innerHTML =
        `<blank length="${waitBeforeTransition}" />` + newPlaylistB.innerHTML;

      // Create tractor before videotrack0
      const newTractor = MltxmlManager.createTractor(document);
      newTractor.innerHTML = `<multitrack><track producer="${newPlaylistA.id}"/><track producer="${newPlaylistB.id}"/></multitrack>`;
      newTractor.innerHTML += `<transition mlt_service="${req.body.transition}" in="${waitBeforeTransition}" out="${durationA.out}" a_track="0" b_track="1"/>`;

      // Update track
      itemA.removeAttribute('in');
      itemA.removeAttribute('out');
      itemA.setAttribute('producer', newTractor.id);
      itemB.remove();
    }
    // Complex + Simple
    else if (
      !MltxmlManager.isSimpleNode(itemA) &&
      MltxmlManager.isSimpleNode(itemB)
    ) {
      const newPlaylist = MltxmlManager.entryToPlaylist(itemB, document);
      MltxmlManager.appendPlaylistToMultitrack(
        itemA.parentElement,
        newPlaylist,
        req.body.duration,
        req.body.transition,
        document
      );
      itemB.remove();
    }
    // Complex + Complex
    else if (!MltxmlManager.isSimpleNode(itemA)) {
      const multitrackA = itemA.parentElement;
      const multitrackB = itemB.parentElement;
      if (multitrackA === multitrackB)
        return errorResponse(error.transitionExists403, res, release);

      let duration = req.body.duration;
      let transition = req.body.transition;
      let newTrackIndex = multitrackB.childElementCount;
      let oldTrackIndex = 0;
      const transitions = multitrackB.parentElement.getElementsByTagName(
        'transition'
      );
      const filters = multitrackB.parentElement.getElementsByTagName('filter');
      const tracksB = multitrackB.childNodes;
      for (let track of tracksB) {
        // Merge transition
        if (!isset(transition)) {
          for (let transitionElement of transitions) {
            if (
              transitionElement.getAttribute('b_track') ===
              oldTrackIndex.toString()
            ) {
              transition = transitionElement.getAttribute('mlt_service');
              duration = subDuration(
                transitionElement.getAttribute('out'),
                transitionElement.getAttribute('in')
              );
            }
          }
        }

        // Merge filters
        for (let filter of filters) {
          if (filter.getAttribute('track') === oldTrackIndex.toString()) {
            filter.setAttribute('track', newTrackIndex.toString());
            multitrackA.parentElement.append(filter);
          }
        }

        let playlist = document.getElementById(track.getAttribute('producer'));
        MltxmlManager.appendPlaylistToMultitrack(
          multitrackA,
          playlist,
          duration,
          transition,
          document
        );

        transition = undefined;
        duration = undefined;
        newTrackIndex++;
        oldTrackIndex++;
      }
      const tractorB = multitrackB.parentElement;
      const tractorBentry = document.querySelector(
        `mlt>playlist>entry[producer="${tractorB.id}"]`
      );
      tractorBentry.remove();
      tractorB.remove();
    }
    // Simple + Complex
    else {
      const durationA = subDuration(
        MltxmlManager.getDuration(itemA, document).time,
        req.body.duration
      );
      const multitrackB = itemB.parentElement;
      // Re-index transition, adjust IN/OUT timing
      const transitions = multitrackB.parentElement.getElementsByTagName(
        'transition'
      );
      for (let transition of transitions) {
        transition.setAttribute(
          'a_track',
          Number(transition.getAttribute('a_track')) + 1
        );
        transition.setAttribute(
          'b_track',
          Number(transition.getAttribute('b_track')) + 1
        );
        transition.setAttribute(
          'in',
          addDuration(transition.getAttribute('in'), durationA)
        );
        transition.setAttribute(
          'out',
          addDuration(transition.getAttribute('out'), durationA)
        );
      }
      // Re-index filters
      const filters = multitrackB.parentElement.getElementsByTagName('filter');
      for (let filter of filters) {
        filter.setAttribute('track', Number(filter.getAttribute('track')) + 1);
      }
      // Adjust blank duration of tracks
      const tracks = multitrackB.childNodes;
      for (let track of tracks) {
        let playlist = document.getElementById(track.getAttribute('producer'));
        let blank = playlist.getElementsByTagName('blank').item(0);
        if (blank === null)
          playlist.innerHTML =
            `<blank length="${durationA}" />` + playlist.innerHTML;
        else
          blank.setAttribute(
            'length',
            addDuration(blank.getAttribute('length'), durationA)
          );
      }
      // Prepend multitrack with item
      const newPlaylist = MltxmlManager.entryToPlaylist(itemA, document);
      multitrackB.innerHTML =
        `<track producer="${newPlaylist.id}" />` + multitrackB.innerHTML;
      // Add new transition
      multitrackB.parentElement.innerHTML += `<transition mlt_service="${
        req.body.transition
      }" in="${durationA}" out="${
        MltxmlManager.getDuration(itemA, document).time
      }" a_track="0" b_track="1" />`;

      itemA.remove();
    }

    await ProjectManager.save(req.params.projectID, root.outerHTML, release);
    return res.json({
      msg: 'Transition Applied',
    });
  } catch (err) {
    next(err);
    fileErr(err, res);
  }
};

exports.projectItemDELETE = async (req, res, next) => {
  try {
    // Required parameters: track, item
    if (!isset(req.body.track, req.body.item))
      return errorResponse(error.parameterItemMissing400, res);

    const [document, release] = await ProjectManager.load(
      req.params.projectID,
      'w'
    );
    const root = document.getElementsByTagName('mlt').item(0);

    const track = document.getElementById(req.body.track);
    if (track === null)
      return errorResponse(
        error.trackNotFound404(req.body.track),
        res,
        release
      );

    let item = MltxmlManager.getItem(document, track, req.body.item);
    if (item === null)
      return errorResponse(
        error.itemNotFound404(req.body.item, req.body.track),
        res,
        release
      );

    let entry;
    let duration = MltxmlManager.getDuration(item, document).time;
    if (MltxmlManager.isSimpleNode(item)) {
      // It's simple element
      entry = item;
    } else {
      const tractor = item.parentElement.parentElement;
      if (tractor.getElementsByTagName('transition').length === 0) {
        // It's element with filter(s)
        const playlist = document.querySelector(
          `mlt>playlist[id="${item.getAttribute('producer')}"]`
        );
        entry = document.querySelector(
          `mlt>playlist>entry[producer="${tractor.id}"]`
        );

        tractor.remove();
        playlist.remove();
      } else {
        // It's element with transition(s)
        release();
        return; // TODO
      }
    }

    const prevEntry = entry.previousElementSibling;
    const nextEntry = entry.nextElementSibling;
    if (nextEntry !== null) {
      // Replace with blank
      if (prevEntry !== null && prevEntry.tagName === 'blank') {
        duration = addDuration(duration, prevEntry.getAttribute('length'));
        prevEntry.remove();
      }
      if (nextEntry.tagName === 'blank') {
        duration = addDuration(duration, nextEntry.getAttribute('length'));
        nextEntry.remove();
      }
      entry.outerHTML = `<blank length="${duration}"/>`;
    } else {
      // Last item, just delete
      if (prevEntry !== null && prevEntry.tagName === 'blank')
        prevEntry.remove();
      entry.remove();
    }
    await ProjectManager.save(req.params.projectID, root.outerHTML, release);
    return res.json({
      msg: 'Item Deleted',
    });
  } catch (error) {
    next(error);
    fileErr(error, res);
  }
};
exports.projectItemPUTmove = async (req, res, next) => {
  try {
    // Required parameters: track, trackTarget, item, time
    if (
      !isset(req.body.track, req.body.trackTarget, req.body.item, req.body.time)
    )
      return errorResponse(error.parameterMoveMissing400, res);

    if (req.body.time !== '00:00:00,000' && !isVaidDuration(req.body.time))
      return errorResponse(error.parameterTimeWrong400, res);
    if (
      !(
        req.body.trackTarget.includes('videotrack') &&
        req.body.track.includes('videotrack')
      )
    ) {
      if (
        !(
          req.body.trackTarget.includes('audiotrack') &&
          req.body.track.includes('audiotrack')
        )
      )
        return errorResponse(error.tracksIncompatible400, res);
    }

    const [document, release] = await ProjectManager.load(
      req.params.projectID,
      'w'
    );
    const root = document.getElementsByTagName('mlt').item(0);

    const track = document.getElementById(req.body.track);
    const trackTarget = document.getElementById(req.body.trackTarget);
    if (track === null)
      return errorResponse(
        error.trackNotFound404(req.body.track),
        res,
        release
      );
    if (trackTarget === null)
      return errorResponse(
        error.trackNotFound404(req.body.trackTarget),
        res,
        release
      );
    let item = MltxmlManager.getItem(document, track, req.body.item);
    if (item === null)
      return errorResponse(
        error.itemNotFound404(req.body.item, req.body.track),
        res,
        release
      );

    if (!MltxmlManager.isSimpleNode(item)) {
      item = item.parentElement; // Get multitrack of complex item
    }
    const itemDuration = MltxmlManager.getDuration(item, document).time;

    if (!MltxmlManager.isSimpleNode(item)) {
      item = item.parentElement; // Get tractor of complex item
      item = document.querySelector(
        `mlt>playlist>entry[producer="${item.id}"]`
      ); // Get videotrack entry
    }

    // Add blank to old location
    const prevElement = item.previousElementSibling;
    const nextElement = item.nextElementSibling;
    let leftDuration = itemDuration;

    if (prevElement !== null && prevElement.tagName === 'blank') {
      leftDuration = addDuration(
        leftDuration,
        prevElement.getAttribute('length')
      );
      prevElement.remove();
    }
    if (nextElement !== null && nextElement.tagName === 'blank') {
      leftDuration = addDuration(
        leftDuration,
        nextElement.getAttribute('length')
      );
      nextElement.remove();
    }
    if (nextElement !== null) {
      const newBlank = document.createElement('blank');
      newBlank.setAttribute('length', leftDuration);
      track.insertBefore(newBlank, item);
    }
    item.remove();

    // Check free space
    if (
      MltxmlManager.getItemInRange(
        trackTarget,
        req.body.time,
        addDuration(req.body.time, itemDuration),
        document
      ).length > 0
    )
      return errorResponse(error.moveNoSpace403, res, release);

    let targetElement = MltxmlManager.getItemAtTime(
      document,
      trackTarget,
      req.body.time
    );

    // Prepare target place
    if (targetElement.entries.length === 0) {
      // End of timeline
      if (targetElement.endTime < req.body.time) {
        const newBlank = document.createElement('blank');
        newBlank.setAttribute(
          'length',
          subDuration(req.body.time, targetElement.endTime)
        );
        trackTarget.appendChild(newBlank);
      }
      trackTarget.appendChild(item);
    } else if (targetElement.entries.length === 1) {
      // Inside blank
      const afterLength = subDuration(
        targetElement.endTime,
        addDuration(req.body.time, itemDuration)
      );
      const afterBlank = document.createElement('blank');
      afterBlank.setAttribute('length', afterLength);

      const beforeLength = subDuration(
        targetElement.entries[0].getAttribute('length'),
        addDuration(afterLength, itemDuration)
      );
      const beforeBlank = document.createElement('blank');
      beforeBlank.setAttribute('length', beforeLength);

      if (beforeLength !== '00:00:00,000')
        trackTarget.insertBefore(beforeBlank, targetElement.entries[0]);
      trackTarget.insertBefore(item, targetElement.entries[0]);
      if (
        afterLength !== '00:00:00,000' &&
        targetElement.entries[0].nextElementSibling !== null
      )
        trackTarget.insertBefore(afterBlank, targetElement.entries[0]);
      targetElement.entries[0].remove();
    } else {
      // Between two elements
      const blank =
        targetElement.entries[0].tagName === 'blank'
          ? targetElement.entries[0]
          : targetElement.entries[1];
      if (blank !== null) {
        blank.setAttribute(
          'length',
          subDuration(blank.getAttribute('length'), itemDuration)
        );
        if (blank.getAttribute('lenght') === '00:00:00,000') blank.remove();
      }
      trackTarget.insertBefore(item, targetElement.entries[1]);
    }
    await ProjectManager.save(req.params.projectID, root.outerHTML, release);
    return res.json({
      msg: 'Item MOved',
    });
  } catch (error) {
    next(error);
    fileErr(error, res);
  }
};

exports.projectItemPUTsplit = async (req, res, next) => {
  try {
    // Required parameters: track, item, time
    if (!isset(req.body.track, req.body.item, req.body.time))
      return errorResponse(error.parameterSplitMissing400, res);

    if (!isVaidDuration(req.body.time))
      return errorResponse(error.parameterTimeWrong400, res);

    const [document, release] = await ProjectManager.load(
      req.params.projectID,
      'w'
    );
    const root = document.getElementsByTagName('mlt').item(0);

    const track = document.getElementById(req.body.track);
    if (track === null)
      return errorResponse(
        error.trackNotFound404(req.body.track),
        res,
        release
      );

    let item = MltxmlManager.getItem(document, track, req.body.item);
    if (item === null)
      return errorResponse(
        error.itemNotFound404(req.body.item, req.body.track),
        res,
        release
      );

    const time = MltxmlManager.getDuration(item, document);

    if (req.body.time >= time.time)
      return errorResponse(
        error.parameterTimeRange400(time.time),
        res,
        release
      );

    let splitTime = req.body.time;
    if (time.in !== '00:00:00,000')
      splitTime = addDuration(time.in, req.body.time);

    if (MltxmlManager.isSimpleNode(item)) {
      // It's simple element
      const itemCopy = item.cloneNode();
      track.insertBefore(itemCopy, item);
      itemCopy.setAttribute('out', splitTime);
      item.setAttribute('in', splitTime);
    } else {
      const tractor = item.parentElement.parentElement;
      if (tractor.getElementsByTagName('transition').length === 0) {
        // It's element with filter(s)
        const trackItem = document
          .querySelector(`mlt>playlist[id="${item.getAttribute('producer')}"]`)
          .getElementsByTagName('entry')[0];
        const trackItemCopy = trackItem.cloneNode();
        trackItemCopy.setAttribute('out', splitTime);
        trackItem.setAttribute('in', splitTime);

        const playlistCopy = MltxmlManager.entryToPlaylist(
          trackItemCopy,
          document
        );

        const tractorCopy = MltxmlManager.createTractor(document);
        tractorCopy.innerHTML = `<multitrack><track producer="${playlistCopy.id}"/></multitrack>`;
        const filters = tractor.getElementsByTagName('filter');
        for (let filter of filters) {
          tractorCopy.innerHTML += filter.outerHTML;
        }

        const videotrackRefCopy = document.createElement('entry');
        videotrackRefCopy.setAttribute('producer', tractorCopy.id);
        const videotrackRef = document.querySelector(
          `mlt>playlist>entry[producer="${tractor.id}"]`
        );
        track.insertBefore(videotrackRefCopy, videotrackRef);
      } else {
        // It's element with transition(s)
        release();
        return; // TODO
      }
    }
    await ProjectManager.save(req.params.projectID, root.outerHTML, release);
    return res.json({
      msg: 'Item Spilt',
    });
  } catch (error) {
    next(error);
    fileErr(error, res);
  }
};

exports.projectTrackPOST = async (req, res, next) => {
  try {
    // Required parameters: type
    if (
      !isset(req.body.type) ||
      (req.body.type !== 'video' && req.body.type !== 'audio')
    )
      return errorResponse(error.parameterTrackTypeMissing400, res);

    const [document, release] = await projectManager.load(
      req.params.projectID,
      'w'
    );

    const root = document.getElementsByTagName('mlt').item(0);
    const mainTractor = document.querySelector('mlt>tractor[id="main"]');

    const tracks = document.querySelectorAll(
      `mlt>playlist[id^="${req.body.type}track"]`
    );
    const lastTrack = tracks.item(tracks.length - 1).id;
    const lastID = lastTrack.match(/^(.+)track(\d+)/);

    const newTractor = document.createElement('playlist');
    newTractor.id = lastID[1] + 'track' + (Number(lastID[2]) + 1);
    root.insertBefore(newTractor, mainTractor);

    const newTrack = document.createElement('track');
    newTrack.setAttribute('producer', newTractor.id);
    mainTractor
      .getElementsByTagName('multitrack')
      .item(0)
      .appendChild(newTrack);

    await ProjectManager.save(req.params.projectID, root.outerHTML, release);

    return res.json({
      msg: 'Track Added',
    });
  } catch (error) {
    next(error);
    fileErr(error, res);
  }
};

exports.projectTrackDELETE = async (req, res, next) => {
  try {
    const [document, release] = await ProjectManager.load(
      req.params.projectID,
      'w'
    );
    const root = document.getElementsByTagName('mlt').item(0);
    let trackID = req.params.trackID;

    const track = document.getElementById(req.params.trackID);
    if (track === null)
      return errorResponse(
        error.trackNotFound404(req.params.trackID),
        res,
        release
      );

    // Removing default track
    if (
      req.params.trackID === 'videotrack0' ||
      req.params.trackID === 'audiotrack0'
    ) {
      const type = req.params.trackID.includes('video')
        ? 'videotrack'
        : 'audiotrack';
      let nextTrack = null;
      let nextElement = track.nextElementSibling;
      while (nextElement !== null) {
        if (nextElement.id.includes(type)) {
          nextTrack = nextElement;
          break;
        }
        nextElement = nextElement.nextElementSibling;
      }

      if (nextTrack === null)
        return errorResponse(error.trackDefaultDel403, res, release);

      trackID = nextElement.id;
      nextElement.id = type + '0'; // Rename next element to videotrack0/audiotrack0
    }

    const trackRef = document.querySelector(
      `mlt>tractor>multitrack>track[producer="${trackID}"]`
    );
    trackRef.remove();

    // Remove track including items containers
    const entries = track.childNodes;
    for (let entry of entries) {
      // Container of entries
      if (
        entry.tagName !== 'blank' &&
        !new RegExp(/^producer/).test(entry.getAttribute('producer'))
      ) {
        const tractor = document.getElementById(entry.getAttribute('producer'));
        const tracks = tractor.getElementsByTagName('multitrack').item(0)
          .childNodes;
        for (let track of tracks) {
          document.getElementById(track.getAttribute('producer')).remove();
        }
        tractor.remove();
      }
    }
    track.remove();

    await ProjectManager.save(req.params.projectID, root.outerHTML, release);
    return res.json({
      msg: 'Track Deleted',
    });
  } catch (error) {
    next(error);
    fileErr(error, res);
  }
};

const fileErr = (err, res) => {
  if (err.code === 'ENOENT') errorResponse(error.projectNotFound404, res);
  else {
    console.error(err.stack);
    errorResponse(error.projectFailedOpen500, res);
  }
};

const errorResponse = (error, res, destructor = null) => {
  if (destructor !== null) destructor();

  res.status(error.code).json({
    err: error.err,
    msg: error.msg,
  });
};
