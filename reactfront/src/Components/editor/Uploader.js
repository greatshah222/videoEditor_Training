import React from 'react';
import Dropzone from 'react-dropzone-uploader';

// npm install --save react-dropzone-uploader
// you might have to get the css for this package
//todo

export default function Uploader(props) {
  const getUploadParams = () => {
    return { url: `/api/project/${props.project}/file` };
  };

  const handleChangeStatus = ({ meta, xhr, remove }, status) => {
    if (status === 'done') {
      const response = JSON.parse(xhr.response);
      props.onAdd({
        id: response.resource_id,
        name: meta.name,
        duration: response.length,
        mime: response.resource_mime,
      });
      remove();
    } else if (status === 'aborted') {
      alert(`${meta.name}, upload failed...`);
    }
  };
  return (
    <Dropzone
      getUploadParams={getUploadParams}
      onChangeStatus={handleChangeStatus}
      accept='image/*,audio/*,video/*'
      inputContent={(files, extra) =>
        extra.reject
          ? 'Only video, audio and image files can be recorded.'
          : 'Upload Files'
      }
      inputWithFilesContent={'Upload Files'}
      styles={{
        dropzoneReject: { borderColor: '#7a281b', backgroundColor: '#DAA' },
      }}
    />
  );
}
