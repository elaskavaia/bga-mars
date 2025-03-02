// ==UserScript==
// @name         Bug report canned replies (mars)
// @namespace    https://boardgamearena.com/
// @version      0.4
// @description  select canned reply
// @author       elaskavaia
// @match        https://boardgamearena.com/bug?id=*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=boardgamearena.com
// @run-at document-idle
// @grant        none
// ==/UserScript==

function addButtons() {
  // Your code here...
  //debugger;
  let table = [
    {
      title: "Rules => notabug",
      text: `Thanks you for reporting the issue of possible rule violation. However at this point its very unlikey that this is a unique issue.
    It will be closed automatically unless you provide evidence in the report itself - which is either text of game log or screenshot.
    Use Copy Log button (when clicking on gear button) to generate log and game situation details.

    These are common cases of rules misinterpretation:
    - Event tags are not counted
    - No more then 3 milestones can be claimed (out of 5)
    - No milestone can be claimed in solo game
    - Placing forest after last generation does not increase oxygen
    - Some cards effects violate the common rules - please READ the text on the card before submitting bug about specific card
    - Production reduction is MANDATORY
    - Removing resources to activate card is MANDATORY (i.e. Ants)
    - Removing animals/microbes is not possible from PETs or when your opponent has Protected Habitats in play
    - Search for life has 3 point max - either you found it or not, every microb your found does not count
    Some misinterpretation of game interface:
    - Game does apply all discounts automatically, you see discounted price
    - Undo undoes both actions
    - You can do some action which seems to be unreasonable (such as spending 8 heat when temperature is at max). This move is allowed by the rules and can be legally played as a stalling technique.
    `,
      resolution: "notabug",
      acton: "change_bug_status"
    },
    {
      title: "Limitation",
      text: `Thanks you for reporting the issue of possible rule violation. This is current limitation of the adaptation. The limitations are:
    - Some cards shows as playable but when you try to play them you receive errors (means they are not really playable)
    - You cannot chose exact order of some effects
    - You cannot chose Draw effects to resolved first before some more complex effects
    - Undo undoes both actions
    - You cannot undo when you are the last player to take an action in multiplayer state (i.e. setup, draft, research)
    - Live scoring: points do not update instantly, only end of player turn (especially adding resources)
    `,
      resolution: "wontfix",
      acton: "change_bug_status"
    },
    {
      title: "Screenshot=> infoneeded",
      text: "Insufficient information. We need log details with move number and screenshot",
      resolution: "infoneeded",
      acton: "change_bug_status"
    },
    {
      title: "Insufficient",
      text: "Insufficient information",
      resolution: "wontfix",
      acton: "change_bug_status"
    },
    {
      title: "StackTrace => infoneeded",
      text: "We need your help to diagnose this issue. If you runninig on desktop browser open dev-tools (usually F12) and copy stack trace of exception/error from Console tab into this bug report",
      resolution: "infoneeded",
      acton: "change_bug_status"
    },
    {
      title: "Environment => infoneeded",
      text: "This is not a common issue - please provide details about your environment: Mobile or Desktop, for Mobile exact model and version of device, for Desktop os and version of your computer. Also browser type and version, and your country and language",
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
      text: `This is probably fixed, there are no reports in a while
          `,
      resolution: "worksforme",
      acton: "change_bug_status"
    },
    {
      title: "Fixed in version => fixed",
      text: "Fixed in latest version",
      resolution: "fixed",
      acton: "change_bug_status"
    },
    {
      title: "Translation => wontfix",
      text: `Thanks you for reporting the issue, however its not a language we can understand. If you want this issue to be addressed please create a bug report in English`,
      resolution: "wontfix",
      acton: "change_bug_status"
    },
    {
      title: "Chromium bug",
      text: `This was Chromium bug fixed in  133.0.6943.89 or later (affects all Chromium based browsers on mobile or laptop with power save modes).
               See forum thread https://boardgamearena.com/forum/viewtopic.php?t=41166
               There is no fix in the game, please update the browser or wait for this update.
               `,
      resolution: "fixed",
      acton: "change_bug_status"
    },
    {
      title: "Timout",
      text: `
          [BGA_NOTIF_TIMEOUT] This is a framework issue which I cannot fix in the game, I am bugging bga team about it weekly...
There is notification timeout that cause some notification to be dropped,
and some of them are important such as one that changes the activate player state on mainsite (which keeps separate state of players, its not just in the game).
When occurs, the active player does not receive notification and both player thinks it the other players turn. If you playing turn based game - it may re-synchronise itself in few hours.
I don't know how to solve this in real time game, but just refresh (F5) if your opponent seems to think too long may help.
          `,
      resolution: "open",
      acton: "change_bug_status"
    },
    {
      title: "Friendly",
      text: `
          This is a framework design limitation, I cannot fix it. If you select friendly game, you cannot kick the other player out and it does not time out. You can exit yourself without penalties.
          `,
      resolution: "wontfix",
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

    a.addEventListener(
      "click",
      (event) => {
        report_log.innerHTML += " " + text;
      },
      false
    );
  }
}

(function () {
  "use strict";

  addButtons();
})();
