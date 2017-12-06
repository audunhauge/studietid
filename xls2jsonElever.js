// @flow
// leser inn en mappe med xlsx filer med elever og lager en json fil som kan lastes inn i firebase
// i eksemplene under har mappen navnet elever.
// BRUK:  node xls2jsonElever.js elever > elever/elever.json    // lager elevregister - import stud
// BRUK:  node xls2jsonElever.js elever -otp > elever/otpelever.json   // lager one time pwd for elever - import onetimeStud
// BRUK:  node xls2jsonElever.js elever -pwd > elever/passordliste.json    // klasseliste med passord (til utdeling)
//        importeres til klassevisOTP
// mappenavn inneholder xls/xlsx filer
// strukturen på hver er:
// rad 1 er overskrifter (ignoreres)
// EXCEL-FIL
// enr   klasse   navn          kontakt
// 123   1STA     olsen, ole    huro

const STARTVERDI = 1234324;
// Denne må endres for hver gang det skal lages et nytt sett med koder.
// Den må ha samme verdi når elever.json,otpelever.jsojn og passordliste.json lages
// slik at det blir det samme passordet for hver elev i de tre filene.

const excelToJson = require('convert-excel-to-json');
const fs = require('fs');
const stud = {};
const otp = {};
const pwd = {};


let dir = process.argv[2];
let dotp = process.argv[3];
fs.readdirSync(dir).forEach(file => xl2j(dir, file));

if (dotp === '-otp') {
    console.log(JSON.stringify(otp));
} else if (dotp === '-pwd') {
    console.log(JSON.stringify(pwd));
} else {
    console.log(JSON.stringify(stud));
}

// bruker quadratic residues til å lage en sekvens med tall
// hvor neste verdi ikke er lett å gjette
// (gitt at black-hat ikke kan se denne funksjonen)
function makeOtp(k) {
    let prime = 685420678114303;
    let residue = k * k % prime;
    nukey = (k <= prime / 2) ? residue : prime - residue;
    return nukey;
}



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
        // bare ark1 inneholder data

        let i = STARTVERDI;
        // samme startverdi gir samme sekvens med otp
        // nødvendig da vi skriver ut to forskjellige filer
        // endre denne verdien for å få andre sekvenser

        for (s of entries) {
            let { enr, klasse, navn, kontakt } = s;
            let [ln, fn] = navn.toLocaleLowerCase().split(',');
            ln = ln.trim();
            fn = fn.trim();
            if (klasse === undefined || kontakt === undefined) {
                console.error("mangelful", s);
                // 2017 - 1 elev mangler kontaktlærer
            }
            kontakt = kontakt ? kontakt.toLocaleLowerCase() : '';
            klasse = klasse ? klasse.toLocaleLowerCase() : '';
            stud[enr] = { fn, ln, klasse, kontakt };
            let opwd, pwdstr;
            do {
                opwd = makeOtp(i);
                pwdstr = ("0000000000" + opwd).substr(-10);
                i += 100 ;
            } while (otp[pwdstr]);
            otp[pwdstr] = String(enr);
            if (!pwd[klasse]) {
                pwd[klasse] = {};
            }
            pwd[klasse][navn] = pwdstr;
        }
    }
}

