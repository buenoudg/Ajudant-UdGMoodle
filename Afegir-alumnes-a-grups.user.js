// ==UserScript==
// @name         UdGMoodle: Afegir alumnes a grups
// @namespace    https://github.com/buenoudg/Ajudant-UdGMoodle
// @version      0.1
// @description  Eina per facilitar afegir alumnes als grups d'una assignatura del Moodle de la UdG
// @author       Antonio Bueno <antonio.bueno@udg.edu>
// @icon         https://raw.githubusercontent.com/buenoudg/Ajudant-UdGMoodle/master/udgmoodle_44x44.png
// @match        *://moodle2.udg.edu/group/index.php*
// @match        *://moodle2.udg.edu/group/members.php*
// @require      https://cdn.jsdelivr.net/npm/jquery@3/dist/jquery.slim.min.js
// @require      https://cdn.jsdelivr.net/npm/toastify-js
// @resource     toastifyCSS https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

/*
 * Versions:
 *  - 0.1 (2018-07-25) Refet des de zero per compatibilitat i modularitat, així com per afegir notificacions.
 *
 * NOTA: Aquest script aprofita que UdGMoodle fa servir les icones de FontAwesome (veure https://fontawesome.com/icons?d=gallery)
 */

(function () {
    "use strict";

    /*
     * Les notificacions es fan amb Toastify JS (veure https://apvarun.github.io/toastify-js/)
     */

    GM_addStyle(GM_getResourceText("toastifyCSS") +
        ".toastify { border-radius: 4px; padding: 12px; z-index: 2 }" +
        ".fa-2x    { vertical-align: middle; margin-right: 0.33em }");

    function notificacio(missatge, tipus = "info", durada = 5) {
        // El paràmetre "tipus" admet quatre valors: "info" per defecte, "avis", "error" i "hola"
        // El paràmetre "durada" s'expressa en segons (per defecte 5) tot i que Toastify fa servir mil·lisegons
        var color, icona;
        switch (tipus) {
            case "avis":
                color = "rgba(201, 201, 0, 0.8)";
                icona = '<span class="fa fa-2x fa-exclamation-triangle"></span>';
                break;
            case "error":
                color = "rgba(201, 0, 0, 0.8)";
                icona = '<span style="color:yellow"><span class="fa fa-2x fa-times-circle"></span>';
                break;
            case "hola":
                color = "rgba(51, 153, 51, 0.8)";
                icona = '<span class="fa fa-2x fa-wrench"></span>';
                break;
            default:
                color = "rgba(102, 102, 204, 0.8)";
                icona = '<span class="fa fa-2x fa-info-circle"></span>';
        }
        window.Toastify({
            text: icona + missatge,
            duration: durada * 1000,
            gravity: "bottom",
            backgroundColor: color
        }).showToast();
    }


    /*
     * Les manipulacions del DOM es fan (per ara) amb la versió "slim" de jQuery
     */

    var $ = window.jQuery; // innecessari, però evita falsos missatges d'error a l'editor de Tampermonkey

    // Totes les modificacions es fan una vegada la pàgina s'ha carregat
    $(document).ready(function () {

        notificacio("UdGMoodle: Afegir alumnes a grups", "hola"); // per fer notar que l'script està funcionant

        var assignacions;
        if (window.location.pathname == "/group/index.php") { // pàgina per gestionar els grups

            // #assignacions és on cal enganxar les dades (número UdG i nom de grup, separats per espai en blanc, una parella per línia)
            var pistaText = "Enganxa aquí números UdG i el seu grup corresponent.\n\nExemple:\n1987654 P.Inf-2\n1976543 P.Inf-3\n1965432 P.Inf-1";
            GM_addStyle("#assignacions { background-color: #FFE; font-family: Consolas !important; height: 21.9em; margin-top: 1.8em }");
            $("div.groupmanagementtable div.row")
                .append(`<div class="col-md-2 span2"><textarea autofocus id="assignacions" placeholder="${pistaText}" spellcheck="false">`)
                .find("div.col-md-6.span6").removeClass("col-md-6 span6").addClass("col-md-4 span4");

            // Recupera les assignacions existents
            assignacions = GM_getValue("assignacions");

            // Comprova si s'ha canviat d'assignatura/curs i guarda el valor actual
            var assignatura = $("#sitetitle").text();
            if (assignatura == GM_getValue("assignatura")) {
                // Restaura les assignacions existents perquè no ha canviat l'assignatura
                $("#assignacions").val(assignacions);
            } else {
                GM_setValue("assignatura", assignatura);
                notificacio("Assignacions esborrades per canvi d'assignatura", "avis");
            }

            // Guarda les assignacions si hi canvien (sanejan el que s'hagi escrit)
            $("#assignacions").on("change keyup paste", function () {
                GM_setValue("assignacions", this.value.trim().replace(/\s+/g, " ").replace(/\s(\d{7})/g, "\n$1"));
            });

        } else if (window.location.pathname == "/group/members.php") { // pàgina per afegir/suprimir usuaris a un grup

            // Prepara les dades amb les que es treballarà
            var grup = $("#region-main h3").text().substr(27).replace(/\s+/g, " "); // omet el text inicial: "Afegeix/suprimeix usuaris: "
            assignacions = " " + GM_getValue("assignacions").replace(/\s+/g, " ") + " ";
            var usuarisTrobats = 0;

            // Recorre la llista d'usuaris que es poden afegir al grup (inclou profes i coordinadors!)
            var infoUsuariRE = /^.+\s\((\d{7}), .+\)\s\(\d\d?\)$/; // format: nom i cognoms (#######, correu) (#)
            $("#addselect option").each(function () {

                // Prepara les dades amb les que es treballarà
                var usuari = $(this);
                var numeroUdG = infoUsuariRE.exec(usuari.text().trim())[1];

                // Cerca a les assignacions, seleccionant els usuaris que es volen assignar a aquest grup
                if (assignacions.indexOf(` ${numeroUdG} ${grup} `) > -1) {
                    usuari.prop("selected", true);
                    usuarisTrobats++;
                }
            });

            // Notifica quans usuaris ha trobat i seleccionat
            if (usuarisTrobats > 0) {
                notificacio("Nombre d'usuaris auto-seleccionats: " + usuarisTrobats);
            } else {
                notificacio("No s'ha trobat cap usuari per auto-seleccionar", "avis");
            }

        }
    });
})();
