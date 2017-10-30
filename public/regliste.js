function setup() {
    let divSpinner = document.querySelector("div.spinner");
    let divRoom = document.querySelector("div.romvalg");
    let divMelding = document.querySelector("div.melding");

    let database = firebase.database();
    let trueName, rooms, room;

    let now = new Date();
    let datestr = now.toJSON().substr(0, 10).replace(/-/g, '');

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

        function knownUser(id) {
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
                let list = Object.keys(rooms).map(e => `<option value="${ e.toUpperCase() }">`).join("");
                divRoom.querySelector("datalist").innerHTML = list;
            });
            divRoom.querySelector("input").addEventListener("keyup", valgtRom);
        }

        function valgtRom(e) {
            let myroom = divRoom.querySelector("input").value.toLowerCase();
            if (e.keyCode === 13 && rooms[myroom]) {
                // valid room
                room = myroom; // outer scope
                divRoom.classList.add("hidden");
                visListe(room);
            }
        }

        function visListe(room) {
            let path = ['roomreg', room, datestr].join("/");
            let ref = database.ref(path);
            divMelding.classList.remove("hidden");
            ref.once("value").then(function (snapshot) {
                let list = snapshot.val();
                if (list) {
                    divMelding.innerHTML = `<h4>${ room }</h4>` + list.join('');
                } else {
                    divMelding.innerHTML = `<h4>${ room }</h4>` + "ingen registrert";
                }
            });
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