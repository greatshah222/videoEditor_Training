import React, { useState } from 'react';
import axios from 'axios';
import TimelineModel from './TimelineModel';
import { addDuration } from '../utils/TImeManager';
import LoadingDialog from './LoadingDialog';
import SubmitDialog from './SubmitDialog';
import FetchErrorDialog from './FetchErrorDialog';
import SubmitToolbar from './SubmitToolbar';
import Sources from './Sources';
import Preview from './Preview';
import Timeline from './Timeline';

export default function Editor(props) {
  let datetimeStart = new Date(1970, 0, 1);
  let timerStart = new Date(1970, 0, 1);
  let timerFunction = null;
  const [project, setproject] = useState(
    window.location.href.match(/project\/([^/]*)/)[1]
  );
  const [resources, setresources] = useState({});
  const [timeline, settimeline] = useState({});
  const [processing, setProcessing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showFetchError, setShowFetchError] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [time, setTime] = useState(new Date(1970, 0, 1));
  const [playing, setPlaying] = useState(false);

  const loadData = async () => {
    try {
      const url = `http://localhost:9000/api/project/${project}`;
      const res = await axios.get(url);
      if (res.data.err === 'undefined') {
        if (res.data.processing !== null) setTimeout(loadData, 5000);
        if (processing !== null && res.data.processing === null)
          res.data.processing = 100;
        setresources(res.data.resources);
        settimeline(res.data.timeline);
        setProcessing(res.data.processing);
        setLoading(false);
      } else {
        alert(`${res.data.err}\n\n${res.data.msg}`);
      }
    } catch (error) {
      openFetchErrorDialog(error.message);
    }
  };

  const addResource = (resource) => {
    const resourcesValue = { ...resources };

    resourcesValue[resource.id] = resource;
    setresources(resourcesValue);
  };
  const delResource = (resource) => {
    const resourcesValue = { ...resources };

    delete resourcesValue[resource.id];
    setresources(resourcesValue);
  };

  const putResource = (id, duration, trackId) => {
    const timelineValue = { ...timeline };
    const track = TimelineModel.findTrack(timelineValue, trackId);
    const trackLength = track.items.length;
    if (duration === null) duration = resources[id].duration;
    const timeEnd = addDuration(track.duration, duration);

    track.items.push({
      resource: id,
      in: '00:00:00,000',
      out: duration,
      start: track.duration,
      end: timeEnd,
      filters: [],
      transitionTo: null,
      transitionFrom: null,
    });
    track.duration = timeEnd;
    settimeline(timelineValue);

    if (trackLength === 0) {
      addTrack(trackId.includes('audio') ? 'audio' : 'video');
    }
  };

  const addTrack = async (type) => {
    try {
      const url = `http://localhost:9000/api/project/${project}/track`;
      const data = { type };
      const res = await axios.post(url, data);
      if (res.data.err !== 'undefined') {
        alert(`${res.data.err}\n\n${res.data.msg}`);
      }
      loadData();
    } catch (error) {
      openFetchErrorDialog(error.message);
    }
  };

  const addFilter = async (parameters) => {
    try {
      const url = `http://localhost:9000/api/project/${project}/filter`;
      const data = parameters;
      const res = await axios.post(url, data);
      if (res.data.err === 'undefined') {
        const timelineValue = { ...timeline };
        const track = TimelineModel.findTrack(timelineValue, parameters.track);
        const item = TimelineModel.findItem(track.items, parameters.item);
        item.filters.push({ service: parameters.filter });
        settimeline(timelineValue);
      } else {
        alert(`${res.data.err}\n\n${res.data.msg}`);
      }
    } catch (error) {
      openFetchErrorDialog(error.message);
    }
  };

  const delFilter = async (parameters) => {
    const timelineValue = { ...timeline };
    const track = TimelineModel.findTrack(timelineValue, parameters.track);
    const item = TimelineModel.findItem(track.items, parameters.item);
    item.filters = item.filters.filter(
      (filter) => filter.service !== parameters.filter
    );
    settimeline(timelineValue);
  };

  const openSubmitDialog = () => {
    setShowSubmitDialog(true);
  };

  const closeSubmitDialog = () => {
    setShowSubmitDialog(false);
  };
  const openFetchErrorDialog = (msg) => {
    setShowFetchError(true);
    setFetchError(msg);
  };

  /**
   * Close Connection error dialog
   */
  const closeFetchErrorDialog = () => {
    setShowFetchError(false);
    setFetchError('');
  };

  /**
   * Start fetching processing state
   */
  const startProcessing = () => {
    if (processing === null || processing === 100) {
      setProcessing(0);
    }
    setTimeout(loadData, 5000);
  };

  const play = () => {
    datetimeStart = new Date();
    timerStart = time;
    setPlaying(true);
    timerFunction = setInterval(playingValue, 33);
  };

  const playingValue = () => {
    setPlaying(true);
    setTime(
      new Date(timerStart.getTime() + Date.now() - datetimeStart.getTime())
    );
  };

  const pause = () => {
    clearInterval(timerFunction);
    playingValue();
    setPlaying(false);
  };

  const setTimeValue = (time) => {
    if (timerFunction !== null || playing) {
      clearInterval(timerFunction);
      setPlaying(false);
    }
    setTime(time);
  };
  return (
    <>
      <header>
        {loading && <LoadingDialog />}
        {showSubmitDialog && (
          <SubmitDialog
            project={project}
            onClose={closeSubmitDialog}
            onProcessing={startProcessing}
            fetchError={openFetchErrorDialog}
          />
        )}
        {showFetchError && (
          <FetchErrorDialog msg={fetchError} onClose={closeFetchErrorDialog} />
        )}
        <a href={'/'}>
          <button className='error'>
            <i className='material-icons' aria-hidden='true'>
              arrow_back
            </i>
            Zrušit úpravy
          </button>
        </a>
        <div className='divider' />
        {/*<button><i className="material-icons" aria-hidden="true">language</i>Jazyk</button>*/}
        {/*<button><i className="material-icons" aria-hidden="true">save_alt</i>Exportovat</button>*/}
        <SubmitToolbar
          openSubmitDialog={openSubmitDialog}
          progress={processing}
          project={project}
        />
      </header>
      <main>
        <div>
          <Sources
            project={project}
            items={resources}
            onAddResource={addResource}
            onDelResource={delResource}
            onPutResource={putResource}
            fetchError={openFetchErrorDialog}
          />
          <Preview
            items={timeline}
            time={time}
            playing={playing}
            pause={pause}
            play={play}
            setTime={setTimeValue}
          />
        </div>
      </main>
      <footer>
        <Timeline
          resources={resources}
          items={timeline}
          project={project}
          onAddFilter={addFilter}
          onDelFilter={delFilter}
          loadData={loadData}
          fetchError={openFetchErrorDialog}
          time={time}
          setTime={setTimeValue}
        />
      </footer>
    </>
  );
}
