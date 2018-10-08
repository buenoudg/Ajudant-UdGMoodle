// ==UserScript==
// @name         UdGMoodle: Millorar llistat d'alumnes
// @namespace    https://github.com/buenoudg/Ajudant-UdGMoodle
// @version      0.2.0
// @description  Mostra millors fotos al llistat de participants, i facilita la seva còpia i impressió
// @author       Antonio Bueno <antonio.bueno@udg.edu>
// @icon         https://raw.githubusercontent.com/buenoudg/Ajudant-UdGMoodle/master/udgmoodle_44x44.png
// @match        *://moodle2.udg.edu/user/index.php*
// @require      https://cdn.jsdelivr.net/npm/jquery@3/dist/jquery.slim.min.js
// @require      https://cdn.jsdelivr.net/npm/toastify-js
// @resource     toastifyCSS https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css
// @grant        GM_addStyle
// @grant        GM_getResourceText
// ==/UserScript==

/*
 *  Versions:
 * - 0.1.0 (2017-11-20) Primera versió (idea i provador: JLM)
 * - 0.2.0 (2018-10-09) 1a versió pública. Script refet des de zero per compatibilitat i modularitat, així com per afegir notificacions.
 *
 * NOTA: Aquest script aprofita que UdGMoodle fa servir FontAwesome 4.7.0 (veure https://fontawesome.com/v4.7.0/icons/?d=gallery)
 */

// Configuració
var midaFoto = 75, // píxels
    brillantorExtra = 0.33,
    colorProfessor = "#EDC",
    colorCoordinador = "#CDE",
    colorSenseRol = "#F99";

// Les fotos es mostren més grans, més clares i dins un quadrat arrodonit (enlloc d'un cercle)
const cssFotos =
`#page-content img.userpicture {
    border-radius: 10%;
    height: ${midaFoto}px !important;
    width: ${midaFoto}px !important;
    filter: brightness(${1+brillantorExtra});
}
#page-content img.userpicture[src$=f3] {
    filter: brightness(1);
}`;
// Els participants no estudiants es marquen amb colors diferents
const cssLlista =
`#page-content tr.professor td, #page-content tr.professor-no-editor td {
    background-color: ${colorProfessor};
}
#page-content tr.coordinador td {
    background-color: ${colorCoordinador};
}
#page-content tr.sense-rols td {
    background-color: ${colorSenseRol};
}`;
// S'amaga tot el que no es vol imprimir
const cssImprimible =
`body.imprimible #page-header-wrapper,
body.imprimible #dock,
body.imprimible #navwrap,
body.imprimible #page-navbar,
body.imprimible #page-footer,
body.imprimible h2,
body.imprimible p,
body.imprimible div.initialbar,
body.imprimible div.buttons,
body.imprimible #participants tr th:first-child,
body.imprimible #participants tr td:first-child,
body.imprimible #participants tr th+th+th+th+th,
body.imprimible #participants tr td+td+td+td+td,
body.imprimible #participants img.icon,
body.imprimible .btn,
body.imprimible div.pull-right,
body.imprimible div.pull-right+form,
body.imprimible a.back-to-top {
    display: none !important;
}
body.imprimible #participants th, body.imprimible #participants td {
    border: 1px solid black;
}
`;

(function () {
    "use strict";

    /*
     * Les notificacions es fan amb Toastify JS (veure https://apvarun.github.io/toastify-js/)
     */

    GM_addStyle(GM_getResourceText("toastifyCSS") +
        ".toastify { border-radius: 4px; padding: 12px; z-index: 2 }" +
        ".fa-2x    { vertical-align: middle; margin-right: 0.33em }");

    function notificacio(missatge, tipus = "info", durada = 5) {
        // El paràmetre "tipus" admet quatre valors: "info", "avis", "error" i "hola"
        // El paràmetre "durada" s'expressa en segons tot i que Toastify fa servir mil·lisegons
        var color, icona;
        switch (tipus) {
            case "avis":
                color = "rgba(201, 201, 0, 0.8)";
                icona = '<span class="fa fa-2x fa-exclamation-triangle"></span>';
                break;
            case "error":
                color = "rgba(201, 51, 51, 0.8)";
                icona = '<span style="color:yellow"><span class="fa fa-2x fa-times-circle"></span>';
                break;
            case "hola":
                color = "rgba(51, 153, 51, 0.8)";
                icona = '<span class="fa fa-2x fa-wrench"></span>';
                break;
            default:
                color = "rgba(51, 51, 153, 0.8)";
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
     * Les manipulacions del DOM es fan amb la versió "slim" de jQuery
     */

    var $ = window.jQuery; // innecessari, però evita errors falsos a l'editor de Tampermonkey

    // Totes les modificacions es fan una vegada la pàgina s'ha carregat
    $(document).ready(function () {

        // Fa notar que l'script està funcionant
        notificacio("UdGMoodle: Millorar llistat d'alumnes", "hola");

        // Fotos més grans i clares, dins un quadrat arrodonit, i amb més qualitat
        GM_addStyle(cssFotos);
        $("#page-content img.userpicture").each(function() {
            $(this).attr("src", $(this).attr("src").replace(/\/f[12]/, "/f3"));
        });

        // PENDENT: Informació de rol i grup al títol de la pàgina
        // Per ara: Nom de l'assignatura al títol de la pàgina
        document.title = $("#sitetitle").text().replace("/", "-");

        // Mostra la llista completa de participants
        if (window.location.href.indexOf("&perpage=") < 0) {
            window.location.href = window.location.href.concat("&perpage=1000");
        } else if (window.location.href.indexOf("&perpage=1000") >= 0) {
            notificacio("UdGMoodle: Mostrant llistat complet");
        }

        // Marca amb colors diferents els participants no estudiants
        GM_addStyle(cssLlista);
        $("#participants td.c4").each(function() {
            var classRol = $(this).text().trim().toLowerCase().replace(/ /g, "-");
            $(this).parents("tr").addClass(classRol);
        });

        // Millor "Selecciona tot i copia"
        $("img").attr("alt", ""); // atributs buits per no aparèixer a la còpia
        $("#participants td.c7 div").css("display", "inline"); // no copiar com a nova línia

        // Botó per obtenir un llistat imprimible
        $("#enrolusersbutton-1 div").prepend('<button id="imprimible" class="btn"><span class="fa fa-print"></span> Llistat imprimible');
        $("#imprimible").on("click", function() {
            GM_addStyle(cssImprimible);
            $("body").addClass("imprimible").removeClass("has_dock");
            notificacio("UdGMoodle: Mostrant llistat imprimible");
            return false;
        });

    });
})();
