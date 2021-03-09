import React from 'react';

export default function SubmitToolbar(props) {
  return (
    <div className='right'>
      {props.progress === 100 && (
        <a
          href={'/project/' + props.project + '/output.mp4'}
          target='_blank'
          rel='noreferrer'
        >
          View the resulting Video
        </a>
      )}
      {props.progress !== null && props.progress < 100 ? (
        <div>
          <label htmlFor='progress'>Video Processing: </label>
          {props.progress}%
          <progress id='progress' value={props.progress} max='100' />
          <button disabled>
            <i className='material-icons' aria-hidden='true'>
              done_outline
            </i>
            Complete
          </button>
        </div>
      ) : (
        <button onClick={props.openSubmitDialog} className='success'>
          <i className='material-icons' aria-hidden='true'>
            done_outline
          </i>
          Complete
        </button>
      )}
    </div>
  );
}
