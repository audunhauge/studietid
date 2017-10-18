function setup() {
  let divSignup = document.querySelector("div.signup");
  let divSpinner = document.querySelector("div.spinner");
  let divLogin = document.querySelector("div.login");
  let divRoom = document.querySelector("div.romvalg");
  let divAntall = document.querySelector("div.antall");
  let divStart = document.querySelector("div.start");
  let divTid = document.querySelector("div.tidsfrist");
  let divMelding = document.querySelector("div.melding");
  let btnLogin = divLogin.querySelector("button");
  let btnSignup = divSignup.querySelector("button");
  let inpOnetime = divSignup.querySelector("input");

  let trueName; // name registered by school
  let displayName; // name as known to id-provider
  let userid; // google id (or facebook)
  let uid; // internal id
  let rooms; // list of rooms

  let rom;
  let antall;
  let start;
  let duration;

  let validOneTime = false; // used to check one time code

  let database = firebase.database();

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
      let ref = database.ref("teachid/" + userid);
      ref.once("value").then(function (snapshot) {
        let aUserId = snapshot.val();
        if (aUserId) {
          // already used
          inpOnetime.value += " invalid";
        } else {
          // register userid:uid
          // userid from provider, uid is local id
          //let ref = database.ref("userid/" + userid);
          ref.set(id);
          knownUser(id);
        }
      });
    }

    function signup(e) {
      let otc = inpOnetime.value;
      // onetime pwd converts to uid (local id, not provider-id)
      let ref = database.ref("onetime/" + otc);
      ref.once("value").then(function (snapshot) {
        let uid = snapshot.val();
        if (uid) {
          // valid one time code
          validateSignUp(uid);
        } else {
          inpOnetime.value += " invalid";
        }
      });
    }

    function validate(e) {
      let otc = inpOnetime.value;
      let n = parseInt(otc, 16);
      let m = n.toString(16);
      validOneTime = otc.length === 12 && m.length === 12;
      btnSignup.disabled = !validOneTime;
    }

    function knownUser(id) {
      divSignup.classList.add("hidden");
      let ref = database.ref("teach/" + id);
      ref.once("value").then(function (snapshot) {
        let teacher = snapshot.val();
        if (teacher) {
          // valid one time code
          trueName = caps(teacher.fn) + " " + caps(teacher.ln);
          if (trueName.toLocaleLowerCase() !== displayName.toLocaleLowerCase()) {
            displayName = trueName + "<br>AKA " + displayName;
          }
          velgRom();
        } else {
          displayName += " ikke validert";
          divMelding.classList.remove("hidden");
          divMelding.querySelector("label").innerHTML = displayName;
        }
      });
    }

    function velgRom() {
      divRoom.classList.remove("hidden");
      divRoom.querySelector("h4").innerHTML = trueName;
      let ref = database.ref("rooms");
      ref.once("value").then(function (snapshot) {
        rooms = snapshot.val();
        let list = Object.keys(rooms).map(e => `<option value="${e.toUpperCase()}">`).join("");
        divRoom.querySelector("datalist").innerHTML = list;
      });
      divRoom.querySelector("input").addEventListener("keyup", valgtRom);
    }

    function valgtRom(e) {
      let room = divRoom.querySelector("input").value.toLowerCase();
      if (e.keyCode === 13 && rooms[room]) {
        // valid room
        rom = room; // outer scope
        divRoom.classList.add("hidden");
        velgAntall();
      }
    }

    function velgAntall() {
      divAntall.classList.remove("hidden");
      divAntall.querySelector("h4").innerHTML = trueName;
      divAntall.querySelector("input").addEventListener("keyup", valgtAntall);
    }

    function valgtAntall(e) {
      antall = divAntall.querySelector("input").valueAsNumber;
      if (e.keyCode === 13 && antall > 0 && antall < 190) {
        // valid antall
        divAntall.classList.add("hidden");
        velgStart();
      }
    }

    function velgStart() {
      divStart.classList.remove("hidden");
      divStart.querySelector("h4").innerHTML = trueName;
      divStart.querySelector("input").addEventListener("keyup", valgtStart);
    }

    function valgtStart(e) {
      start = divStart.querySelector("input").value;
      if (e.keyCode === 13 && start) {
        // valid antall
        divStart.classList.add("hidden");
        // velgVarighet();
        divMelding.classList.remove("hidden");
        divMelding.querySelector("label").innerHTML = `rom:${rom} antall:${antall} start:${start}`;
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
        displayName = user.displayName;
        userid = user.uid;

        let ref = database.ref("teachid/" + userid);
        ref.once("value").then(function (snapshot) {
          uid = snapshot.val();
          divSpinner.classList.add("hidden");
          if (uid) {
            // this is a known user
            knownUser(uid);
          } else {
            divSignup.classList.remove("hidden");

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