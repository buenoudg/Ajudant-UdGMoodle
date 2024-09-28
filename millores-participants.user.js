// ==UserScript==
// @name            Millores a "Participants"
// @name:ca         Millores a "Participants"
// @name:en         Improvements to "Participants"
// @name:es         Mejoras en "Participantes"
// @version         0.8.0
// @author          Antonio Bueno <antonio.bueno@udg.edu>
// @description     Coloreja segons els rols, fa les fotos més grans i millors, i deixa fer el llistat imprimible
// @description:ca  Coloreja segons els rols, fa les fotos més grans i millors, i deixa fer el llistat imprimible
// @description:en  Highlights according to roles, and makes photos bigger and better, and allows making the list printable
// @description:es  Colorea según los roles, hace las fotos más grandes, y deja hacer el listado imprimible
// @license         MIT
// @namespace       https://github.com/buenoudg/Ajudant-UdGMoodle
// @supportURL      https://github.com/buenoudg/Ajudant-UdGMoodle/issues
// @match           https://moodle.udg.edu/user/index.php?*
// @match           https://moodle2.udg.edu/user/index.php?*
// @icon            https://raw.githubusercontent.com/buenoudg/Ajudant-UdGMoodle/master/udgmoodle_44x44.png
// @require         https://cdn.jsdelivr.net/npm/jquery@3/dist/jquery.min.js
// @require         https://cdn.jsdelivr.net/npm/toastify-js@1/src/toastify.min.js
// @resource        toastifyCSS https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css
// @grant           GM_addStyle
// @grant           GM_getResourceText
// ==/UserScript==

// TODO: Torna a executar tot quan la pàgina canviï
// TODO: Fes que l'script sigui independent de la configuració regional
// TODO: Restaura la llista d'estudiant×grup i fes que aparegui sempre


// jshint esversion: 8

// Fotos amb més qualitat i dins d'un quadrat arrodonit
function milloraFotos() {
    GM_addStyle(`
        #participants img.userpicture {
            border-radius: 10%;
            height: 70px !important;
            width: 70px !important;
        }
        #participants img.userpicture:hover {
            border-radius: 10%;
            height: 70px !important;
            width: 70px !important;
            filter: brightness(1) contrast(1) !important;
        }
    `);

    $("#participants img.userpicture").each(function () {
        // Canvas temporal per analitzar la imatge
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = this.width;
        canvas.height = this.height;
        ctx.drawImage(this, 0, 0, this.width, this.height);
        const imgData = ctx.getImageData(0, 0, this.width, this.height);
        const data = imgData.data;

        // Recorrem tots els píxels per calcular la brillantor i el contrast
        let sumaBrillantor = 0;
        let sumaQuadratsBrillantor = 0;
        for (let i = 0; i < data.length; i += 4) {
            const brillantor = 0.2126 * data[i] + 0.7152 * data[i+1] + 0.0722 * data[i+2];
            sumaBrillantor += brillantor;
            sumaQuadratsBrillantor += brillantor * brillantor;
        }

        // Calcula la brillantor i el contrast
        const totalPixels = this.width * this.height;
        const brillantor = sumaBrillantor / totalPixels;
        const contrast = Math.sqrt(sumaQuadratsBrillantor / totalPixels - brillantor * brillantor);

        // Aplicar els filtres CSS si cal
        const filtre = `brightness(${brillantor<100 ? 1.3 : (brillantor>210 ? 0.9 : 1)}) contrast(${contrast<40 ? 1.5 : (contrast>150 ? 0.9 : 1)})`;
        if (filtre != 'brightness(1) contrast(1)') {
          console.log(filtre, $(this).parent().text(), `brillantor = ${brillantor}, contrast = ${contrast}`);
          $(this).css('filter', filtre);
        }

        // Actualitza la foto a la màxima qualitat
        $(this).attr("src", $(this).attr("src").replace(/\/f[12]/, "/f3"));
    });
}


// Colora els participants no estudiants
function coloraRols(professor = "#EDC", coordinador = "#CDE", senseRol = "#F99") {
    GM_addStyle("" + `
        #participants tr.professor td, #participants tr.professor th,
        #participants tr.professor-no-editor td, #participants tr.professor-no-editor th { background-color: ${professor} }
        #participants tr.coordinador td, #participants tr.coordinador th,
        #participants tr.sotsdirector td, #participants tr.sotsdirector th{ background-color: ${coordinador} }
        #participants tr.sense-rols td, #participants tr.sense-rols th { background-color: ${senseRol} }
    `);
    $("#participants td.c4").each(function () { // afegeix classes CSS basades en els noms dels rols
        $(this).parents("tr").addClass($(this).text().trim().toLowerCase().replace(/ /g, "-"));
    });
}

(function () {
    "use strict";

    /*
     * DOM manipulations courtesy of jQuery
     */

    // Modificacions are applied once the DOM has been build (images may be still loading)
    $(document).ready(function () {

        // Makes clear that the script is running and its version
        notification(GM.info.script.name + " " + GM.info.script.version, "hello", 3);

        milloraFotos();
        coloraRols();

        // Clona l'enllaç "Mostra'ls tots" (si existeix) a sobre de la llista de participants
        // i força la recàrrega de la pàgina en fer clic a qualsevol d'aquests dos enllaços
        GM_addStyle("" + `
            #show-all-clone { float: right }
            #show-all { position: relative; top: -3em }
        `);
        $(".userlist").prepend($("#participantsform a[href*='perpage=5000']").clone().attr("id", "show-all-clone"));
        $(".table-dynamic").after($("#participantsform a[href*='perpage=5000']").attr("id", "show-all"));

        // Elimina les inicials que aparèixen quan no tenen foto
        $("#participants").find(".userinitials").remove();

        // Fes imprimible el llistat (filtrat o no)
        GM_addStyle("#printable { border-radius: 1.2em; margin-right: 1em; padding: 0.3em 0.9em; }");
        $(".enrolusersbutton form div").first().prepend('<button id="printable">Fes-ho imprimible');
        $("#printable").on("click", function() {
            milloraFotos();
            $("body").prepend($("#participants"));
            GM_addStyle("" + `
                nav, #page, #sidepreopen-control, #sidepre-blocks, #nav-drawer, #page-wrapper,
                #top-footer, #nav-drawer-footer, .c0, .c1 a, .c2, .c3, .c4 span, .c5 span, .c6, .c7, thead { display: none !important }
                html body { background-color: white !important; margin: 0 !important }
                table, tr, th, td { background-color: white !important; border: 1px solid black !important; color: black !important }
                .c1 { white-space: nowrap; width: 34% }
                .c1 img { float: left }
                .c1 div { font-weight: normal !important }
            `);

            // Elimina de nou les inicials que aparèixen quan no tenen foto
            $("#participants").find(".userinitials").remove();

            $("body").prepend('<h1 id="title" contenteditable="true">'+document.title);
            $("#title").on("keyup", function() {
              document.title = $(this).text().replace(":", " - ").replace("/", "-").replace(".", "");
            });

            $("#participants tr").each(function() {
                const name = $(this).find(".c1").text();
                const id = $(this).find(".c2").text();
                const email = $(this).find(".c5").text();
                const $photo = $(this).find(".c1 img");
                $(this).find(".c1").prepend($photo).append(`<div><b>${name}<div>${id}<div>${email}`);
            });
            return false; // evita que el clic al butó faci res més
        });
    });

    /*
     * Notifications courtesy of Toastify JS (see https://apvarun.github.io/toastify-js/)
     */

    GM_addStyle(GM_getResourceText("toastifyCSS") + `
        div.toastify { margin: inherit; width: inherit; border-radius: 1.5em; font-family:
            -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif }
    `);
    function notification(message, type = "info", timeout = 5) {
        // The "type" parameter accepts four values: "info", "warning", "error" and "hello"
        // The "timeout" parameter is expressed in seconds although Toastify uses milliseconds
        var color, icon;
        switch (type) {
            case "warning": color = "rgba(201, 201, 0, 0.8)"; icon = "⚠️"; break;
            case "error": color = "rgba(201, 51, 51, 0.8)"; icon = "🛑"; break;
            case "hello": color = "rgba(51, 153, 51, 0.8)"; icon = "👋🏼"; break;
            default: color = "rgba(51, 51, 153, 0.8)"; icon = "📢";
        }
        Toastify({ text: icon + " " + message, duration: timeout * 1000, gravity: "bottom", style: { background: color } }).showToast();
    }

})();
