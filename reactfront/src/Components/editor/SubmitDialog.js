import React, { useState } from 'react';
import Modal from 'react-modal';
import axios from 'axios';

Modal.setAppElement(document.body);

export default function SubmitDialog(props) {
  const [email, setemail] = useState('');

  const handleCloseDialog = () => {
    setemail('');
    props.onClose();
  };
  const handleEmailChanged = (e) => {
    setemail(e.target.value);
  };
  const handleSumbitDialog = async (e) => {
    try {
      e.preventDefault();
      const url = `http://localhost:9000/api/project/${props.project}`;
      const data = { email: email };
      const res = await axios.put(url, data);
      if (typeof res.data.err === 'undefined') {
        handleCloseDialog();
        props.onProcessing();
      } else {
        alert(`${res.data.err}\n\n${res.data.msg}`);
      }
    } catch (error) {
      props.fetchError(error.message);
    }
  };

  return (
    <Modal
      isOpen={true}
      contentLabel='Dokončení projektu'
      className={'modal'}
      overlayClassName={'overlay'}
      onRequestClose={this.handleCloseDialog}
    >
      <h2>Completion of Project</h2>
      <div>
        <form onSubmit={handleSumbitDialog}>
          <label htmlFor={'email'}>Email Address </label>
          <input
            type={'email'}
            name={'email'}
            required={true}
            size={30}
            value={email}
            onChange={handleEmailChanged}
          />
          <br />
          The processing time of a project depends on its length. <br />
          Enter your email and we will send you a link to the resulting video as
          soon as it is processed.
          <br />
          <input type={'submit'} className={'success'} value={'Start'} />
          <button onClick={handleCloseDialog}>Cancel</button>
        </form>
      </div>
    </Modal>
  );
}
