// ==UserScript==
// @name            Millores a "Participants"
// @name:ca         Millores a "Participants"
// @name:en         Improvements to "Participants"
// @name:es         Mejoras en "Participantes"
// @version         0.5.0
// @author          Antonio Bueno <antonio.bueno@udg.edu>
// @description     Coloreja segons els rols, fa les fotos més grans, deixa fer el llistat imprimible i genera un llistat alumne/professor
// @description:ca  Coloreja segons els rols, fa les fotos més grans, deixa fer el llistat imprimible i genera un llistat alumne/professor
// @description:en  Highlights according to roles, makes photos bigger and better, allows making the list printable, and generates a user/teacher list
// @description:es  Colorea según los roles, hace las fotos más grandes, deja hacer el listado imprimible y genera un listado alumno/profesora
// @license         MIT
// @namespace       https://github.com/buenoudg/Ajudant-UdGMoodle
// @supportURL      https://github.com/buenoudg/Ajudant-UdGMoodle/issues
// @match           https://moodle2.udg.edu/user/index.php?*
// @icon            https://raw.githubusercontent.com/buenoudg/Ajudant-UdGMoodle/master/udgmoodle_44x44.png
// @require         https://cdn.jsdelivr.net/npm/jquery@3/dist/jquery.min.js
// @require         https://cdn.jsdelivr.net/npm/toastify-js@1/src/toastify.min.js
// @resource        toastifyCSS https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css
// @grant           GM_addStyle
// @grant           GM_getResourceText
// ==/UserScript==

// TODO: Rerun everything when page mutates
// TODO: Apply extra brightness only to dark photos
// TODO: Make the script independent of locale
// TODO: Always offer the student×grup listing

// jshint esversion: 8

// Fotos més grans i clares, dins un quadrat arrodonit, i amb més qualitat
function milloraFotos() {
    const midaFoto = 70; // píxels
    const brillantorExtra = 0.3; // TODO: Aclarar només les fotos fosques
    GM_addStyle("" + `
        #participants img.userpicture {
            border-radius: 10%;
            height: ${midaFoto}px !important;
            width: ${midaFoto}px !important;
            filter: brightness(${1 + brillantorExtra});
        }
        #participants img.userpicture[src$=f3] {
            filter: brightness(1);
        }`);
    $("#participants img.userpicture").each(function () {
        $(this).attr("src", $(this).attr("src").replace(/\/f[12]/, "/f3")); // fa servir fotos al màxim de qualitat
    });
}

// Colora els participants no estudiants
function coloraRols(professor = "#EDC", coordinador = "#CDE", senseRol = "#F99") {
    GM_addStyle("" + `
        #participants tr.professor td, #participants tr.professor-no-editor td { background-color: ${professor} }
        #participants tr.coordinador td { background-color: ${coordinador} }
        #participants tr.sense-rols td { background-color: ${senseRol} }
    `);
    $("#participants td.c4").each(function () { // afegeix classes CSS basades en els noms dels rols
        $(this).parents("tr").addClass($(this).text().trim().toLowerCase().replace(/ /g, "-"));
    });
}

// Extreu dades de la taula de participants
function dadesParticipants() {
    let participants = [];
    $("#participants tbody tr").not(".emptyrow").each(function () {
        const participant = {
            "cognomsNom": $(this).find(".c1").text().trim(),
            "numeroUdG": $(this).find(".c2").text().trim(),
            "rol": $(this).find(".c4").text().trim(), // s'assumeix que només hi ha un rol per participant
            "grups": $(this).find(".c5").text().trim()
        };
        participant.grups = (participant.grups == "Sense grups") ? [] : participant.grups.split(", ");
        participants.push(participant);
    });
    return participants;
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
        let participants = dadesParticipants();

        // Genera llistats només quan tots els participants es veuen a la pàgina
        if (document.location.href.includes("perpage=5000") || $("a[data-target-page-size]").length == 0) {
            // Dades derivades a partir de les dades extretes
            const codiAssignatura = document.title.split("/")[0];
            const professors = participants.filter(participant => (participant.rol != "Estudiant") && (participant.grups.length > 0));
            let grups = {};
            professors.forEach(function (professor) {
                professor.grups.forEach(function (grup) {
                    if (!grups[grup]) grups[grup] = [];
                    grups[grup].push(professor.cognomsNom + ";" + professor.numeroUdG);
                });
            });
            const estudiants = participants.filter(participant => participant.rol == "Estudiant");
            // Relació alumne/professor (o alumne/grup si el professor del grup és desconegut)
            let llistat = [];
            estudiants.forEach(function (estudiant) {
                estudiant.grups.forEach(function (grup) {
                    if (grup in grups) {
                        grups[grup].forEach(function (professor) {
                            llistat.push([codiAssignatura, estudiant.cognomsNom, estudiant.numeroUdG, professor].join(";"));
                        });
                    } else {
                        llistat.push([codiAssignatura, estudiant.cognomsNom, estudiant.numeroUdG, grup].join(";"));
                    }
                });
            });
            const CSV = [... new Set(llistat)].join("\r\n");
            const dadesLlistat = (Object.keys(grups).length > 0) ? "alumne×professor" : "alumne×grup";
            $(".userlist").prepend(`<a href="data:text/plain;charset=utf-8,\uFEFF${encodeURIComponent(CSV)}"
                download="${codiAssignatura}.csv" style="float:right">💾 Descarrega llistat ${dadesLlistat}`);
        } else {
            // Clona l'enllaç "Mostra'ls tots" (si existeix) a sobre de la llista de participants
            // i força la recàrrega de la pàgina en fer clic a qualsevol d'aquests dos enllaços
            GM_addStyle("" + `
                #show-all-clone { float: right }
                #show-all { position: relative; top: -3em }
            `);
            $(".userlist").prepend($("#participantsform a[href*='perpage=5000']").clone().attr("id", "show-all-clone"));
            $(".table-dynamic").after($("#participantsform a[href*='perpage=5000']").attr("id", "show-all"));
        }

        // Fes imprimible el llistat (filtrat o no)
        GM_addStyle("#printable { border-radius: 1.2em; margin-right: 1em; padding: 0.3em 0.9em; }");
        $(".enrolusersbutton form div").first().prepend('<button id="printable">Fes-ho imprimible');
        $("#printable").on("click", function () {
            milloraFotos();
            $("body").prepend($("#participants"));
            GM_addStyle("" + `
                nav, #page, #sidepreopen-control, #sidepre-blocks, #nav-drawer,
                #top-footer, #nav-drawer-footer, .c0, .c1 a, .c2, .c3, .c4 span, .c5 span, .c6, .c7, thead { display: none !important }
                body { margin: 0 !important }
                table, tr, th, td { background-color: white !important; border: 1px solid black !important; color: black !important }
                .c1 { white-space: nowrap; width: 34% }
                .c1 img { float: left }
                .c1 div { font-weight: normal !important }
            `);
            $("#participants tr").each(function() {
                const name = $(this).find(".c1").text();
                const id = $(this).find(".c2").text();
                const email = $(this).find(".c3").text();
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
