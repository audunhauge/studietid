// @flow
function _cap(s:string):string {
    return s.charAt(0).toLocaleUpperCase() + s.substr(1).toLocaleLowerCase();
}

function caps(s:string):string {
    return s.split(/\s+/).map(e => _cap(e)).join(" ");
}

function randomChoice(arr:Array<any>):any {
   let idx = Math.floor(Math.random() * arr.length);
   return arr[idx];
}