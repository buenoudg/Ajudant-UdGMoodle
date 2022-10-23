// ==UserScript==
// @name            Millores a "Participants"
// @name:ca         Millores a "Participants"
// @name:en         Improvements to "Participants"
// @name:es         Mejoras en "Participantes"
// @version         0.3.0
// @author          Antonio Bueno <antonio.bueno@udg.edu>
// @description     Coloreja segons els rols, fa les fotos més grans i genera un llistat alumne/professor
// @description:ca  Coloreja segons els rols, fa les fotos més grans i genera un llistat alumne/professor
// @description:en  Highlights according to roles, makes photos bigger and better, and generates a user/teacher listing
// @description:es  Colorea según los roles, hace las fotos más grandes y genera un listado alumno/profesora
// @license         MIT
// @namespace       https://github.com/buenoudg/Ajudant-UdGMoodle
// @supportURL      https://github.com/buenoudg/Ajudant-UdGMoodle/issues
// @match           https://moodle2.udg.edu/user/index.php?*perpage=5000*
// @icon            https://raw.githubusercontent.com/buenoudg/Ajudant-UdGMoodle/master/udgmoodle_44x44.png
// @require         https://cdn.jsdelivr.net/npm/jquery@3/dist/jquery.min.js
// @require         https://cdn.jsdelivr.net/npm/toastify-js@1/src/toastify.min.js
// @resource        toastifyCSS https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css
// @grant           GM.addStyle
// @grant           GM.getResourceText
// ==/UserScript==

// TODO: Rerun everything when page mutates
// TODO: Apply extra brightness only to dark photos
// TODO: Make the script independent of locale

// jshint esversion: 8
(function () {
    "use strict";

    // Configuració
    const midaFoto = 70, // píxels
        brillantorExtra = 0.33,
        colorProfessor = "#EDC",
        colorCoordinador = "#CDE",
        colorSenseRol = "#F99";

    /*
     * DOM manipulations courtesy of jQuery
     */

    // Modificacions are applied once the DOM has been build (images may be still loading)
    $(document).ready(function () {

        // Makes clear that the script is running and its version
        notification(GM.info.script.name + " " + GM.info.script.version);

        const codiAssignatura = document.title.split("/")[0];

        // Fotos més grans i clares, dins un quadrat arrodonit, i amb més qualitat
        GM.addStyle("" + `
            #page-content img.userpicture {
                border-radius: 10%;
                height: ${midaFoto}px !important;
                width: ${midaFoto}px !important;
                filter: brightness(${1 + brillantorExtra});
            }
            #page-content img.userpicture[src$=f3] {
                filter: brightness(1);
            }`);
        $("#page-content img.userpicture").each(function () {
            $(this).attr("src", $(this).attr("src").replace(/\/f[12]/, "/f3"));
        });

        // Marca amb colors diferents els participants no estudiants
        GM.addStyle("" + `
            #page-content tr.professor td, #page-content tr.professor-no-editor td {
                background-color: ${colorProfessor};
            }
            #page-content tr.coordinador td {
                background-color: ${colorCoordinador};
            }
            #page-content tr.sense-rols td {
                background-color: ${colorSenseRol};
            }`);
        $("#participants td.c4").each(function () {
            let classRol = $(this).text().trim().toLowerCase().replace(/ /g, "-");
            $(this).parents("tr").addClass(classRol);
        });

        // Extreu dades de la taula de participants
        let participants = [];
        $("#participants tbody tr").not(".emptyrow").each(function () {
            const participant = {
                "cognomsNom": $(this).find(".c1").text().trim(),
                "numeroUdG": $(this).find(".c2").text().trim(),
                "correu": $(this).find(".c3").text().trim(),
                "rol": $(this).find(".c4").text().trim(), // assumed not a list
                "grups": $(this).find(".c5").text().trim(),
                "estat": $(this).find(".c7").text().trim()
            };
            participant.grups = (participant.grups == "Sense grups") ? [] : participant.grups.split(", ");
            participants.push(participant);
        });

        // Dades derivades a partir de les dades extretes
        const professors = participants.filter(participant => (participant.rol != "Estudiant") && (participant.grups.length > 0));
        let grups = {};
        professors.forEach(function (professor) {
            professor.grups.forEach(function (grup) {
                if (!grups[grup]) grups[grup] = [];
                grups[grup].push(professor.cognomsNom);
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

    });

    /*
     * Notifications courtesy of Toastify JS (see https://apvarun.github.io/toastify-js/)
     */

    GM.addStyle(GM.getResourceText("toastifyCSS") + `
        div.toastify { margin: inherit; padding-bottom: 20px; width: inherit; font-family:
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
            default: color = "rgba(51, 51, 153, 0.8)"; icon = "ℹ️";
        }
        Toastify({ text: icon + " " + message, duration: timeout * 1000, gravity: "bottom", style: { background: color } }).showToast();
    }

})();