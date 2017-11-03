function _cap(s) {
    return s.charAt(0).toLocaleUpperCase() + s.substr(1).toLocaleLowerCase();
}

function caps(s) {
    return s.split(/\s+/).map(e => _cap(e)).join(" ");
}

function randomChoice(arr) {
    let idx = Math.floor(Math.random() * arr.length);
    return arr[idx];
}