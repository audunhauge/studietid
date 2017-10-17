// @flow
function caps(s:string):string {
    return s.charAt(0).toLocaleUpperCase() + s.substr(1).toLocaleLowerCase();
}