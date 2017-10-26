// leser inn en xls fil med elever og lager en json  fil som kan lastes inn i firebase
// BRUK:  node xls2json.js mappeNavn


const excelToJson = require('convert-excel-to-json');
const fs = require('fs');
const stud = {};

let dir = process.argv[2];
fs.readdirSync(dir).forEach(file => xl2j(dir, file));

console.log(JSON.stringify(stud));


function xl2j(dir, file) {
    if (file.match('xls')) {
        const result = excelToJson({
            sourceFile: dir + '/' + file,
            header: { rows: 1 },
            columnToKey: {
                A: 'enr',
                B: 'klasse',
                C: 'navn',
                D: 'kontakt',
            }

        });


        let entries = result[Object.keys(result)[0]];

        for (s of entries) {
            let { enr, klasse, navn, kontakt } = s;
            let [ln, fn] = navn.toLocaleLowerCase().split(',');
            ln = ln.trim();
            fn = fn.trim();
            if (klasse === undefined|| kontakt === undefined) {
                console.error("mangelful",s);
            }
            kontakt = kontakt ? kontakt.toLocaleLowerCase() : '';
            klasse = klasse ? klasse.toLocaleLowerCase() : '';
            stud[enr] = { fn, ln, klasse, kontakt };
        }
    }
}

