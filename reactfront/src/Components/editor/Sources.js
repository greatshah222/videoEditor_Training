import React from 'react';
import axios from 'axios';
import { isVaidDuration } from '../utils/TImeManager';
import SourcesTableRow from './SourcesTableRow';
import Uploader from './Uploader';

export default function Sources(props) {
  const delResource = async (id) => {
    try {
      const url = `http://localhost:9000/api/project/${props.project}/file/${id}`;

      const res = await axios.delete(url);
      if (res.data.err !== 'undefined') {
        props.onDelResource(id);
      } else {
        alert(`${res.data.err}\n\n${res.data.msg}`);
      }
    } catch (error) {
      props.fetchError(error.message);
    }
  };

  const putResource = async (id) => {
    try {
      let duration = null;
      if (new RegExp(/^image\//).test(props.items[id].mime)) {
        duration = prompt('Zadejte délku trvání', '00:00:00,000');
        if (duration === null) return;

        if (!isVaidDuration(duration)) {
          alert('Zadejte nenulovou délku ve formátu HH:MM:SS,sss');
          putResource(id);
          return;
        }
      }
      const track = props.items[id].mime.includes('audio/')
        ? 'audiotrack0'
        : 'videotrack0';
      const url = `http://localhost:9000/api/project/${props.project}/file/${id}`;
      const data = {
        track,
        duration,
      };

      const res = await axios.put(url, data);
      if (res.data.err !== 'undefined') {
        props.onPutResource(id, duration, track);
      } else {
        alert(`${res.data.err}\n\n${res.data.msg}`);
      }
    } catch (error) {
      props.fetchError(error.message);
    }
  };
  return (
    <div id={'sources'}>
      <h3>
        <i className='material-icons' aria-hidden='true'>
          video_library
        </i>
        Seznam záběrů
      </h3>
      <table>
        <tbody>
          {Object.keys(props.items).map((key) => (
            <SourcesTableRow
              key={key}
              item={props.items[key]}
              onRemove={delResource}
              onInsert={putResource}
            />
          ))}
          <tr>
            <td colSpan='3'>
              <Uploader
                onAdd={(resource) => props.onAddResource(resource)}
                project={props.project}
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
