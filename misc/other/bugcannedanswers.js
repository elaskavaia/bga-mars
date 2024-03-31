// ==UserScript==
// @name         Bug report canned replies (mars)
// @namespace    https://boardgamearena.com/
// @version      0.2
// @description  select canned reply
// @author       elaskavaia
// @match        https://boardgamearena.com/bug?id=*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=boardgamearena.com
// @run-at document-idle
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  // Your code here...
  //debugger;
  let table = [
    {
      title: "Rules => notabug",
      text: `Thanks you for reporting the issue of possible rule violation. However at this point its very unlikey that this is a unique issue.
      It will be closed automatically unless you provide evidence in the report itself - which is either text of game log or screenshot.
      These are common cases of rules misinterpretation:
      - Event tags are not counted
      - No more then 3 minlestones can be claimed (out of 5)
      - No milestone can be claimed in solo game
      - Placing forest after last generation does not increase oxygen
      - Some cards effects violate the common rules - please READ the text on the card before submitting bug about specific card
      - Production reduction is MANDATORY
      - Removing resources to activate card is MANDATORY (i.e. Ants)
      Some misinterpretation of game interface:
      - Game does apply all discounts automatically, you see discounted price
      - Undo undoes both actions
      `,
      resolution: "notabug",
      acton: "change_bug_status"
    },
    {
      title: "Missing info => infoneeded",
      text: "Insufficient information. In addition to table number we need the move number and/or log details, also screenshot would be nice",
      resolution: "infoneeded",
      acton: "change_bug_status"
    },
    {
      title: "Planning to fix => confirmed",
      text: "Confirmed. Will be fixed in next release",
      resolution: "confirmed",
      acton: "change_bug_status"
    },
    {
      title: "See above => notabug",
      text: "Not a bug. See previous comment for the explanation",
      resolution: "notabug",
      acton: "change_bug_status"
    },
    {
      title: "Probably fixed => worksforme",
      text: "This is probably fixed, there are no reports in a while",
      resolution: "worksforme",
      acton: "change_bug_status"
    },
    {
      title: "Fixed in version => fixed",
      text: "Fixed in latest version",
      resolution: "fixed",
      acton: "change_bug_status"
    }
  ];
  let tools = document.querySelector("#moderator_quicktools .pagesection__content");
  tools.innerHTML += "<p>Canned answers:</p>";
  const report_log = document.getElementById("report_log");
  for (let i in table) {
    const id = `${table[i].acton}_${table[i].resolution}`;
    const a = document.createElement("a");
    a.id = id;
    a.classList.add("bgabutton", "bgabutton_blue", table[i].acton);
    a.innerHTML = table[i].title;
    tools.appendChild(a);
    tools.appendChild(document.createTextNode(" "));

    const text = table[i].text;

    a.addEventListener("click", (event) => {
      report_log.innerHTML += " " + text;
    });
  }
})();
