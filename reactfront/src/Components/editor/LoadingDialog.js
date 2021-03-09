/**
 * @file LoadingDialog.js
 * @author Vladan Kudlac <vladankudlac@gmail.com>
 */

import React from 'react';
import Modal from 'react-modal';

Modal.setAppElement(document.body);

export default function LoadingDialog() {
  return (
    <div>
      <Modal
        isOpen={true}
        contentLabel='Loading'
        className={'modal'}
        overlayClassName={'overlay'}
      >
        <h2>Loading Video Editor</h2>
        <div>
          <div className='loader' />
        </div>
      </Modal>
    </div>
  );
}
