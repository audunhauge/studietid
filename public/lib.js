

/**
  * Generer registreringskode for studietid.
  * Først slettes eksisterende koder for denne teach
  *   gjentar: lager random kode, sjekker at det ikke er i bruk
  * set(/regkeys/kode) { count,duration,room,start,teach,timestamp }
  *    bruker {".sv": "timestamp"} for å få server sin timestamp
  */
async function generateRegistrationCode(teach, room, count, start, duration) {
    // kill all existing keys owned by this teach
    let database = firebase.database();
    let killref = firebase.database().ref('regkeys');
    let key;
    killref.orderByChild('teach').equalTo(teach).once('value', snapshot => {
        let updates = {};
        snapshot.forEach(child => updates[child.key] = null);
        ref.update(updates);
    });
    // sjekk at idag er oppdatert
    let now = new Date();
    let datestr = now.toJSON().substr(0, 10).replace(/-/g, ''); // yyyymmdd
    let ref = database.ref("idag");
    ref.once("value").then(function (snapshot) {
        let today = snapshot.val();
        if (today !== datestr) {
            let ref = database.ref("idag");
            ref.set(datestr);
        }
    });
    // create a new unique key
    let nukey;
    ref = database.ref("regkeys"); // can read if teacher
    await ref.once("value").then(function (snapshot) {
        let list = snapshot.val() || [];
        let keys = Object.keys(list);
        do {
            let k = Math.floor(Math.random() * 223423 + 1);
            let prime = 233923;
            let residue = k * k % prime;
            nukey = k <= prime / 2 ? residue : prime - residue;
        } while (keys.includes(nukey));

        let timestamp = now.getTime();
        let ref = database.ref("regkeys/" + nukey);
        key = { count, room, duration, start, teach, timestamp };
        ref.set(key);
    });
    return [nukey, key];
}

function datestrParse(e) {
    let year = e.substr(0, 4);
    let month = e.substr(4, 2);
    let day = e.substr(6, 2);
    return { year, month, day };
}

function niceName(stud) {
    return `<span class="first">${ caps(stud.fn) }</span><span class="last">${ caps(stud.ln) }</span>`;
}