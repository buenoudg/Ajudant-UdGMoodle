// ==UserScript==
// @name            Participants: Llistats d'estudiants
// @name:ca         Participants: Llistats d'estudiants
// @name:en         Participants: Students' lists
// @name:es         Participantes: Listados de estudiantes
// @version         0.6.0
// @author          Antonio Bueno <antonio.bueno@udg.edu>
// @description     Generates student/group and student/teacher lists
// @description:ca  Genera llistats estudiant/grup i estudiant/professor
// @description:en  Generates student/group and student/teacher lists
// @description:es  Genera listados estudiante/grupo y estudiante/profesor
// @license         MIT
// @namespace       https://github.com/buenoudg/Ajudant-UdGMoodle
// @supportURL      https://github.com/buenoudg/Ajudant-UdGMoodle/issues
// @match           https://moodle2.udg.edu/user/index.php?*
// @icon            https://raw.githubusercontent.com/buenoudg/Ajudant-UdGMoodle/master/udgmoodle_icon_38x38@2x.png
// @require         https://cdn.jsdelivr.net/npm/jquery@3/dist/jquery.min.js
// @require         https://cdn.jsdelivr.net/npm/toastify-js@1/src/toastify.min.js
// @resource        toastifyCSS https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css
// @grant           GM_addStyle
// @grant           GM_getResourceText
// ==/UserScript==

(function () {
    "use strict";

    let courseId, roles, groups, fullListUrl; // defined once we have the DOM

    const locales = { // localization of text in buttons and downloaded file names
        "ca": {
            "ALL_TEXT": "Mostra'ls tots",
            "SGL_TEXT": "Llistat estudiant/grup",
            "SPL_TEXT": "Llistat estudiant/professor",
            "SGL_FILE": "estudiant_grup",
            "SPL_FILE": "estudiant_professor"
        },
        "en": {
            "ALL_TEXT": "Show them all",
            "SGL_TEXT": "Student/group list",
            "SPL_TEXT": "Student/professor list",
            "SGL_FILE": "student_group",
            "SPL_FILE": "student_professor"
        },
        "es": {
            "ALL_TEXT": "Mostrarlos todos",
            "SGL_TEXT": "Listado estudiante/grupo",
            "SPL_TEXT": "Listado estudiante/profesor",
            "SGL_FILE": "estudiante_grupo",
            "SPL_FILE": "estudiante_profesor"
        },
    };
    const locale = locales[navigator.language.slice(0, 2)] || locales.en;

    const tableToCsvDataUrl = (table) => { // used to generate the downloadable files
        const decimalDelimiter = new Intl.NumberFormat(Navigator.language).format(1.1).charAt(1);
        const csv = table.map(row => row.join(decimalDelimiter == "." ? "," : ";")).join("\r\n");
        return `data:text/csv;charset=utf-8,\uFEFF${encodeURIComponent(csv)}`; // MS Excel needs the \uFEFF
    };

    const mostCommonValue = (list) => { // used to determine the student's role name
        const histogram = list.reduce((sum, i) => Object.assign(sum, { [i]: (sum[i] | 0) + 1 }), {});
        return Object.keys(histogram).find(key => histogram[key] == Math.max(...Object.values(histogram)));
    };

    const getSelectOptions = (selector) => // used to determine grup and role IDs and names
        [...document.querySelectorAll(`${selector} option`)].reduce((ob, op) => (ob[op.value] = op.text, ob), {});

    const getUserData = () => { // used to extract all the relevant data from the main table
        let users = [];
        $("#participants tbody tr").not(".emptyrow").each(function () {
            const $nameColumn = $(this).find("th"); // usually the first column, but it depends on permissions
            users.push({
                "name": $nameColumn.text().trim(),
                "id": $nameColumn.next().text().trim(),
                "mail": $nameColumn.next().next().text().trim(),
                "role": roles[$nameColumn.next().next().next().find("span").data().value],
                "groups": $nameColumn.next().next().next().next().find("span").data().value.map(id => groups[id]),
            });
        });
        return users;
    };

    const updateLists = () => { // called everytime the table changes

        // (Re-)generate the lists
        let users = getUserData(), obj;
        const studentRole = mostCommonValue(users.map(user => user.role));
        const professors = users.filter(user => user.role && (user.role != studentRole) && user.groups.length);
        let classGroups = {}; // groups where some professor is a member
        professors.forEach(function (professor) { // TODO: do this the functional way
            professor.groups.forEach(function (group) {
                if (!classGroups[group]) classGroups[group] = [];
                classGroups[group].push([professor.name, professor.id]);
            });
        });
        const students = users.filter(user => user.role == studentRole);
        const SGList = students.map(student => student.groups
            .map(group => [courseId, student.name, student.id, student.mail, group])
        ).flat();
        const SPList = students.map(student => student.groups
            .filter(group => group in classGroups).map(group => classGroups[group]
                .map(professor => [courseId, student.name, student.id, professor]
                    .flat())).flat()).flat().filter((obj = {}, item => !(obj[item] = item in obj)));

        // Also update the UdGMoodle buttons
        if (!$("#udgmoodle_buttons").length) { // button container
            $("h2+div").prepend('<div id="udgmoodle_buttons">');
        }
        $("#udgmoodle_buttons .showall, #udgmoodle_buttons .sglist, #udgmoodle_buttons .splist").remove();
        if ($("nav.pagination").length) { // not the full list? link to it
            $("#udgmoodle_buttons").append(`<a class="showall" href="${fullListUrl}">${locale.ALL_TEXT}</a>`);
        } else { // already in the full list
            if (SGList.length) {
                $("#udgmoodle_buttons").append(`<a class="sglist" download="${courseId}_${locale.SGL_FILE}.csv"
                    href="${tableToCsvDataUrl(SGList)}">${locale.SGL_TEXT}</a>`);
            }
            if (SPList.length) {
                $("#udgmoodle_buttons").append(`<a class="splist" download="${courseId}_${locale.SPL_FILE}.csv"
                    href="${tableToCsvDataUrl(SPList)}">${locale.SPL_TEXT}</a>`);
            }
        }

    };

    // CSS for the UdGMoodle buttons
    GM_addStyle('' + `
        #udgmoodle_buttons { text-align: right; width: 100% }
        #udgmoodle_buttons a { background-color: steelblue; border-radius: 1.2em; color: white; display: inline-block;
            margin: 4px 8px 0 0; padding: 0.425rem 1.25rem; text-decoration: none !important }
        #udgmoodle_buttons a:hover { color: white; text-shadow: 1px 1px 2px black }
    `);

    /*
     * DOM manipulation courtesy of jQuery
     */

    // Modifications applied once the DOM has been build (images may be still loading)
    $(document).ready(function () {

        // Makes clear what script is running and its version
        notification(GM.info.script.name + " " + GM.info.script.version, "hello", 3);

        // Watches for changes in the page's main table
        const targetNode = document.getElementById("participantsform"); // node to watch
        const config = { attributes: false, childList: true, subtree: true }; // observer parameters
        const callback = (mutationList) => { // called when changes are detected
            for (const mutation of mutationList) {
                clearTimeout(timer);
                timer = setTimeout(updateLists, 100); // limit calls to ten times per second
            }
        };
        const observer = new MutationObserver(callback); // associate the callback to an observer
        observer.observe(targetNode, config); // start monitoring the target for changes

        // Some static details from the DOM
        courseId = document.title.split("/")[0];
        roles = getSelectOptions("select[data-field-name='roles']");
        groups = getSelectOptions("select[data-field-name='groups']");
        fullListUrl = String(document.location).replace(/(&perpage=\d+|perpage=\d+&)/img, "") + "&perpage=5000";

        // Initial list generation
        let timer = setTimeout(updateLists);

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
        Toastify({
            text: icon + " " + message, duration: timeout * 1000, gravity: "bottom", style: { background: color }
        }).showToast();
    }

})();
