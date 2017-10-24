// @flow
function caps(s:string):string {
    return s.charAt(0).toLocaleUpperCase() + s.substr(1).toLocaleLowerCase();
}

function randomChoice(arr:Array<any>):any {
   let idx = Math.floor(Math.random() * arr.length);
   return arr[idx];
}