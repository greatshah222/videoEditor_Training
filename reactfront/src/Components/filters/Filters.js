import axios from 'axios';

export const calculateSubDuration = async (durationA, durationB) => {
  try {
    const { data } = await axios.post(`http://localhost:9000/api/subDuration`, {
      durationA: durationA,
      durationB: durationB,
    });
    return data;
  } catch (error) {}
};
/* eslint import/no-anonymous-default-export: [2, {"allowObject": true}] */

export default {
  videoFilters: [
    {
      id: 'brightness',
      title: 'Jas',
      in: [
        {
          id: 'level',
          title: 'Úroveň',
          type: 'int',
          value: 100,
          min: 0,
          max: 200,
        },
      ],
      out: [
        {
          id: 'start',
          value: () => 1,
        },
        {
          id: 'level',
          value: (input) => input.level / 100,
        },
      ],
    },
    {
      id: 'lift_gamma_gain',
      title: 'Kontrast',
      in: [
        {
          id: 'level',
          title: 'Úroveň',
          type: 'int',
          value: 100,
          min: 0,
          max: 200,
        },
      ],
      out: [
        {
          id: 'lift_r',
          value: () => 0,
        },
        {
          id: 'lift_g',
          value: () => 0,
        },
        {
          id: 'lift_b',
          value: () => 0,
        },
        {
          id: 'gamma_r',
          value: (input) => 2 - input.level / 100,
        },
        {
          id: 'gamma_g',
          value: (input) => 2 - input.level / 100,
        },
        {
          id: 'gamma_b',
          value: (input) => 2 - input.level / 100,
        },
        {
          id: 'gain_r',
          value: (input) => input.level / 100,
        },
        {
          id: 'gain_g',
          value: (input) => input.level / 100,
        },
        {
          id: 'gain_b',
          value: (input) => input.level / 100,
        },
      ],
    },
    {
      id: 'fadeInBrightness',
      title: 'Roztmívat obraz',
      in: [
        {
          id: 'duration',
          title: 'Doba trvání',
          type: 'duration',
          value: '00:00:00,000',
        },
      ],
      out: [
        {
          id: 'level',
          value: (input) => `00:00:00,000=0;${input.duration}=1`,
        },
        {
          id: 'alpha',
          value: () => 1,
        },
      ],
    },
    {
      id: 'fadeOutBrightness',
      title: 'Zatmívat obraz',
      in: [
        {
          id: 'duration',
          title: 'Doba trvání',
          type: 'duration',
          value: '00:00:00,000',
        },
      ],
      out: [
        {
          id: 'level',
          value: (input, resource) =>
            `${calculateSubDuration(resource.out, input.duration)}=1;${
              resource.out
            }=0`,
        },
        {
          id: 'alpha',
          value: () => 1,
        },
      ],
    },
  ],

  audioFilters: [
    {
      id: 'fadeInVolume',
      title: 'Postupně zesílit zvuk',
      in: [
        {
          id: 'duration',
          title: 'Doba trvání',
          type: 'duration',
          value: '00:00:00,000',
        },
      ],
      out: [
        {
          id: 'level',
          value: (input) => `00:00:00,000=-60;${input.duration}=0`,
        },
      ],
    },
    {
      id: 'fadeOutVolume',
      title: 'Postupně zeslabit zvuk',
      in: [
        {
          id: 'duration',
          title: 'Doba trvání',
          type: 'duration',
          value: '00:00:00,000',
        },
      ],
      out: [
        {
          id: 'level',
          value: (input, resource) =>
            `${calculateSubDuration(resource.out, input.duration)}=0;${
              resource.out
            }=-60`,
        },
      ],
    },
  ],
};
