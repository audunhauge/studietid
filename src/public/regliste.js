// @flow

declare function caps(s: string): string;

declare function generateRegistrationCode(teach: string, room: string,
    count: number, start: string, duration: number): any;

declare var firebase: {
    app: () => any,
    auth: () => any,
    database: () => any
};

function setup() {
    let divSpinner: any = document.querySelector("div.spinner");
    let divRoom: any = document.querySelector("div.romvalg");
    let divMelding: any = document.querySelector("div.melding");
    let divHeader: any = document.querySelector("div.header");
    let divExpand: any = document.querySelector("#expand");
    let divManual: any = document.querySelector("#manual");
    let divCriteria: any = document.querySelector("#criteria");
    let divMatch: any = document.querySelector("#match");


    let database = firebase.database();
    let trueName, rooms, room;

    let now = new Date();
    let datestr = now.toJSON().substr(0, 10).replace(/-/g, '');

    let studList; // enr:{fn,en,klasse,kontakt}
    let teachList;  // kortnavn:{fn,en}
    let kontakter; // alle kontaktlerare kortnavn:[enr1,enr2 ...]
    let klasser; // alle klasser 2sta:[e1,e2, ...]
    let registrerte; // liste over registrerte elever på valgt rom
    let teacher; // bruker av scriptet
    let uid; // brukers id


    function initApp() {
        firebase
            .auth()
            .getRedirectResult()
            .then(function (result) {
                if (result.credential) {
                    var token = result.credential.accessToken;
                }
                var user = result.user;
            })
            .catch(function (error) {
                var errorCode = error.code;
                var errorMessage = error.message;
                var email = error.email;
                var credential = error.credential;
                if (errorCode === "auth/account-exists-with-different-credential") {
                    alert(
                        "You have already signed up with a different auth provider for that email."
                    );
                } else {
                    console.error(error);
                }
            });


        /**
         * Preload stud and teach from firebase
         * Use localstorage if exists
         */
        function getStudsAndTeachers() {
            let JSONteach = localStorage.getItem("teach");
            if (JSONteach) {
                teachList = JSON.parse(JSONteach);
            } else {
                let ref = database.ref("teach/");
                ref.once("value").then(function (snapshot) {
                    teachList = snapshot.val();
                    localStorage.setItem("teach", JSON.stringify(teachList));
                });
            }
            let JSONstud = localStorage.getItem("stud");
            if (JSONstud) {
                studList = JSON.parse(JSONstud);
            } else {
                let ref = database.ref("stud/");
                ref.once("value").then(function (snapshot) {
                    studList = snapshot.val();
                    localStorage.setItem("stud", JSON.stringify(studList));
                });
            }

        }


        function knownUser(id: number) {
            divSpinner.classList.add("hidden");
            let ref = database.ref("teach/" + id);
            ref.once("value").then(function (snapshot) {
                teacher = snapshot.val();
                if (teacher) {
                    // valid one time code
                    let teach = id;
                    trueName = caps(teacher.fn) + caps(teacher.ln);

                    velgRom();
                }
            });
        }

        function velgRom() {
            divRoom.classList.remove("hidden");
            divRoom.querySelector("h4").innerHTML = trueName;
            divRoom.querySelector("input").focus();
            let ref = database.ref("rooms");
            ref.once("value").then(function (snapshot) {
                rooms = snapshot.val();
                let list = Object.keys(rooms)
                    .map(e => `<option value="${e.toUpperCase()}">`)
                    .join("");
                divRoom.querySelector("datalist").innerHTML = list;
            });
            divRoom.querySelector("input").addEventListener("keyup", valgtRom);
        }

        function valgtRom(e: KeyboardEvent) {
            let myroom = divRoom.querySelector("input").value.toLowerCase();
            if (e.keyCode === 13 && rooms[myroom]) {
                // valid room
                room = myroom;   // outer scope
                divRoom.classList.add("hidden");
                visListe(room);
            }
        }

        function visListe(room: string) {
            let path = ['roomreg', room, datestr].join("/");
            let ref = database.ref(path);
            divMelding.classList.remove("hidden");
            ref.once("value").then(function (snapshot) {
                let list = snapshot.val();
                registrerte = [];
                if (list) {
                    let regs = [];
                    for (let aa in list) {
                        let bb = list[aa];
                        for (let cc in bb) {
                            let dd = bb[cc];
                            for (let uid in dd) {
                                regs.push([uid, dd[uid]]);
                            }
                        }
                    }
                    let userlist = regs.map(e => {
                        let teach = { fn: "n", ln: "nn" };
                        let [stuid, tid] = e;
                        if (teachList[tid]) {
                            teach = teachList[tid];
                        }
                        let stud = { fn: "n", ln: "nn" };
                        if (studList[stuid]) {
                            stud = studList[stuid];
                            registrerte.push(stuid);     // we need this to check if stud already registered
                        }
                        return (` <li><input type="checkbox" id="s${stuid}">${caps(stud.fn)} ${caps(stud.ln)}</li>`);
                    })
                    divHeader.innerHTML = room.toUpperCase();
                    divMelding.innerHTML = '<ol class="studlist">' + userlist.join("") + '</ol>';
                } else {
                    divMelding.innerHTML =
                        `<h4>${room}</h4>` +
                        "ingen registrert"; generateRegistrationCode
                }
            });
            divExpand.addEventListener("click", expandView);
        }

        function expandView() {
            divManual.classList.remove("hidden");
            if (!kontakter) {
                kontakter = {};
                klasser = {};
                studList.forEach((elev, i) => {
                    if (elev) {
                        let { fn, ln, kontakt, klasse } = elev;
                        if (!kontakter[kontakt]) {
                            kontakter[kontakt] = [];
                        }
                        kontakter[kontakt].push(i);
                        if (!klasser[klasse]) {
                            klasser[klasse] = [];
                        }
                        klasser[klasse].push(i);
                    }

                });
            }
            let list = Object.keys(klasser)
                .map(e => `<option value="${e}">`).join("");
            divCriteria.querySelector("datalist").innerHTML = list;

            let criteria = Array.from(divCriteria.querySelectorAll("input"));
            criteria.forEach(e => e.addEventListener("keyup", getNames));

            function getNames(e) {
                let [klasse, fn, ln] = criteria.map(e => e.value);
                let studCopy = studList.slice();
                studCopy.forEach((s, i) => { if (s) s.enr = i });
                let afterKlasse = klasse ? studCopy.filter(s => s && s.klasse.includes(klasse)) : studCopy;
                let afterFirst = fn ? afterKlasse.filter(s => s && s.fn.includes(fn)) : afterKlasse;
                let afterLast = ln ? afterFirst.filter(s => s && s.ln.includes(ln)) : afterFirst;
                let antall = afterLast.length;
                if (antall < 35) {
                    afterLast.sort((a, b) => {
                        if (a.klasse === b.klasse) {
                            if (a.ln === b.ln) {
                                return a.fn.localeCompare(b.fn)
                            } else {
                                return a.ln.localeCompare(b.ln)
                            }
                        } else {
                            return a.klasse.localeCompare(b.klasse)
                        }
                    });
                    divMatch.innerHTML = afterLast.map((s) => {
                        return `<div>
                            <span>${caps(s.fn)} ${caps(s.ln)}</span>
                            <span>${s.klasse.toUpperCase()}</span><span>${s.kontakt.toUpperCase()}</span>
                            <input type="checkbox" id="nu${s.enr}">
                            </div>`;
                    }).join("") +
                        '<br><button id="reg" type="button">Registrer</button><button id="merk" type="button">Marker Alle</button>';

                    divMatch.querySelector("#reg").addEventListener("click", registererNye);
                    divMatch.querySelector("#merk").addEventListener("click", velgAlle);

                    async function registererNye() {
                        let nyeElever = Array.from(divMatch.querySelectorAll("input:checked")).map(e => e.id.substr(2));
                        let missing = nyeElever.filter(e => !registrerte.includes(e));
                        console.log(missing);
                        let antall = missing.length;
                        let [kode, key] = await generateRegistrationCode(uid, room, antall, "12:00", 90);
                        console.log(key);
                        missing.forEach((enr,i) => {
                            // need: room kode datestr enr
                            let student = studList[enr];
                            let slot = ("000" + (i+1)).substr(-3);
                            let path = ['roomreg', room, datestr, kode, slot, enr].join("/");
                            let ref = database.ref(path);
                            ref.set(uid).then(() => {
                            }).catch(err => {
                                // opptatt
                            }); 

                            // store with inverted keys for quick access
                            let kontakt = student.kontakt;
                            path = ['kontaktreg', kontakt, datestr, enr].join("/");
                            ref = database.ref(path);
                            ref.set(`${uid},${room}`).catch(err => {
                                // ignoring error - can be rebuilt from roomreg
                            });
                            path = ['studreg', enr, datestr].join("/");
                            ref = database.ref(path);
                            ref.set(`${uid},${room}`).catch(err => {
                                // ignoring error - can be rebuilt from roomreg
                            });
                            path = ['registrert', datestr, enr, kode].join("/");
                            ref = database.ref(path);
                            ref.set(`${uid},${room}`).catch(err => {
                                // ignoring error - can be rebuilt from roomreg
                            });
                        });
                        // */

                    }

                    function velgAlle() {
                        divMatch.querySelectorAll("input").forEach(e => e.checked = !e.checked);
                    }



                } else {
                    divMatch.innerHTML = "Treff for " + antall + " elever";
                }
            }

        }



        firebase.auth().onAuthStateChanged(function (user) {
            if (user) {
                // User is signed in.
                let email = user.email;
                let emailVerified = user.emailVerified;
                let photoURL = user.photoURL;
                let isAnonymous = user.isAnonymous;
                let providerData = user.providerData;

                // created in enclosing scope
                let displayName = user.displayName;
                let userid = user.uid;

                getStudsAndTeachers();   // preload data

                let ref = database.ref("teachid/" + userid);
                ref.once("value").then(function (snapshot) {
                    uid = snapshot.val();
                    // divSpinner.classList.add("hidden");
                    if (uid) {
                        // this is a known user
                        knownUser(uid);
                    }
                });
            } else {
                divSpinner.classList.add("hidden");
                divMelding.innerHTML = "Du må være registrert";
                divMelding.classList.remove("hidden");

            }
        });
    }

    initApp();
}
