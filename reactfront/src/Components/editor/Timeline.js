import React, { useEffect, useState } from 'react';
import { Timeline as Vis } from 'vis-timeline/standalone';
import {
  addDuration,
  middleOfDuration,
  subDuration,
} from '../utils/TImeManager';
import TimelineModel from './TimelineModel';
import axios from 'axios';

export default function Timeline(props) {
  const [selectedItems, setselectedItems] = useState([]);
  const [showAddFilterDialog, setshowAddFilterDialog] = useState(false);
  const [duration, setduration] = useState('00:00:00,000');
  let timeline = null;

  const onSelect = (properties) => {
    setselectedItems(properties.items);
  };
  const buttonFilter = () => {
    if (selectedItems.length === 0) return;
    setshowAddFilterDialog(true);
  };

  const closeAddFilterDialog = () => {
    setshowAddFilterDialog(false);
  };

  const buttonSplit = async () => {
    if (selectedItems.length !== 1) return;
    const item = getItemFromTrackIndex(selectedItems[0]);
    const splitTime = TimelineModel.dateToString(timeline.getCustomTime());
    const splitItemTime = subDuration(splitTime, item.start);
    if (splitTime <= item.start || splitTime >= item.end) return;

    const itemPath = selectedItems[0].split(':');
    const url = `http://localhost:9000/api/project/${props.project}/item/split`;
    const data = {
      track: itemPath[0],
      item: Number(itemPath[1]),
      time: splitItemTime,
    };

    const res = await axios.put(url, data);
    if (typeof res.data.err === 'undefined') {
      props.loadData();
    } else {
      alert(`${res.data.err}\n\n${res.data.msg}`);
    }
  };

  const buttonDel = async () => {
    try {
      if (selectedItems.length !== 1) return;
      const itemPath = selectedItems[0].split(':');
      const url = `http://localhost:9000/api/project/${props.project}/item`;
      const data = {
        track: itemPath[0],
        item: Number(itemPath[1]),
      };
      const res = await axios.delete(url, data);
      if (res.data.err === 'undefined') {
        const track = TimelineModel.findTrack(props.items, itemPath[0]);
        if (
          itemPath[0] !== 'videotrack0' &&
          itemPath[0] !== 'audiotrack0' &&
          TimelineModel.findItem(track.items, 1) === undefined
        ) {
          delTrack(itemPath[0]);
        } else props.loadData();

        setselectedItems({ selectedItems: [] });
      } else {
        alert(`${res.data.err}\n\n${res.data.msg}`);
      }
    } catch (error) {
      props.fetchError(error.message);
    }
  };

  const getItemFromTrackIndex = (trackIndex) => {
    const itemPath = trackIndex.split(':');
    const trackItems = TimelineModel.findTrack(props.items, itemPath[0]).items;
    return TimelineModel.findItem(trackItems, Number(itemPath[1]));
  };
  const onTimeChange = (event) => {
    const timePointer = TimelineModel.dateToString(event.time);

    if (event.time.getFullYear() < 1970) {
      props.setTime(new Date(1970, 0, 1));
    } else if (timePointer > duration) {
      props.setTime(TimelineModel.dateFromString(duration));
    } else {
      props.setTime(event.time);
      timeline.setCustomTimeTitle(timePointer);
    }
  };
  const onMoving = (item, callback) => {
    callback(itemMove(item));
  };
  const onMove = async (item) => {
    try {
      item.className = 'video';
      item = itemMove(item);
      if (item !== null) {
        const itemPath = item.id.split(':');
        const url = `http://localhost:9000/api/project/${props.project}/item/move`;
        const data = {
          track: itemPath[0],
          trackTarget: item.group,
          item: Number(itemPath[1]),
          time: TimelineModel.dateToString(item.start),
        };

        const res = await axios.put(url, data);
        if (res.data.err !== 'undefined') {
          alert(`${res.data.err}\n\n${res.data.msg}`);
        } else {
          if (itemPath[0] === item.group) {
            // Same track
            props.loadData();
          } else {
            // Moving between tracks
            const trackType = item.group.includes('audio') ? 'audio' : 'video';
            const prevTrack = TimelineModel.findTrack(props.items, itemPath[0]);
            const newTrack = TimelineModel.findTrack(props.items, item.group);

            const addTrack = newTrack.items.length === 0; //
            const delTrack =
              TimelineModel.findItem(prevTrack.items, 1) === undefined;

            if (addTrack && delTrack) addTrack(trackType, prevTrack.id);
            else if (addTrack) addTrack(trackType, null);
            else if (delTrack) delTrack(prevTrack.id);
            else props.loadData();
          }
        }
      }
    } catch (error) {
      props.fetchError(error.message);
    }
  };

  const itemMove = (item) => {
    if (item.start.getFullYear() < 1970) return null;
    // Deny move before zero time
    else {
      const itemPath = item.id.split(':');

      if (
        !(
          item.group.includes('videotrack') &&
          itemPath[0].includes('videotrack')
        )
      ) {
        if (
          !(
            item.group.includes('audiotrack') &&
            itemPath[0].includes('audiotrack')
          )
        ) {
          return null;
        }
      }

      item.className = item.className.includes('video') ? 'video' : 'audio';
      const itemIndex = itemPath[0] === item.group ? Number(itemPath[1]) : null;
      const start = TimelineModel.dateToString(item.start);
      const end = TimelineModel.dateToString(item.end);
      const track = TimelineModel.findTrack(props.items, item.group);
      const collision = TimelineModel.getItemInRange(
        track,
        itemIndex,
        start,
        end
      );
      if (collision.length === 0) {
        // Free
        return item;
      } else if (collision.length > 1) {
        // Not enough space
        return null;
      } else {
        // Space maybe available before/after item
        let itemStart = '';
        let itemEnd = '';
        const duration = subDuration(end, start);
        if (
          middleOfDuration(start, end) <
          middleOfDuration(collision[0].start, collision[0].end)
        ) {
          // Put before
          item.className =
            item.className === 'video'
              ? 'video stick-right'
              : 'audio stick-right';
          itemEnd = collision[0].start;
          item.end = TimelineModel.dateFromString(itemEnd);

          itemStart = subDuration(collision[0].start, duration);
          item.start = TimelineModel.dateFromString(itemStart);
          if (item.start === null) return null; // Not enough space at begining of timeline
        } else {
          // Put after
          item.className =
            item.className === 'video'
              ? 'video stick-left'
              : 'audio stick-left';
          itemStart = collision[0].end;
          item.start = TimelineModel.dateFromString(collision[0].end);

          itemEnd = addDuration(collision[0].end, duration);
          item.end = TimelineModel.dateFromString(itemEnd);
        }
        // Check if there is enough space
        const track = TimelineModel.findTrack(props.items, item.group);
        if (
          TimelineModel.getItemInRange(track, itemIndex, itemStart, itemEnd)
            .length === 0
        ) {
          return item;
        }
        return null;
      }
    }
  };

  const addTrack = () => {};

  useEffect(() => {
    const container = document.getElementById('timeline');
    const options = {
      orientation: 'top',
      min: new Date(1970, 0, 1),
      max: new Date(1970, 0, 1, 23, 59, 59, 999),
      showCurrentTime: false,
      multiselect: false,
      multiselectPerGroup: true,
      stack: false,
      zoomMin: 100,
      zoomMax: 21600000,
      editable: {
        updateTime: true,
        updateGroup: true,
      },
      onMove: onMove,
      onMoving: onMoving,
      format: {
        minorLabels: {
          millisecond: 'SSS [ms]',
          second: 's [s]',
          minute: 'HH:mm:ss',
          hour: 'HH:mm:ss',
          weekday: 'HH:mm:ss',
          day: 'HH:mm:ss',
          week: 'HH:mm:ss',
          month: 'HH:mm:ss',
          year: 'HH:mm:ss',
        },
        majorLabels: {
          millisecond: 'HH:mm:ss',
          second: 'HH:mm:ss',
          minute: '',
          hour: '',
          weekday: '',
          day: '',
          week: '',
          month: '',
          year: '',
        },
      },
    };
    timeline = new Vis(container, [], [], options);
    timeline.addCustomTime(new Date(1970, 0, 1));
    timeline.setCustomTimeTitle('00:00:00,000');
    timeline.on('select', onSelect);
    timeline.on('timechange', onTimeChange);
    timeline.on('moving', onMoving);
    timeline.on('move', onMove);

    const time = TimelineModel.dateToString(props.time);
    if (time > duration) {
      props.setTime(TimelineModel.dateFromString(duration));
    } else {
      timeline.setCustomTime(props.time);
      timeline.setCustomTimeTitle(TimelineModel.dateToString(props.time));
    }

    const groups = [];
    const items = [];

    let durationValue = '00:00:00,000';
    const tracks = [...props.items.video, ...props.items.audio];
    const videoMatch = new RegExp(/^videotrack\d+/);
    for (let track of tracks) {
      groups.push({
        id: track.id,
        content: '<div style="width:0;height:66px;"></div>',
      });

      track.items.forEach((item, index) => {
        let content = props.resources[item.resource].name;
        if (item.filters.length > 0)
          content =
            '<div class="filter"></div><i class="filter material-icons">flare</i>' +
            content;
        items.push({
          id: track.id + ':' + index,
          content: content,
          start: TimelineModel.dateFromString(item.start),
          end: TimelineModel.dateFromString(item.end),
          group: track.id,
          className: videoMatch.test(track.id) ? 'video' : 'audio',
        });
      });

      if (track.duration > durationValue) {
        durationValue = track.duration;
      }
    }

    if (duration !== durationValue) setduration(durationValue);

    const fitTimeline = items.length > timeline.itemsData.length;

    timeline.setData({
      items: items,
      groups: groups,
    });

    if (fitTimeline) timeline.fit();
  }, []);
  return <div></div>;
}
