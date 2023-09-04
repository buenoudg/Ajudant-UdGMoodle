// ==UserScript==
// @name         UdGMoodle: Afegir alumnes a grups
// @namespace    https://github.com/buenoudg/Ajudant-UdGMoodle
// @version      0.1.6
// @description  Eina per facilitar afegir alumnes als grups d'una assignatura del Moodle de la UdG
// @author       Antonio Bueno <antonio.bueno@udg.edu>
// @icon         https://raw.githubusercontent.com/buenoudg/Ajudant-UdGMoodle/master/udgmoodle_44x44.png
// @match        *://moodle2.udg.edu/group/index.php*
// @match        *://moodle2.udg.edu/group/members.php*
// @match        *://cursos.udg.edu/group/index.php*
// @match        *://cursos.udg.edu/group/members.php*
// @require      https://cdn.jsdelivr.net/npm/jquery@3/dist/jquery.min.js
// @require      https://cdn.jsdelivr.net/npm/toastify-js@1/src/toastify.min.js
// @resource     toastifyCSS https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// ==/UserScript==

/*
 * Versions:
 *  - 0.1.0 (2018-07-25) Refet des de zero per compatibilitat i per afegir notificacions
 *  - 0.1.1 (2018-07-26) Ara funciona amb grups que no tenen la "descripció" buida
 *  - 0.1.2 (2018-07-26) Afegida familia de fonts monoespaiades per a les assignacions
 *  - 0.1.3 (2018-07-28) Millors notificacions a la pàgina de gestió d'usuaris d'un grup
 *  - 0.1.4 (2018-07-28) Retocs estètics i simplificació del codi
 *  - 0.1.5 (2022-03-28) L'script ara també funciona al Moodle de la Fundació UdG
 *  - 0.1.6 (2023-09-04) Compatible amb Greasy Fork per fer més fàcil la distribució i actualització
 */

// les instruccions que es veuran al requadre #assignacions quan estigui buit
const instruccions =
`Enganxa aquí números UdG i el seu grup corresponent.

Exemple:
1987654 P.Inf-2
1976543 P.Inf-3
1965432 P.Inf-1
1954321 P.Inf-2

Després selecciona cada grup i prem el botó &quot;Afegeix/suprimeix usuaris&quot;`;

// #assignacions és el requadre on cal enganxar la llista de números UdG i grups
const assignacionsCSS = 
`#assignacions {
    background-color: #FFE;
    font-family: Consolas, monaco, monospace !important;
    height: 22.6em; margin-top: 0.3em
}`
const assignacionsHTML = 
`<div class="col-md-2 span2">
<span><span class="fa fa-wrench"></span>Ajudant Moodle</span>
<textarea autofocus id="assignacions" placeholder="${instruccions}" spellcheck="false">
</textarea>
</div>`;

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
                icona = '⚠';
                break;
            case "error":
                color = "rgba(201, 51, 51, 0.8)";
                icona = '❌';
                break;
            case "hola":
                color = "rgba(51, 153, 51, 0.8)";
                icona = '🛠';
                break;
            default:
                color = "rgba(51, 51, 153, 0.8)";
                icona = 'ℹ';
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
        var assignacions;
        if (window.location.pathname == "/group/index.php") { // gestió dels grups

            // Fa notar que l'script està funcionant
            notificacio("UdGMoodle: Afegir alumnes a grups", "hola");

            // El requadre #assignacions és on cal enganxar les dades
            // Format: un número UdG i un nom de grup, separats per un espai en blanc, a cada línia
            GM_addStyle(assignacionsCSS);
            $("div.groupmanagementtable div.row").append(assignacionsHTML)
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

            // Guarda les assignacions si hi canvien
            $("#assignacions").on("change keyup paste", function () {
                // Abans de guardar-les, es simplifica l'espai en blanc del text introduït
                GM_setValue("assignacions", 
                    this.value.trim().replace(/\s+/g, " ").replace(/\s(\d{7})/g, "\n$1"));
            });

            // Oblida el nombre d'usuaris inscrits a l'últim grup gestionat
            GM_deleteValue("usuarisInscrits");

        } else if (window.location.pathname == "/group/members.php") { // gestió d'usuaris d'un grup

            // Cal haver introduït prèviament dades a la pàgina de gestió de grups
            if (GM_getValue("assignacions")=="") {
                notificacio("No hi ha dades amb les que treballar!", "error");
            }

            // Prepara les dades amb les que es treballarà
            var grup = $("#maincontent+h3").text().substr(27).replace(/\s+/g, " "); // omet el text "Afegeix/suprimeix usuaris: "
            assignacions = " " + GM_getValue("assignacions").replace(/\s+/g, " ") + " ";
            var usuarisTrobats = 0;

            // Recorre la llista d'usuaris que es poden afegir al grup (inclou profes i coordinadors!)
            var infoUsuariRE = /^.+\s\((\d{7}),\s.+\)\s\(\d\d?\)$/; // cognoms nom (#######, correu) (#)
            $("#addselect option:enabled").each(function () {

                // Prepara les dades amb les que es treballarà
                var usuari = $(this);
                var numeroUdG = infoUsuariRE.exec(usuari.text().trim())[1];

                // Cerca a les assignacions, seleccionant els usuaris a assignar a aquest grup
                if (assignacions.indexOf(` ${numeroUdG} ${grup} `) > -1) {
                    usuari.prop("selected", true);
                    usuarisTrobats++;
                }
            });

            // Notifica quants usuaris s'acaben d'afegir a aquest grup
            var usuarisInscrits = $("#removeselect option:enabled").length;
            var usuarisAfegits = usuarisInscrits - GM_getValue("usuarisInscrits"); // pot ser NaN!
            if (usuarisInscrits != GM_getValue("usuarisInscrits")) {
                if (usuarisAfegits > 0) {
                    notificacio("Nombre d'usuaris afegits: " + usuarisAfegits);
                } else if (usuarisAfegits < 0) {
                    notificacio("Nombre d'usuaris suprimits: " + -usuarisAfegits);
                }
                // Actualitza el nombre d'usuaris inscrits a aquest grup
                GM_setValue("usuarisInscrits", usuarisInscrits);
            }

            // Notifica quants usuaris ha trobat i seleccionat
            if (usuarisTrobats > 0) {
                notificacio("Nombre d'usuaris auto-seleccionats: " + usuarisTrobats);
            } else if ((usuarisAfegits == 0) || isNaN(usuarisAfegits)) {
                // Això no es fa si s'en acaben d'afegir o suprimir usuaris
                notificacio("No s'ha trobat cap usuari per auto-seleccionar", "avis");
            }

        }
    });
})();
