

function setup() {

  let divSignup = document.querySelector("div.signup");
  let divSpinner = document.querySelector("div.spinner");

  let divLogin = document.querySelector("div.login");

  let btnLogin = divLogin.querySelector("button");
  let btnSignup = divSignup.querySelector("button");
  let inpOnetime = divSignup.querySelector("input");

  let displayName; // name as known to id-provider
  let userid; // google id (or facebook)
  let uid; // internal id

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

      let ref = database.ref("stud/" + id);
      ref.once("value").then(function (snapshot) {
        let student = snapshot.val();
        if (student) {
          // valid one time code
          let trueName = student.fn + " " + student.ln;
          if (trueName.toLocaleLowerCase() !== displayName.toLocaleLowerCase()) {
            displayName = trueName + "<br>AKA " + displayName;
          }
        } else {
          displayName += " ikke validert";
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