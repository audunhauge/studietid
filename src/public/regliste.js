// @flow

declare function caps(s: string): string;

declare var firebase: {
    app: () => any,
    auth: () => any,
    database: () => any
};

function setup() {
    let divSignup: any = document.querySelector("div.signup");
    

    let database = firebase.database();


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

       

        function knownUser(id: number) {
            divSignup.classList.add("hidden");
            let ref = database.ref("teach/" + id);
            ref.once("value").then(function (snapshot) {
                let teacher = snapshot.val();
                if (teacher) {
                    // valid one time code
                    let teach = id;
                    
                    visListe();
                } 
            });
        }

        function visListe() {
            let ref = database.ref("teach/" + id);
            ref.on("value").then(function (snapshot) {
                let teacher = snapshot.val();
                if (teacher) {
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
