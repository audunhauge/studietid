

function setup() {
    let divSpinner = document.querySelector("div.spinner");
    let divDatelist = document.querySelector("#datelist");
    let divMelding = document.querySelector("div.melding");
    let divHeader = document.querySelector("div.header");
    let divExpand = document.querySelector("#expand");
    let divManual = document.querySelector("#manual");
    let divCriteria = document.querySelector("#criteria");
    let divMatch = document.querySelector("#match");
    let divMain = document.querySelector("#main");
    let divBox = document.querySelector("#box");
    let divBadges = document.querySelector("div.badges");

    let database = firebase.database();
    let trueName, rooms, room;

    let now = new Date();
    let datestr = now.toJSON().substr(0, 10).replace(/-/g, '');

    let studList; // enr:{fn,en,klasse,kontakt}
    let teachList; // kortnavn:{fn,en}
    let kontakter; // alle kontaktlerare kortnavn:[enr1,enr2 ...]
    let klasser; // alle klasser 2sta:[e1,e2, ...]
    let registrerte; // liste over registrerte elever på valgt rom
    let teacher; // bruker av scriptet
    let uid; // brukers id

    divBadges.querySelectorAll("div.badge").forEach(e => e.addEventListener("click", gotoApp));

    function gotoApp(e) {
        let t = e.target.dataset.url;
        window.location = t + ".html";
    }

    function initApp() {
        firebase.auth().getRedirectResult().then(function (result) {
            if (result.credential) {
                var token = result.credential.accessToken;
            }
            var user = result.user;
        }).catch(function (error) {
            var errorCode = error.code;
            var errorMessage = error.message;
            var email = error.email;
            var credential = error.credential;
            if (errorCode === "auth/account-exists-with-different-credential") {
                alert("You have already signed up with a different auth provider for that email.");
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

        function knownUser(id) {
            // bulid list of studs for each teacher
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
            divSpinner.classList.add("hidden");
            let ref = database.ref("teach/" + id);
            ref.once("value").then(function (snapshot) {
                teacher = snapshot.val();
                if (teacher) {
                    // valid one time code
                    let teach = id;
                    trueName = caps(teacher.fn) + caps(teacher.ln);

                    // fetch list of dates where studs were registered (last 12)
                    let path = ['registrert'].join("/");
                    let ref = database.ref(path).orderByKey().limitToLast(12);
                    ref.once("value").then(function (snapshot) {
                        let datelist = snapshot.val();
                        if (datelist) {
                            // show these dates to user
                            // click to show how many of own studs registered on selected date
                            let dateStrings = Object.keys(datelist).sort();
                            let showList = dateStrings.map(e => {
                                let number = Object.keys(datelist[e]);
                                let mine = number.filter(uid => {
                                    return kontakter[teach] && kontakter[teach].includes(+uid);
                                });
                                let { year, month, day } = datestrParse(e);
                                return `<div id="date${ e }">
                               <span>${ day } ${ month } ${ year }</span><span>${ number.length }</span>
                               <span>${ mine.length }</span>
                               </div>`;
                            });
                            showList.unshift(`<div id="heading">
                              <span>Dato</span><span>Totalt</span><span>Dine</span>
                            </div>`);
                            divDatelist.innerHTML = showList.join('');
                            divDatelist.addEventListener("click", showThisList);

                            function showThisList(e) {
                                let t = e.target;
                                if (!t.id) {
                                    t = t.parentNode;
                                }
                                if (t.id && t.id.substr(0, 4) === 'date') {
                                    visListe(t.id.substr(4), teach);
                                }
                            }
                        } else {
                            divDatelist.innerHTML = '<h4>Systemet har ingen registreringer</h4>';
                        }
                    });
                }
            });
        }

        async function getRegistrert(datestr, teach) {
            let path = ['kontaktreg', teach, datestr].join("/");
            let ref = database.ref(path);
            let missing = [];
            let none = true;
            await ref.once("value").then(function (snapshot) {
                let list = snapshot.val();
                if (list) {
                    none = false;
                    let expected = kontakter[teach];
                    missing = expected.filter(e => !list[e]);
                }
            });
            return [missing, none];
        }

        async function visListe(datestr, teach) {
            let { year, month, day } = datestrParse(datestr);
            divMelding.classList.remove("hidden");
            let [missing, none] = await getRegistrert(datestr, teach);
            if (missing.length) {
                let userlist = missing.map(stuid => {
                    let stud = { fn: "n", ln: "nn", klasse: "mm", kontakt: "mm" };
                    if (studList[stuid]) {
                        stud = studList[stuid];
                    }
                    return '<div>' + niceName(stud) + `<span>${ stud.klasse.toUpperCase() }</span><span>${ stud.kontakt.toUpperCase() }</span></div>`;
                });
                divMelding.innerHTML = `<h4>Uregistrert ${ day } ${ month } ${ year }</h4><ol class="studlist">` + userlist.join("") + '</ol>';
            } else {
                divMelding.innerHTML = none ? `<h4>Ingen registrert ${ day } ${ month } ${ year }</h4>` : `<h4>Alle registrert ${ day } ${ month } ${ year }</h4>`;
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

                getStudsAndTeachers(); // preload data

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