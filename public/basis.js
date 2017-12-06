

function setup() {
    let divMain = document.querySelector("#main");
    let divSignup = document.querySelector("div.signup");
    let divRegistrer = document.querySelector("div.registrer");
    let divSpinner = document.querySelector("div.spinner");
    let lblKode = divRegistrer.querySelector("label");
    let inpKode = divRegistrer.querySelector("input");
    let divMelding = document.querySelector("div.melding");
    let divLogin = document.querySelector("div.login");
    let lblMelding = divMelding.querySelector("label");
    let btnLogin = divLogin.querySelector("button");
    let btnSignup = divSignup.querySelector("button");
    let lblSignup = divSignup.querySelector("label");
    let inpOnetime = divSignup.querySelector("input");
    let btnRegistrer = divRegistrer.querySelector("button");

    let displayName; // name as known to id-provider
    let userid; // google id (or facebook)
    let uid; // internal id
    let student; // student record {klasse,kontakt,fn,ln }
    let photoURL; // picture

    let validOneTime = false; // used to check one time code

    let database = firebase.database();

    inpKode.addEventListener("keyup", registrer);
    btnRegistrer.addEventListener("click", registrerMeg);

    let now = new Date();
    let datestr = now.toJSON().substr(0, 10).replace(/-/g, '');

    function registrerMeg() {
        registrer({ keyCode: 13 });
    }

    function registrer(e) {
        lblKode.dataset.msg = "";
        if (e.keyCode === 13) {
            let kode = inpKode.value;
            if (kode === "") return;
            inpKode.classList.add("wait");
            let now = new Date();
            let h = now.getHours();
            let m = now.getMinutes();
            let minutes = h * 60 + m;
            let ref = database.ref("regkeys/" + kode);
            ref.once("value").then(function (snapshot) {
                inpKode.classList.remove("wait");
                let regkey = snapshot.val();
                if (regkey && regkey.count && regkey.start && regkey.room) {
                    // found a key
                    // must check count, start and duration
                    let count = +regkey.count;
                    let teach = regkey.teach;
                    if (count < 1) {
                        lblKode.dataset.msg = "exhausted";
                        return;
                    }
                    let freeSlots = Array(count).fill().map((_, i) => ("000" + i).substr(-3));
                    // freeSlots = [ '000','001' ... count-1 ]
                    let [h, m] = regkey.start.split(":");
                    let keymin = 60 * +h + +m;
                    let dur = +regkey.duration;
                    if (keymin > minutes || keymin + dur < minutes) {
                        lblKode.dataset.msg = "expired";
                        return;
                    }
                    let rom = regkey.room;
                    let teachid = regkey.teachid;
                    // try to update stud/id/userid
                    // this is allowed if the slot is empty - onetime not used
                    let path = ['roomreg', rom, datestr, kode].join("/");
                    let ref = database.ref(path);

                    // read existing values
                    ref.once("value").then(function (snapshot) {
                        let userlist = snapshot.val();
                        let slot;
                        let already = false;
                        if (userlist) {
                            // if we find userid - then already registered
                            // we check earlier against studreg - so this is unexpected
                            // TODO  userlist = { "006": {124 : "haau" }}
                            if (Object.keys(userlist).some(e => +Object.keys(userlist[e]) === +uid)) {
                                already = true; // already stored
                            }
                            freeSlots = freeSlots.filter(e => !userlist[e]);
                        }
                        if (freeSlots) {
                            slot = randomChoice(freeSlots);
                        } else {
                            lblKode.dataset.msg = "expired";
                            return;
                        }
                        if (!already) {
                            let path = ['roomreg', rom, datestr, kode, slot, uid].join("/");
                            let ref = database.ref(path);
                            ref.set(teach).then(() => {
                                divMelding.querySelector("h4").innerHTML = displayName;
                                lblMelding.innerHTML = `Registrert på ${ rom }<br>av ${ teach }`;
                                divMelding.classList.remove("hidden");
                                divRegistrer.classList.add("hidden");
                            }).catch(err => {
                                inpOnetime.value += " taken";
                            });
                        } else {
                            divMelding.querySelector("h4").innerHTML = displayName;
                            lblMelding.innerHTML = `Allerede registrert: ${ rom }<br>av ${ teach }`;
                            divMelding.classList.remove("hidden");
                            divRegistrer.classList.add("hidden");
                            return;
                        }
                        // store with inverted keys for quick access
                        let kontakt = student.kontakt;
                        path = ['kontaktreg', kontakt, datestr, uid].join("/");
                        ref = database.ref(path);
                        ref.set(`${ teach },${ rom }`).catch(err => {
                            // ignoring error - can be rebuilt from roomreg
                        });
                        path = ['studreg', uid, datestr].join("/");
                        ref = database.ref(path);
                        ref.set(`${ teach },${ rom }`).catch(err => {
                            // ignoring error - can be rebuilt from roomreg
                        });
                        path = ['registrert', datestr, uid, kode].join("/");
                        ref = database.ref(path);
                        ref.set(`${ teach },${ rom }`).catch(err => {
                            // ignoring error - can be rebuilt from roomreg
                        });
                        // setTimeout(() => firebase.database().goOffline(), 40000);
                        // free up connection after 40s
                        // cant do it imm because this will kill pending updates
                        // if still pending after 40s assume network error
                    });
                } else {
                    lblKode.dataset.msg = "invalid";
                }
            });
        }
    }

    function toggleSignIn() {
        if (!firebase.auth().currentUser) {
            var provider = new firebase.auth.GoogleAuthProvider();
            provider.addScope("https://www.googleapis.com/auth/plus.login");
            firebase.auth().signInWithRedirect(provider);
        } else {
            firebase.auth().signOut();
        }
        btnLogin.disabled = true;
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
         * Check if onetime already used
         * if not used - connect userid (provider) with local id
         * userid is available in enclosing scope (provider id)
         * @param {int} id  - local uid
         */
        function validateSignUp(id) {
            // we fetch data for user given by uid
            let ref = database.ref("userid/" + userid);
            ref.once("value").then(function (snapshot) {
                let aUserId = snapshot.val();
                if (aUserId) {
                    // already used
                    inpOnetime.value += " invalid";
                } else {
                    // try to update stud/id/userid
                    // this is allowed if the slot is empty - onetime not used
                    let ref = database.ref("stud/" + id + "/userid");
                    ref.set(String(userid)).then(() => {
                        // register userid:uid
                        // userid from provider, uid is local id
                        let ref = database.ref("userid/" + userid);
                        ref.set(String(id));
                        knownUser(id);
                    }).catch(err => {
                        inpOnetime.value += " taken";
                    });
                }
            });
        }

        function signup(e) {
            let otc = inpOnetime.value;
            // onetime pwd converts to uid (local id, not provider-id)
            let ref = database.ref("onetimeStud/" + otc);
            ref.once("value").then(function (snapshot) {
                let uid = snapshot.val();
                if (uid) {
                    // valid one time code
                    validateSignUp(uid);
                } else {
                    lblSignup.dataset.msg = "invalid";
                }
            });
        }

        function validate(e) {
            let otc = inpOnetime.value;
            validOneTime = otc.length === 10;
            btnSignup.disabled = !validOneTime;
        }

        function knownUser(id) {
            let path = ['studreg', id, datestr].join("/");
            let ref = database.ref(path);
            ref.once("value").then(function (snapshot) {
                let reg = snapshot.val();
                if (reg) {
                    let [teach, rom] = reg.split(",");
                    divMelding.querySelector("h4").innerHTML = displayName;
                    lblMelding.innerHTML = `Registrert på ${ rom }<br>av ${ teach }`;
                    divMelding.classList.remove("hidden");
                    // try to fetch picture of teach
                    let path = ['teach', teach, 'pix'].join("/");
                    let ref = database.ref(path);
                    ref.once("value").then(function (snapshot) {
                        let src = snapshot.val();
                        if (src) {
                            let pix = document.createElement('img');
                            pix.src = src;
                            divMelding.appendChild(pix);
                        }
                    });
                } else {
                    divSignup.classList.add("hidden");
                    divRegistrer.classList.remove("hidden");
                    inpKode.focus();
                    ref = database.ref("stud/" + id);
                    ref.once("value").then(function (snapshot) {
                        student = snapshot.val();
                        if (student) {
                            // valid student
                            let trueName = caps(student.fn) + " " + caps(student.ln);
                            if (trueName.toLocaleLowerCase() !== displayName.toLocaleLowerCase()) {
                                displayName = trueName + "<br>AKA " + displayName;
                            }
                        } else {
                            displayName += " ikke validert";
                        }
                        divRegistrer.querySelector("h4").innerHTML = displayName;
                    });
                }
            });
        }

        firebase.auth().onAuthStateChanged(function (user) {
            if (user) {
                // User is signed in.
                let email = user.email;
                let emailVerified = user.emailVerified;

                let isAnonymous = user.isAnonymous;
                let providerData = user.providerData;

                // created in enclosing scope
                displayName = user.displayName;
                userid = user.uid;
                photoURL = user.photoURL;

                let ref = database.ref("userid/" + userid);
                ref.once("value").then(function (snapshot) {
                    uid = snapshot.val();
                    divSpinner.classList.add("hidden");
                    if (uid) {
                        // this is a known user
                        knownUser(uid);
                    } else {
                        // allow user to sign up with google/facebook
                        divSignup.classList.remove("hidden");
                        divRegistrer.classList.add("hidden");
                        btnSignup.addEventListener("click", signup);
                        inpOnetime.addEventListener("keyup", validate);
                    }
                });
            } else {
                divSpinner.classList.add("hidden");
                divLogin.classList.remove("hidden");
            }
            btnLogin.disabled = false;
        });
        btnLogin.addEventListener("click", toggleSignIn, false);
    }

    initApp();
}