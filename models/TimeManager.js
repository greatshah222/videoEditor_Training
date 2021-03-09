// here the given regex matches any digit(d means digit)
// \d{2,} means any digit which has more than 2 or equal to 2 words
// \d{2}) means any digit upto 2 digit long
// ^ means match the beginning of the line
// $ means match the end line

const regexExpressionCheck = (durationA, durationB) => {
  console.log(durationA);
  let durA = durationA.match(/^(\d{2,}):(\d{2}):(\d{2}),(\d{3})$/);
  let durB = durationB.match(/^(\d{2,}):(\d{2}):(\d{2}),(\d{3})$/);

  durA = durA.map((el) => el * 1);
  durB = durB.map((el) => el * 1);
  return { durA, durB };
};

const formatTime = (time) => {
  let formattedTime = `${time[0]}:`;
  if (formattedTime.length < 3) formattedTime = '0' + formattedTime;

  formattedTime += `00${time[1]}:`.slice(-3);

  formattedTime += `00${time[2]},`.slice(-3);

  time[3] = time[3].toString().slice(0, 3);
  while (time[3].length < 3) time[3] = '0' + time[3];
  formattedTime += time[3];

  return formattedTime;
};
exports.subDuration = (durationA, durationB) => {
  let { durA, durB } = regexExpressionCheck(durationA, durationB);

  let time = [];
  let formattedTime;

  // milliseconds (if precedding millisecond is greater than we add 1 to second in durA)
  if (durA[4] < durB[4]) {
    durA[4] += 1000;
    durB[3]++;
  }

  // seconds
  if (durA[3] < durB[3]) {
    durA[3] += 60;
    durB[2]++;
  }

  // minutes
  if (durA[2] < durB[2]) {
    durA[2] += 60;
    durB[1]++;
  }

  // hours included
  time = [
    durA[1] - durB[1],
    durA[2] - durB[2],
    durA[3] - durB[3],
    durA[4] - durB[4],
  ];

  formattedTime = formatTime(time);

  return formattedTime;
};
exports.addDuration = (durationA, durationB) => {
  let { durA, durB } = regexExpressionCheck(durationA, durationB);

  let time = [];
  let formattedTime;
  // hours included

  time = [
    durA[1] + durB[1],
    durB[2] + durA[2],
    durB[3] + durA[3],
    durB[4] + durA[4],
  ];

  // millisecond
  if (durB[4] + durA[4] >= 1000) {
    time[4] -= 1000;
    durB[3]++;
  }
  // seconds
  if (durB[3] + durA[3] >= 60) {
    time[3] -= 60;
    durB[2]++;
  }
  // minutes
  if (durB[2] + durA[2] >= 60) {
    time[2] -= 60;
    durB[1]++;
  }

  formattedTime = formatTime(time);

  return formattedTime;
};

exports.isVaidDuration = (text) => {
  const regexpFormat = new RegExp(/^\d{2,}:\d{2}:\d{2},\d{3}$/);
  const regexpZero = new RegExp(/^0{2,}:00:00,000$/);
  return regexpFormat.test(text) && !regexpZero.test(text);
};

// console.log(this.addDuration('12:12:12,334', '12:12:12,334'));

exports.middleOfDuration = (start, end) => {
  const duration = this.subDuration(end, start);
  let parsedDuration = duration.match(/^(\d{2,}):(\d{2}):(\d{2}),(\d{3})$/);
  parsedDuration = parsedDuration.map((el) => el * 1);

  let hour = parsedDuration[1];
  let minute = parsedDuration[2];
  let second = parsedDuration[3];
  let millisecond = parsedDuration[4];

  if (hour % 2 === 0) {
    hour /= 2;
  } else {
    hour = (hour - 1) / 2;
    minute += 30;
  }

  if (minute % 2 === 0) {
    minute /= 2;
  } else {
    minute = (minute - 1) / 2;
    second += 30;
  }

  if (second % 2 === 0) {
    second /= 2;
  } else {
    second = (second - 1) / 2;
    millisecond += 500;
  }

  if (millisecond % 2 === 0) {
    millisecond /= 2;
  } else {
    millisecond = (millisecond - 1) / 2;
  }

  let midDuration = `${hour}:`;
  if (midDuration.length < 3) midDuration = '0' + midDuration;

  midDuration += `00${minute}:`.slice(-3);
  midDuration += `00${second},`.slice(-3);

  millisecond = millisecond.toString().slice(0, 3);
  while (millisecond.length < 3) millisecond = '0' + millisecond;
  midDuration += millisecond;

  return this.addDuration(start, midDuration);
};

// console.log(this.middleOfDuration('12:12:12,123', '13:13:13,487'));
