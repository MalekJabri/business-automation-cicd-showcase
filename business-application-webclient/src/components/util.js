
export function loadFromLocalStorage(key, parseJson = false) {
    console.debug('loading ' + key + ' from Browser\'s local storage...');
    const rawObj = localStorage.getItem(key);
    const strObj = JSON.parse(rawObj);
    if (rawObj) {
      console.log(key + ' loaded!');
      console.debug(strObj);
    }
    else {
      console.info(key + ' not found in the Browser\'s local storage!');
    }

    console.debug('return JSON parsed? ' + parseJson)
    return parseJson ? strObj : rawObj;
}

// export function stringifyValue(rawValue) {
//   let str = '';

//   return str;
// }

export default { loadFromLocalStorage }