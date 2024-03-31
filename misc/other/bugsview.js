// ==UserScript==
// @name         BGA bug report view
// @namespace    https://boardgamearena.com/
// @version      0.1
// @description  makes bug link open new window
// @author       elaskavaia
// @match        https://boardgamearena.com/bugs?*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=boardgamearena.com
// @run-at document-idle
// @grant        none
// ==/UserScript==


function updateBugs(){
    console.log("BGA bug report view");
    // Your code here...
    const node = document.querySelector("#buglist_inner");
    node.addEventListener ('DOMNodeInserted', onNodeInserted, false);
}

function onNodeInserted (event) {
    var row = event.target;

    row.querySelectorAll(".bugrow a").forEach(node=>{
        node.target="_blank"; // bugs should open in new window
    });
}

(function() {
    'use strict';

    setTimeout(updateBugs, 500);
})();