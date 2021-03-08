exports.isNaturalNumber = (str) => {
  let pattern = /^(0|([1-9]\d*))$/;
  return pattern.test(str);
};

exports.isset = (...variables) => {
  for (let variable of variables) {
    if (typeof variable === 'undefined') return false;
  }
  return true;
};
