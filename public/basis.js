function setup() {
   let inpKode = document.querySelector("div.registrer input");
   let divMelding = document.querySelector("div.melding");
   let lblMelding = divMelding.querySelector("label");

   inpKode.addEventListener("keyup", registrer);

   function registrer(e) {
      if (e.keyCode === 13) {
         let kode = inpKode.value;
         lblMelding.innerHTML = kode;
         divMelding.classList.remove("hidden");
      }
   }
}