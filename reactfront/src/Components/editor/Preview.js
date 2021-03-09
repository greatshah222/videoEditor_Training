import React from 'react';
import PreviewTrack from './PreviewTrack';

export default function Preview(props) {
  const stop = () => {
    props.setTime(new Date(1970, 0, 1));
  };
  return (
    <div id='preview'>
      <h3>
        <i className='material-icons' aria-hidden={true}>
          {' '}
          movie_filter{' '}
        </i>
        Preview
      </h3>
      {typeof props.items.video !== 'undefined' &&
        Object.keys(props.items.video).map((key) => (
          <PreviewTrack
            track={props.items.video[key]}
            key={props.items.video[key]['id']}
            time={props.time}
            playing={props.playing}
          />
        ))}
      <br />
      <div className='prev-toolbar'>
        <button onClick={stop} className='no-border' title='Stop playback'>
          <i className='material-icons' aria-hidden='true'>
            stop
          </i>
        </button>
        {props.playing ? (
          <button onClick={props.pause} title='Pause Playback'>
            <i className='material-icons' aria-hidden='true'>
              pause
            </i>
          </button>
        ) : (
          <button onClick={props.play} title='Continue playing'>
            <i className='material-icons' aria-hidden='true'>
              play_arrow
            </i>
          </button>
        )}
        <button disabled title='Previous Event'>
          <i className='material-icons' aria-hidden='true'>
            skip_previous
          </i>
        </button>
        <button disabled title='The following event'>
          <i className='material-icons' aria-hidden='true'>
            skip_next
          </i>
        </button>
      </div>
    </div>
  );
}
