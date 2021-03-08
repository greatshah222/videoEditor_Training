import React, { useState } from 'react';
import Modal from 'react-modal';
import FetchErrorDialog from '../editor/FetchErrorDialog';
import axios from 'axios';

Modal.setAppElement(document.body);

export default function NewProjectDialog() {
  const [showFetchError, setshowFetchError] = useState(false);
  const [fetchError, setfetchError] = useState('');

  const createProject = async () => {
    try {
      const url = `http://localhost:9000/project`;
      const res = await axios.post(url);
      console.log(res);
    } catch (error) {
      console.log(error);
      openFetchErrorDialog(error);
    }
  };

  const closeFetchErrorDialog = () => {
    setshowFetchError(false);
    setfetchError('');
  };
  const openFetchErrorDialog = (msg) => {
    setshowFetchError(true);
    setfetchError(msg);
  };
  return (
    <>
      {showFetchError && (
        <FetchErrorDialog msg={fetchError} onClose={closeFetchErrorDialog} />
      )}
      <Modal
        isOpen={true}
        contentLabel='New Project'
        className={'modal'}
        overlayClassName={'null'}
      >
        <h2>Video Editor</h2>
        <button onClick={() => createProject()}>Create New Project</button>
      </Modal>
    </>
  );
}
