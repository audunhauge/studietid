// @flow

function caps(s) {
   return s.split(/\s+/).map(s => s.charAt(0).toLocaleUpperCase() 
   + s.substr(1).toLocaleLowerCase() ).join(' ');
}

function randomChoice(arr) {
   let idx = Math.floor(Math.random() * arr.length);
   return arr[idx];
}