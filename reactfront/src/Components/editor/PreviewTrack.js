import React from 'react';
import TimelineModel from './TimelineModel';

export default function PreviewTrack(props) {
  const currentTimestamp = TimelineModel.dateToString(props.time);
  const items = TimelineModel.getItemInRange(
    props.track,
    null,
    currentTimestamp,
    '23:59:59,999'
  );

  return (
    <p>
      {props.track.id}: {items.length}
    </p>
  );
}
