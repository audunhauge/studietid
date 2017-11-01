// leser inn en mappe med xlsx filer med lerare og lager en json fil som kan lastes inn i firebase
// BRUK:  node xls2jsonTeach.js teach  // lager json fil som importeres til teach i firebase
// BRUK:  node xls2jsonTeach.js teach -otp > elever/otpelever.json   // lager one time pwd for teach
//        importeres til onetimeTeach
// mappenavn inneholder xls/xlsx filer
// strukturen på hver er:
// rad 1 er overskrifter (ignoreres)
// EXCEL-FIL
// kortnavn  navn
// haau      hauge, audun


const excelToJson = require('convert-excel-to-json');
const fs = require('fs');
const teach = {};
const otp = {};

let dir = process.argv[2];
let dotp = process.argv[3];
fs.readdirSync(dir).forEach(file => xl2j(dir, file));

if (dotp === '-otp') {
    console.log(JSON.stringify(otp));
} else {
    console.log(JSON.stringify(teach));
}

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
                A: 'kortnavn',
                B: 'navn'
            }

        });


        let entries = result[Object.keys(result)[0]];
        // bare ark1 inneholder data

        let i = 1234567;

        for (s of entries) {
            let { kortnavn, navn } = s;
            let [ln, fn] = navn.toLocaleLowerCase().split(',');
            ln = ln.trim();
            fn = fn.trim();
            kortnavn = kortnavn ? kortnavn.toLocaleLowerCase() : '';
            teach[kortnavn] = { fn, ln };
            let opwd = makeOtp(i);
            let pwdstr = ("0000000000" + opwd).substr(-12);
            otp[pwdstr] = kortnavn;
            i+=100+ Math.floor(1000*Math.random());
        }
    }
}

