// @flow

function setup() {
    let inpKode:any = document.querySelector("div.registrer input");
    let divMelding = document.querySelector("div.melding");
    let lblMelding = divMelding.querySelector("label");
    
    inpKode.addEventListener("keyup", registrer);

    function registrer(e:KeyboardEvent) {
       if (e.keyCode === 13) {
          let kode = inpKode.value;
          lblMelding.innerHTML = kode;
          divMelding.classList.remove("hidden");


       }
    }
}