// ==UserScript==
// @name        UdGMoodle Printable Quiz
// @version     0.2
// @author      Antonio Bueno
// @namespace   antonio.bueno@udg.edu
// @match       https://moodle2.udg.edu/mod/quiz/attempt.php*
// @icon        https://raw.githubusercontent.com/buenoudg/Ajudant-UdGMoodle/master/udgmoodle_44x44.png
// @require     https://cdn.jsdelivr.net/npm/jquery@3/dist/jquery.min.js
// @require     https://cdn.jsdelivr.net/npm/toastify-js
// @resource    toastifyCSS https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css
// @grant       GM.getResourceUrl
// ==/UserScript==

// jshint esversion:11

(function () {
    "use strict";

    /*
     * DOM manipulations courtesy of jQuery
     */

    // Modificacions are applied once the DOM has been build (images may be still loading)
    $(document).ready(function () {

        // Makes clear the script is running
        notification(GM.info.script.name, "hello", 3);

        // Technical info to console
        console.log(GM.info);

        $('#mod_quiz_navblock').prepend('<button id="printable">Fes-ho imprimible');
        $('#printable').on('click', function () {
            $('body').prepend($('#region-main'));
            $('#responseform').prepend('<div class="que"><div class="formulation"><p contenteditable="true"><i>Text editable');
            // Extra CSS
            let stylesheet = document.createElement("style");
            stylesheet.textContent = `
                nav, #nav-drawer, #nav-drawer-footer, .activity-navigation,
                #page-wrapper, #top-footer, .que .info, .submitbtns, .multichoice .prompt { display: none !important }

                body, .que .content { margin: 0 }
                #region-main>.card { border: none }
                .card-body { padding: 0 !important }
                .que { margin: 1em auto }
                .que .qtext { margin-bottom: 0.5em }

                body { counter-reset: question }
                .que .qtext::before { counter-increment: question; content: counter(question) ". "; font-weight: bold }
            `; // numbered questions
            document.documentElement.appendChild(stylesheet);
        });

    });

    // External CSS files
    (async function () {
        // Toastify CSS
        let externalFileURL = await GM.getResourceUrl("toastifyCSS");
        stylesheet = document.createElement("link");
        stylesheet.setAttribute("rel", "stylesheet");
        stylesheet.setAttribute("href", externalFileURL);
        document.documentElement.appendChild(stylesheet);
    })();

    // Inline CSS
    let stylesheet = document.createElement("style");
    stylesheet.textContent = `
        div.toastify { margin: inherit; padding-bottom: 20px; width: inherit; font-family:
            -apple-system,system-ui,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif; }
        #printable::before { content: "🖨 "; font-size: 200%; position: relative; top: 0.1em }
        #printable { border-color: lightgrey darkgrey darkgrey lightgrey; padding: 0em 1em 0.5em }
    `;
    document.documentElement.appendChild(stylesheet);

    /*
     * Notifications courtesy of Toastify JS (see https://apvarun.github.io/toastify-js/)
     */

    function notification(message, type = "info", timeout = 5) {
        // The "type" parameter accepts four values: "info", "warning", "error" and "hello"
        // The "timeout" parameter is expressed in seconds although Toastify uses milliseconds
        let color, icon;
        switch (type) {
            case "warning":
                color = "rgba(201, 201, 0, 0.8)";
                icon = '⚠️';
                break;
            case "error":
                color = "rgba(201, 51, 51, 0.8)";
                icon = '🛑';
                break;
            case "hello":
                color = "rgba(51, 153, 51, 0.8)";
                icon = '👋🏼';
                break;
            default:
                color = "rgba(51, 51, 153, 0.8)";
                icon = 'ℹ️';
        }
        Toastify({
            text: icon + " " + message,
            duration: timeout * 1000,
            gravity: "bottom",
            style: {
                background: color,
            }
        }).showToast();
    }

})();