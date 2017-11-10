// leser inn en mappe med xlsx filer med rom og lager en json fil som kan lastes inn i firebase
// i eksemplene under har mappen navnet rooms.
// BRUK:  node xls2jsonRom.js rooms > rooms/rom.json    // lager romliste - import rooms
// mappenavn inneholder xls/xlsx filer
// strukturen på hver er:
// 
// EXCEL-FIL
// R206        30        Klasserom


const excelToJson = require('convert-excel-to-json');
const fs = require('fs');
const rooms = {};



let dir = process.argv[2];
fs.readdirSync(dir).forEach(file => xl2j(dir, file));


console.log(JSON.stringify(rooms));



function xl2j(dir, file) {
    if (file.match('xls')) {
        const result = excelToJson({
            sourceFile: dir + '/' + file,

            columnToKey: {
                A: 'room',
                B: 'places',
                C: 'info',
            }

        });


        let entries = result[Object.keys(result)[0]];
        // bare ark1 inneholder data


        for (s of entries) {
            let { room, places, info } = s;
            rooms[room.toLowerCase()] = { places, info };
        }
    }
}

