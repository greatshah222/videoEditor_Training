const { exec } = require('child_process');

// exec will buffer the whole data in the memory that is why we have to use promise

// exec might not be safe from the security concerned
// if the file is neither video nor audio it will return null
export default {
  getDuration(filepath, mimeType) {
    if (
      new RegExp(/^video\//).test(mimeType) ||
      new RegExp(/^audio\//).test(mimeType)
    ) {
      const executeGetDuration = async () => {



        try {
            const {stdout,stderr}= await exec(`ffmpeg -i ${filepath} 2>&1 | grep Duration | cut -d ' ' -f 4 | sed s/,// | sed s/\\\\./,/`);
            if(stdout){
                let duration= stdout.trim()
                if (duration !== '') duration += '0';
                return duration
            } else {
                return null
            }
            
        } catch (error) {
            console.log(error)
            return null
            
        }

       
      
          

      };
        await  executeGetDuration();
    } else return null;
  },
};
