import React from 'react';
import Modal from 'react-modal';

Modal.setAppElement(document.body);

export default function FetchErrorDialog({ msg, onClose }) {
  return (
    <Modal
      isOpen={true}
      contentLabel='Error communicating with server'
      className={'modal'}
      overlayClassName={'overlay'}
    >
      <h2 className={'error'}>Error communicating with server</h2>
      <div>
        <i>{msg}</i>
        <p>Please try again or refresh the page in your browser.</p>
        <button onClick={() => onClose()}>Close</button>
      </div>
    </Modal>
  );
}
