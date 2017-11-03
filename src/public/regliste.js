// @flow

declare function caps(s: string): string;

declare var firebase: {
    app: () => any,
    auth: () => any,
    database: () => any
};

function setup() {
    let divSpinner: any = document.querySelector("div.spinner");
    let divRoom: any = document.querySelector("div.romvalg");
    let divMelding: any = document.querySelector("div.melding");


    let database = firebase.database();
    let trueName, rooms, room;

    let now = new Date();
    let datestr = now.toJSON().substr(0, 10).replace(/-/g, '');

    let studList; // enr:{fn,en,klasse,kontakt}
    let teachList;  // kortnavn:{fn,en}


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
                let teacher = snapshot.val();
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
                if (list) {
                    let regs = [[22,2],[23,2],[24,2],[25,2],[26,2],[27,2],[28,2],[29,2],[122,2]];
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
                       let teach = {fn:"n",ln:"nn"};
                       let [stuid,tid] = e;
                       if (teachList[tid]) {
                           teach = teachList[tid];
                       }
                       let stud = {fn:"n",ln:"nn"};
                       if (studList[stuid]) {
                           stud = studList[stuid];
                       }
                       return (` <div><input type="checkbox" id="s${stuid}">${caps(stud.fn)} ${caps(stud.ln)}</div>`);
                    })
                    divMelding.innerHTML =
                        `<h4>${room.toUpperCase()}</h4><div class="studlist">` 
                        + userlist.join("") + '</div>';
                    ;
                    divMelding.addEventListener("click", removeStudReg);
                } else {
                    divMelding.innerHTML =
                        `<h4>${room}</h4>` +
                        "ingen registrert";
                }
            });
        }

        function removeStudReg(e:MouseEvent) {
            if (e.offsetX < -8) {
                let t:any = e.target;
                if (t.id && t.id.charAt(0) === 's') {
                  console.log(t.id);
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
                    let uid = snapshot.val();
                    // divSpinner.classList.add("hidden");
                    if (uid) {
                        // this is a known user
                        knownUser(uid);
                    }
                });
            } else {
                //divSpinner.classList.add("hidden");
                //divLogin.classList.remove("hidden");
            }
        });
    }

    initApp();
}
