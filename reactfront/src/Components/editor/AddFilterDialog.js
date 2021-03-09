import axios from 'axios';
import React, { useState } from 'react';
import Modal from 'react-modal';
import Filters from '../filters/Filters';
import { isVaidDuration } from '../utils/TImeManager';

Modal.setAppElement(document.body);

export default function AddFilterDialog(props) {
  const [filter, setfilter] = useState(Filters.videoFilters[0].id);
  const [level, setlevel] = useState(100);

  const handleFilterChange = (e) => {
    setfilter(e.target.value);
  };
  const handleLevelChange = (e) => {
    setlevel(e.target.value);
  };
  const handleCloseDialog = () => {
    setfilter(Filters.videoFilters[0].id);
    setlevel(100);
    props.onClose();
  };
  const getFilter = (id) => {
    for (let filter of Filters.videoFilters) {
      if (filter.id === id) {
        return filter;
      }
    }
    for (let filter of Filters.audioFilters) {
      if (filter.id === id) {
        return filter;
      }
    }
    return null;
  };
  const handleAddFilter = (e) => {
    e.preventDefault();
    let filterValue = getFilter(filter);
    // to do check duration with backend
    // if(filterValue.in[0].id ==='duration' &&)
    if (filterValue.in[0].id === 'duration' && isVaidDuration(level)) {
      alert('Duration must be nonzero, in 00: 00: 00,000 format');
      return;
    }

    let newFilter = {
      filterValue: filter,
      params: {},
    };

    const input = {};

    const item = props.getItem(props.item).item;
    const itemPath = props.item.split(':');
    newFilter.track = itemPath[0];
    newFilter.item = Number(itemPath[1]);

    for (let output of filterValue.out) {
      input[filterValue.in[0].id] = level;
      newFilter.params[output.id] = output.value(input, item);
    }
    props.onAdd(newFilter);
  };
  const handleDelFilter = async (filterId) => {
    const itemPath = props.item.split(':');
    const url = `http://localhost:9000/api/project/${props.project}/filter`;
    const data = {
      track: itemPath[0],
      item: Number(itemPath[1]),
      filter: filterId,
    };
    try {
      const res = await axios.delete(url, data);
      if (res.err === 'undefined') {
        props.onDel(data);
      } else {
        alert(`${res.data.err} \n\n ${res.data.msg}`);
      }
    } catch (error) {
      props.fetchError(error.message);
    }
  };
  const item = props.getItem(props.item);
  return (
    <Modal
      isOpen={true}
      contentLabel={'Add a New Filter'}
      className={'overlay'}
      onRequestClose={handleCloseDialog}
    >
      <h2>FILTER</h2>
      <div>
        <table>
          <tbody>
            {item.filters.length === 0 && (
              <tr>
                <td>No Filter</td>
              </tr>
            )}
            {item.filters.map((el) => (
              <tr key={el.service}>
                <td>{getFilter(el.service).title}</td>
                <td>
                  <button onClick={() => handleDelFilter(el.service)}>
                    <i className='material-icons' aria-hidden='true'>
                      Delete
                    </i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3>Add New Filter</h3>
      <div>
        <form onSubmit={handleAddFilter}>
          <label htmlFor={'filter'}>Filtr: </label>
          <select name={'filter'} onChange={handleFilterChange}>
            {Filters.videoFilters.map((filter) => (
              <option value={filter.id} key={filter.id}>
                {filter.title}
              </option>
            ))}
            {Filters.audioFilters.map((filter) => (
              <option value={filter.id} key={filter.id}>
                {filter.title}
              </option>
            ))}
          </select>
          <br />
          {getFilter(filter).in[0].id === 'level' && (
            <>
              <label htmlFor={'level'}>Level </label>
              <input
                type={'range'}
                name={'level'}
                min={0}
                max={200}
                defaultValue={100}
                onChange={handleLevelChange}
              />
              <span> {level} %</span>
            </>
          )}
          {getFilter(filter).in[0].id === 'duration' && (
            <>
              <label htmlFor={'duration'}>Duration</label>
              <input
                type={'text'}
                name={'duration'}
                defaultValue={'00:00:00,000'}
                required={true}
                pattern={'^\\d{2,}:\\d{2}:\\d{2},\\d{3}$'}
                title={'Duration in Format 00:00:00,000'}
                onChange={handleLevelChange}
              />
            </>
          )}
          <br />
          <input type={'submit'} value={'Add a Filter'} />
          <button onClick={this.handleCloseDialog}>Close</button>
        </form>
      </div>
    </Modal>
  );
}
