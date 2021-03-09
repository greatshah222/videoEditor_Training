import React from 'react';

export default function SourcesTableRow(props) {
  return (
    <tr>
      <td>
        <div>
          <i className='material-icons resource-preview' aria-hidden='true'>
            panorama
          </i>
        </div>
      </td>
      <td>
        {props.item.name}
        <br />
        {props.item.duration !== null && (
          <small>Length: {props.item.duration}</small>
        )}
      </td>
      <td className='column-right'>
        <button onClick={() => props.onInsert(props.item.id)}>
          <i className='material-icons' aria-hidden='true'>
            control_point
          </i>
        </button>
        <button onClick={() => props.onRemove(props.item.id)}>
          <i className='material-icons' aria-hidden='true'>
            delete
          </i>
        </button>
      </td>
    </tr>
  );
}
