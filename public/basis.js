function setup() {

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

  let displayName; // name as known to id-provider
  let userid; // google id (or facebook)
  let uid; // internal id

  let validOneTime = false; // used to check one time code

  let database = firebase.database();

  inpKode.addEventListener("keyup", registrer);

  /*******************
   * TESTING LAYOUT CSS
   */
  //$FlowFixMe flow can't decide
  document.getElementById("test").addEventListener("click", changeClass);

  function changeClass(e) {
    let target = e.target;
    let klass = target.dataset.t;
    document.getElementById("main").classList.remove(..."aa,bb,cc,dd".split(","));
    document.getElementById("main").classList.add(klass);
  }

  /**
   * END TESTING
   */

  function registrer(e) {
    let now = new Date();
    let h = now.getHours();
    let m = now.getMinutes();
    let minutes = h * 60 + m;
    lblKode.dataset.msg = "";
    if (e.keyCode === 13) {
      let kode = inpKode.value;
      let ref = database.ref("regkeys/" + kode);
      ref.once("value").then(function (snapshot) {
        let regkey = snapshot.val();
        if (regkey) {
          // found a key
          // must check count, start and duration
          if (regkey.count < 1) {
            lblKode.dataset.msg = "exhausted";
            return;
          }
          let [h, m] = regkey.start.split(":");
          let keymin = 60 * +h + +m;
          let dur = +regkey.duration;
          if (keymin > minutes || keymin + dur < minutes) {
            lblKode.dataset.msg = "expired";
            return;
          }
          let rom = regkey.room;
          let teach = regkey.teach;
          divMelding.querySelector("h4").innerHTML = displayName;
          lblMelding.innerHTML = `Registrert på ${rom}<br>av ${teach}`;
          divMelding.classList.remove("hidden");
          divRegistrer.classList.add("hidden");
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
    divRegistrer;
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
          // register userid:uid
          // userid from provider, uid is local id
          let ref = database.ref("userid/" + userid);
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
          lblSignup.dataset.msg = "invalid";
        }
      });
    }

    function validate(e) {
      let otc = inpOnetime.value;
      let n = parseInt(otc, 16);
      let m = n.toString(16);
      validOneTime = otc.length === 10 && m.length === 10;
      btnSignup.disabled = !validOneTime;
    }

    function knownUser(id) {
      divSignup.classList.add("hidden");
      divRegistrer.classList.remove("hidden");
      let ref = database.ref("stud/" + id);
      ref.once("value").then(function (snapshot) {
        let student = snapshot.val();
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