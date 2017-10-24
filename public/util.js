function caps(s) {
   return s.charAt(0).toLocaleUpperCase() + s.substr(1).toLocaleLowerCase();
}

function randomChoice(arr) {
   let idx = Math.floor(Math.random() * arr.length);
   return arr[idx];
}