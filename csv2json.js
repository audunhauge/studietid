// leser inn en csv fil med elever og lager en json  fil som kan lastes inn i firebase


fs = require('fs');
let file = process.argv[2];
fs.readFile(file, 'utf8', function (err, data) {
    if (err) throw err;
    let lines = data.split('\n');
    let i = 1;  // hopp over første linje
    let l = lines.length - 1;
    let stud = {};
    while (i < l) {
        let line = lines[i].toLocaleLowerCase().replace(/, /g,',');
        let [enr,klasse,navn,kontakt,knavn] = line.split(';');
        let [fn,ln] = navn.split(',');
        stud[enr] = {klasse,fn,ln,kontakt};
        i++;
    }
    console.log(JSON.stringify(stud));




});

