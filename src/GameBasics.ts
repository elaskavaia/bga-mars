// @ts-ignore
GameGui = /** @class */ (function () {
  function GameGui() {}
  return GameGui;
})();

/**
 * Class that extends default bga core game class with more functionality
 * Contains generally usefull features such as animation, additional utils, etc
 */

class GameBasics extends GameGui {
  laststate: string | undefined;
  pendingUpdate: boolean;
  currentPlayerWasActive: boolean;

  classActiveSlot: string = "active_slot";

  gamedatas_server: any; // copy of server state gamedatas
  defaultTooltipDelay: number = 400;
  defaultAnimationDuration: number = 500;
  _helpMode: boolean = false; // help mode where tooltip shown instead of click action
  _displayedTooltip: any = null; // used in help mode

  constructor() {
    super();
    console.log("game constructor");
    this.laststate = null;
    this.pendingUpdate = false;
  }

  setup(gamedatas: any) {
    console.log("Starting game setup", gamedatas);
    // add reload Css debug button
    var parent = document.querySelector(".debug_section");
    if (parent) {
      var butt = dojo.create("a", { class: "bgabutton bgabutton_gray", innerHTML: "Reload CSS" }, parent);
      dojo.connect(butt, "onclick", () => reloadCss());
    }
    this.setupNotifications();
  }

  // state hooks
  onEnteringState(stateName: string, args: { args: any } | null) {
    console.log("onEnteringState: " + stateName, args);
    this.laststate = stateName;

    // Call appropriate method
    args = args ? args.args : null; // this method has extra wrapper for args for some reason
    var methodName = "onEnteringState_" + stateName;
    this.onEnteringState_before(stateName, args);
    this.callfn(methodName, args);

    if (this.pendingUpdate) {
      this.onUpdateActionButtons(stateName, args);
    }
  }
  onEnteringState_before(stateName: string, args: any) {
    // to override
  }

  onLeavingState(stateName: string): void {
    console.log("onLeavingState: " + stateName);
    this.disconnectAllTemp();
    this.removeAllClasses(this.classActiveSlot);
  }

  onUpdateActionButtons(stateName: string, args: any) {
    if (this.laststate != stateName) {
      // delay firing this until onEnteringState is called so they always called in same order
      this.pendingUpdate = true;
      return;
    }
    this.pendingUpdate = false;
    this.onUpdateActionButtons_before(stateName, args);
    if (this.isCurrentPlayerActive()) {
      console.log("onUpdateActionButtons: " + stateName, args);
      // Call appropriate method
      this.callfn("onUpdateActionButtons_" + stateName, args);
    }
    this.onUpdateActionButtons_after(stateName, args);
  }

  onUpdateActionButtons_before(stateName: string, args: any) {}

  onUpdateActionButtons_after(stateName: string, args: any) {
    if (this.isCurrentPlayerActive()) {
      if (this.on_client_state && !$("button_cancel")) {
        this.addActionButton("button_cancel", _("Cancel"), "onCancel", null, false, "red");
      }
    }
  }

  /**
   *
   * @param {string} methodName
   * @param {object} args
   * @returns
   */
  callfn(methodName: string, args: any) {
    if (this[methodName] !== undefined) {
      console.log("Calling " + methodName);
      return this[methodName](args);
    }
    return undefined;
  }

  ajaxcallwrapper(action: string, args?: any, handler?: (err: any) => void) {
    if (this.checkAction(action)) {
      if (!args) {
        args = {};
      }
      if (args.lock === false) {
        delete args.lock;
      } else {
        args.lock = true;
      }
      let gname = this.game_name;
      let url = `/${gname}/${gname}/${action}.html`;

      this.ajaxcall(url, args, this, (result) => {}, handler);
    }
  }

  /**
   * This execute a specific action called userAction via ajax and passes json as arguments
   * However php action check will be on "action" and corresponding php method will be called from game.php side
   * @param action
   * @param args
   * @param handler
   */
  ajaxuseraction(action: string, args?: any, handler?: (err: any) => void) {
    if (this.checkAction(action)) {
      let gname = this.game_name;
      let url = `/${gname}/${gname}/userAction.html`;
      this.ajaxcall(
        url,
        { call: action, lock: true, args: JSON.stringify(args ?? {}) }, //
        this,
        (result) => {},
        handler
      );
    }
  }

  onCancel(event?: Event) {
    if (event) dojo.stopEvent(event);
    this.cancelLocalStateEffects();
  }

  restoreServerData() {
    if (typeof this.gamedatas.gamestate.reflexion.initial != "undefined") {
      this.gamedatas_server.gamestate.reflexion.initial = this.gamedatas.gamestate.reflexion.initial;
      this.gamedatas_server.gamestate.reflexion.initial_ts = this.gamedatas.gamestate.reflexion.initial_ts;
    }
    this.gamedatas = dojo.clone(this.gamedatas_server);
  }

  updateCountersSafe(counters: {}) {
    // console.log(counters);
    var safeCounters = {};
    for (var key in counters) {
      if (counters.hasOwnProperty(key) && $(key)) {
        safeCounters[key] = counters[key];
        const node = $(key);
        if (node) node.innerHTML = counters[key].counter_value;
      } else {
        console.log("unknown counter " + key);
      }
    }
    this.updateCounters(safeCounters);
  }

  cancelLocalStateEffects() {
    this.disconnectAllTemp();
    this.restoreServerData();
    this.updateCountersSafe(this.gamedatas.counters);
    this.restoreServerGameState();
  }

  // ANIMATIONS

  /**
   * This method will remove all inline style added to element that affect positioning
   */
  stripPosition(token) {
    // console.log(token + " STRIPPING");
    // remove any added positioning style
    token = $(token);
    for (const key of ["display", "top", "left", "position", "opacity", "bottom", "right"]) {
      $(token).style.removeProperty(key);
    }
  }

  /**
   * This method will attach mobile to a new_parent without destroying, unlike original attachToNewParent which destroys mobile and
   * all its connectors (onClick, etc)
   */
  attachToNewParentNoDestroy(
    mobile_in: ElementOrId,
    new_parent_in: ElementOrId,
    relation?: string,
    mobileStyle?: any
  ): { top: number; left: number } {
    //console.log("attaching ",mobile,new_parent,relation);
    const mobile = $(mobile_in);
    const newParent = $(new_parent_in);

    if (mobile === null) {
      console.error("attachToNewParentNoDestroy: mobile is null");
      return;
    }
    if (newParent === null) {
      console.error("attachToNewParentNoDestroy: newParent is null");
      return;
    }

    mobile.style.transition = "none"; // disable transition during reparenting
    var src = mobile.getBoundingClientRect();
    dojo.place(mobile, newParent, relation); // XXX dojo
    setStyleAttributes(mobile, mobileStyle);
    mobile.offsetTop; //force re-flow

    var tgt = mobile.getBoundingClientRect();
    var targetParent = mobile.offsetParent.getBoundingClientRect();
    //  console.log(src, tgt, targetParent);

    var left = src.x - targetParent.x;
    var top = src.y - targetParent.y;

    mobile.style.position = "absolute";
    mobile.style.left = left + "px";
    mobile.style.top = top + "px";
    mobile.offsetTop; //force re-flow
    mobile.style.removeProperty("transition"); // restore transition

    var box: any = {};
    box.left = tgt.left - targetParent.left;
    box.top = tgt.top - targetParent.top;

    return box;
  }
  /*
   * This method is similar to slideToObject but works on object which do not use inline style positioning. It also attaches object to
   * new parent immediately, so parent is correct during animation
   */
  slideToObjectRelative(
    tokenId: ElementOrId,
    finalPlace: ElementOrId,
    duration?: number,
    delay?: number,
    onEnd?: (node: Element) => void,
    relation?: string,
    mobileStyle?: StringProperties
  ): void {
    const mobileNode = $(tokenId) as HTMLElement;

    duration = duration ?? this.defaultAnimationDuration;
    this.delayedExec(
      () => {
        mobileNode.classList.add("moving_token");

        if (!mobileStyle) {
          mobileStyle = {
            position: "relative",
            top: "0px",
            left: "0px",
          };
        }

        var box = this.attachToNewParentNoDestroy(mobileNode, finalPlace, relation, mobileStyle);
        mobileNode.style.transition = "all " + duration + "ms ease-in-out";
        mobileNode.style.left = box.left + "px";
        mobileNode.style.top = box.top + "px";
      },
      () => {
        mobileNode.style.removeProperty("transition");
        this.stripPosition(mobileNode);
        mobileNode.classList.remove("moving_token");
        setStyleAttributes(mobileNode, mobileStyle);
        if (onEnd) onEnd(mobileNode);
      },
      duration,
      delay
    );
  }
  slideToObjectAbsolute(
    tokenId: ElementOrId,
    finalPlace: ElementOrId,
    x: number,
    y: number,
    duration?: number,
    delay?: number,
    onEnd?: (node: Element) => void,
    relation?: string,
    mobileStyle?: StringProperties
  ): void {
    const mobileNode = $(tokenId);
    duration = duration ?? this.defaultAnimationDuration;
    this.delayedExec(
      () => {
        mobileNode.classList.add("moving_token");

        if (!mobileStyle) {
          mobileStyle = {
            position: "absolute",
            left: x + "px",
            top: y + "px",
          };
        }
        this.attachToNewParentNoDestroy(mobileNode, finalPlace, relation, mobileStyle);

        mobileNode.style.transition = "all " + duration + "ms ease-in-out";
        mobileNode.style.left = x + "px";
        mobileNode.style.top = y + "px";
      },
      () => {
        mobileNode.style.removeProperty("transition");
        mobileNode.classList.remove("moving_token");
        setStyleAttributes(mobileNode, mobileStyle);
        if (onEnd) onEnd(mobileNode);
      },
      duration,
      delay
    );
  }

  delayedExec(onStart: () => void, onEnd?: () => void, duration?: number, delay?: number) {
    if (duration === undefined) {
      duration = 500;
    }
    if (delay === undefined) {
      delay = 0;
    }
    if (this.instantaneousMode) {
      delay = Math.min(1, delay);
      duration = Math.min(1, duration);
    }
    if (delay) {
      setTimeout(function () {
        onStart();
        if (onEnd) {
          setTimeout(onEnd, duration);
        }
      }, delay);
    } else {
      onStart();
      if (onEnd) {
        setTimeout(onEnd, duration);
      }
    }
  }

  slideAndPlace(
    token: ElementOrId,
    finalPlace: ElementOrId,
    tlen?: number,
    mobileStyle?: StringProperties,
    onEnd?: (node?: HTMLElement) => void
  ) {
    if ($(token).parentNode == $(finalPlace)) return;

    this.phantomMove(token, finalPlace, tlen, mobileStyle, onEnd);
  }

  getFulltransformMatrix(from: Element, to: Element) {
    let fullmatrix = "";
    let par = from;

    while (par != to && par != null && par != document.body) {
      var style = window.getComputedStyle(par as Element);
      var matrix = style.transform; //|| "matrix(1,0,0,1,0,0)";

      if (matrix && matrix != "none") fullmatrix += " " + matrix;
      par = par.parentNode as Element;
      // console.log("tranform  ",fullmatrix,par);
    }

    return fullmatrix;
  }

  projectOnto(from: ElementOrId, postfix: string, ontoWhat?: ElementOrId) {
    const elem: Element = $(from);
    let over: Element;
    if (ontoWhat) over = $(ontoWhat);
    else over = $("oversurface"); // this div has to exists with pointer-events: none and cover all area with high zIndex
    var par = elem.parentNode;
    var elemRect = elem.getBoundingClientRect();

    //console.log("elemRect", elemRect);

    var newId = elem.id + postfix;
    var old = $(newId);
    if (old) old.parentNode.removeChild(old);

    var clone = elem.cloneNode(true) as HTMLElement;
    clone.id = newId;
    clone.classList.add("phantom");
    clone.classList.add("phantom" + postfix);

    var fullmatrix = this.getFulltransformMatrix(elem.parentNode as Element, over.parentNode as Element);

    over.appendChild(clone);
    var cloneRect = clone.getBoundingClientRect();

    const centerY = elemRect.y + elemRect.height / 2;
    const centerX = elemRect.x + elemRect.width / 2;
    // centerX/Y is where the center point must be
    // I need to calculate the offset from top and left
    // Therefore I remove half of the dimensions + the existing offset
    const offsetX = centerX - cloneRect.width / 2 - cloneRect.x;
    const offsetY = centerY - cloneRect.height / 2 - cloneRect.y;

    // Then remove the clone's parent position (since left/top is from tthe parent)
    //console.log("cloneRect", cloneRect);

    // @ts-ignore
    clone.style.left = offsetX + "px";
    clone.style.top = offsetY + "px";
    clone.style.transform = fullmatrix;

    return clone;
  }

  phantomMove(
    mobileId: ElementOrId,
    newparentId: ElementOrId,
    duration?: number,
    mobileStyle?: StringProperties,
    onEnd?: (node?: HTMLElement) => void
  ) {
    var mobileNode = $(mobileId) as HTMLElement;
    if (!mobileNode) throw new Error(`Does not exists ${mobileId}`);
    var newparent = $(newparentId);
    if (!newparent) throw new Error(`Does not exists ${newparentId}`);
    if (!duration) duration = this.defaultAnimationDuration;
    if (duration <= 0 || !mobileNode.parentNode) {
      newparent.appendChild(mobileNode);
      return;
    }
    var clone = this.projectOnto(mobileNode, "_temp");
    mobileNode.style.opacity = "0"; // hide original
    newparent.appendChild(mobileNode); // move original
    setStyleAttributes(mobileNode, mobileStyle);
    mobileNode.offsetHeight; // recalc

    var desti = this.projectOnto(mobileNode, "_temp2"); // invisible destination on top of new parent
    setStyleAttributes(desti, mobileStyle);
    clone.style.transitionProperty = "all";
    clone.style.transitionDuration = duration + "ms";
    // that will cause animation
    clone.style.left = desti.style.left;
    clone.style.top = desti.style.top;
    clone.style.transform = desti.style.transform;
    // now we don't need destination anymore
    desti.parentNode.removeChild(desti);
    setTimeout(() => {
      mobileNode.style.removeProperty("opacity"); // restore visibility of original
      if (clone.parentNode) clone.parentNode.removeChild(clone); // destroy clone
      if (onEnd) onEnd(mobileNode);
    }, duration);
  }

  // HTML MANIPULATIONS

  /**
   * Create node from string and place on location. The divstr has to be single root node.
   * @param divstr - single root node html string
   * @param location - optional location
   * @returns element
   */
  createHtml(divstr: string, location?: string) {
    const tempHolder = document.createElement("div");
    tempHolder.innerHTML = divstr;
    const div = tempHolder.firstElementChild;
    const parentNode = document.getElementById(location);
    if (parentNode) parentNode.appendChild(div);
    return div;
  }

  createDivNode(id?: string | undefined, classes?: string, location?: string) {
    const div = document.createElement("div");
    if (id) div.id = id;
    if (classes) {
      const classesList = classes.split(/  */);
      div.classList.add(...classesList);
    }
    const parentNode = location ? document.getElementById(location) : null;
    if (parentNode) parentNode.appendChild(div);
    else if (location) {
      console.error("Cannot find location [" + location + "] for ", div);
    }
    console.log("id", id, "has been created at", location);
    return div;
  }

  getTooptipHtml(name: string, message: string, imgTypes?: string, action?: string) {
    if (name == null || message == "-") return "";
    if (!message) message = "";
    var divImg = "";
    var containerType = "tooltipcontainer ";
    if (imgTypes) {
      divImg = `<div class='tooltipimage ${imgTypes}'></div>`;
      var itypes = imgTypes.split(" ");
      for (var i = 0; i < itypes.length; i++) {
        containerType += itypes[i] + "_tooltipcontainer ";
      }
    }
    const name_tr = this.getTr(name);
    const message_tr = this.getTr(message);
    const actionLine = action ? this.getActionLine(action) : "";

    return `<div class='${containerType}'>
        <div class='tooltiptitle'>${name_tr}</div>
        <div class='tooltip-body-separator'></div>
        <div class='tooltip-body'>
           ${divImg}
           <div class='tooltipmessage tooltiptext'>${message_tr}</div>
        </div>
        ${actionLine}
    </div>`;
  }

  showHelp(id: string, force?: boolean) {
    if (!force) if (!this._helpMode) return false;
    if (this.tooltips[id]) {
      dijit.hideTooltip(id);
      this._displayedTooltip = new ebg.popindialog();
      this._displayedTooltip.create("current_tooltip");
      var html = this.tooltips[id].getContent($(id));
      this._displayedTooltip.setContent(html);
      this._displayedTooltip.show();
    }
    return true;
  }

  getTr(name: any) {
    if (name === undefined) return null;
    if (name.log !== undefined) {
      name = this.format_string_recursive(name.log, name.args);
    } else {
      name = this.clienttranslate_string(name);
    }
    return name;
  }

  isMarkedForTranslation(key: string, args: any) {
    if (!args.i18n) {
      return false;
    } else {
      var i = args.i18n.indexOf(key);
      if (i >= 0) {
        return true;
      }
    }
    return false;
  }

  getActionLine(text: string) {
    return (
      "<img class='imgtext' src='" + g_themeurl + "img/layout/help_click.png' alt='action' /> <span class='tooltiptext'>" + text + "</span>"
    );
  }

  setDescriptionOnMyTurn(text: string, moreargs?: []) {
    this.gamedatas.gamestate.descriptionmyturn = text;
    // this.updatePageTitle();
    //console.log('in',   this.gamedatas.gamestate.args, moreargs);
    var tpl = dojo.clone(this.gamedatas.gamestate.args);

    if (!tpl) {
      tpl = {};
    }
    if (moreargs !== undefined) {
      for (var key in moreargs) {
        if (moreargs.hasOwnProperty(key)) {
          tpl[key] = moreargs[key];
        }
      }
    }
    // console.log('tpl', tpl);
    var title = "";
    if (text !== null) {
      tpl.you = this.divYou();
    }
    if (text !== null) {
      title = this.format_string_recursive(text, tpl);
    }
    if (title == "") {
      this.setMainTitle("&nbsp;");
    } else {
      this.setMainTitle(title);
    }
  }

  setMainTitle(text: string) {
    var main = $("pagemaintitletext");
    main.innerHTML = text;
  }

  divYou() {
    var color = "black";
    var color_bg = "";
    if (this.gamedatas.players[this.player_id]) {
      color = this.gamedatas.players[this.player_id].color;
    }
    if (this.gamedatas.players[this.player_id] && this.gamedatas.players[this.player_id].color_back) {
      color_bg = "background-color:#" + this.gamedatas.players[this.player_id].color_back + ";";
    }
    var you = '<span style="font-weight:bold;color:#' + color + ";" + color_bg + '">' + __("lang_mainsite", "You") + "</span>";
    return you;
  }

  // INPUT CONNECTORS

  setActiveSlot(node: ElementOrId) {
    if (!$(node)) {
      this.showError("Not found " + node);
      return;
    }
    $(node).classList.add(this.classActiveSlot);
  }

  setActiveSlots(params: any[]) {
    for (let index = 0; index < params.length; index++) {
      const element = params[index];
      this.setActiveSlot(element);
    }
  }

  connectClickTemp(node: Element, handler: eventhandler) {
    node.classList.add(this.classActiveSlot, "temp_click_handler");
    this.connect(node, "click", handler);
  }

  connectAllTemp(query: string, handler: eventhandler) {
    document.querySelectorAll(query).forEach((node) => {
      this.connectClickTemp(node, handler);
    });
  }

  disconnectClickTemp(node: Element) {
    node.classList.remove(this.classActiveSlot, "temp_click_handler");
    this.disconnect(node, "click");
  }

  disconnectAllTemp(query?: string) {
    if (!query) query = ".temp_click_handler";
    document.querySelectorAll(query).forEach((node) => {
      //console.log("disconnecting => " + node.id);
      this.disconnectClickTemp(node);
    });
  }

  /**
   * Remove all listed class from all document elements
   * @param classes - list of classes separated by space
   */
  removeAllClasses(classes: string) {
    if (!classes) return;
    const classesList = classes.split(/  */);
    classesList.forEach((className) => {
      document.querySelectorAll(`.${className}`).forEach((node) => {
        node.classList.remove(className);
      });
    });
  }

  /**
   * setClientState and defines handler for onUpdateActionButtons
   * the setClientState will be called asyncroniously
   * @param name - state name i.e. client_foo
   * @param onUpdate - handler
   * @param args - args passes to setClientState
   */
  setClientStateUpd(name: string, onUpdate: (args: any) => void, args?: any) {
    this[`onUpdateActionButtons_${name}`] = onUpdate;
    setTimeout(() => this.setClientState(name, args), 1);
  }

  // ASSORTED UTILITY

  /** @Override onScriptError from gameui */
  onScriptError(msg, url, linenumber) {
    if (gameui.page_is_unloading) {
      // Don't report errors during page unloading
      return;
    }
    // In anycase, report these errors in the console
    console.error(msg);
    // cannot call super - dojo still have to used here
    //super.onScriptError(msg, url, linenumber);
    return this.inherited(arguments);
  }

  showError(log: string, args?: any) {
    if (typeof args == "undefined") {
      args = {};
    }
    args.you = this.divYou();
    var message = this.format_string_recursive(log, args);
    this.showMessage(message, "error");
    console.error(message);
    return;
  }

  /**
   * This is convenient function to be called when processing click events, it - remembers id of object - stops propagation - logs to
   * console - the if checkActive is set to true check if element has active_slot class
   */
  onClickSanity(event: Event, checkActiveSlot?: boolean, checkActivePlayer?: boolean) {
    var id = (event.currentTarget as HTMLElement).id;
    // Stop this event propagation
    dojo.stopEvent(event); // XXX
    console.log("on slot " + id);
    if (!id) return null;
    if (this.showHelp(id)) return null;

    if (checkActiveSlot && !id.startsWith("button_") && !this.checkActiveSlot(id)) {
      return null;
    }
    if (checkActivePlayer && !this.checkActivePlayer()) {
      return null;
    }
    id = id.replace("tmp_", "");
    id = id.replace("button_", "");
    return id;
  }

  checkActivePlayer(): boolean {
    if (!this.isCurrentPlayerActive()) {
      this.showMessage(__("lang_mainsite", "This is not your turn"), "error");
      return false;
    }
    return true;
  }
  isActiveSlot(id: ElementOrId): boolean {
    if (dojo.hasClass(id, this.classActiveSlot)) {
      return true;
    }
    if (dojo.hasClass(id, "hidden_" + this.classActiveSlot)) {
      return true;
    }

    return false;
  }
  checkActiveSlot(id: ElementOrId) {
    if (!this.isActiveSlot(id)) {
      this.showMoveUnauthorized();
      return false;
    }
    return true;
  }

  getStateName() {
    return this.gamedatas.gamestate.name;
  }

  getServerStateName() {
    return this.last_server_state.name;
  }

  getPlayerColor(playerId: number) {
    return this.gamedatas.players[playerId] ?? "000000";
  }

  getPlayerIdByColor(color: string) {
    for (var playerId in this.gamedatas.players) {
      var playerInfo = this.gamedatas.players[playerId];
      if (color === playerInfo.color) {
        return playerId;
      }
    }
    return undefined;
  }

  isReadOnly() {
    return this.isSpectator || typeof g_replayFrom != "undefined" || g_archive_mode;
  }

  // NOTIFICATIONS

  setupNotifications(): void {
    console.log("notifications subscriptions setup");
    dojo.subscribe("counter", this, "notif_counter");
    this.notifqueue.setSynchronous("counter", 100);
    dojo.subscribe("counterAsync", this, "notif_counter"); // same as conter but no delay
    dojo.subscribe("score", this, "notif_score");
    this.notifqueue.setSynchronous("score", 500);
    dojo.subscribe("scoreAsync", this, "notif_score"); // same as score but no delay
    dojo.subscribe("message_warning", this, "notif_message_warning");
    dojo.subscribe("message_info", this, "notif_message_info");
    dojo.subscribe("speechBubble", this, "notif_speechBubble");
    this.notifqueue.setSynchronous("speechBubble", 5000);
    dojo.subscribe("log", this, "notif_log");
  }

  notif_log(notif: Notif) {

    if (notif.log) {
      console.log(notif.log, notif.args);
      var message = this.format_string_recursive(notif.log, notif.args);
      if (message != notif.log) console.log(message);
    } else {
      console.log("hidden log", notif.args);
    }
  }

  notif_message_warning(notif: Notif) {
    if (!this.isReadOnly() && !this.instantaneousMode) {
      var message = this.format_string_recursive(notif.log, notif.args);
      this.showMessage(_("Warning:") + " " + message, "warning");
    }
  }

  notif_message_info(notif: Notif) {
    if (!this.isReadOnly() && !this.instantaneousMode) {
      var message = this.format_string_recursive(notif.log, notif.args);
      this.showMessage(_("Announcement:") + " " + message, "info");
    }
  }

  notif_speechBubble(notif: Notif) {
    var html = this.format_string_recursive(notif.args.text, notif.args.args);
    const duration = notif.args.duration ? notif.args.duration : 1000;
    this.notifqueue.setSynchronous("speechBubble", duration);
    this.showBubble(notif.args.target, html, notif.args.delay, duration);
  }

  notif_counter(notif: Notif) {
    try {
      const name = notif.args.counter_name;
      let value: number;
      if (notif.args.counter_value !== undefined) {
        value = notif.args.counter_value;
      } else {
        const counter_inc = notif.args.counter_inc;
        value = notif.args.counter_value = this.gamedatas.counters[name].counter_value + counter_inc;
      }

      if (this.gamedatas.counters[name]) {
        const counters = {};
        counters[name] = {
          counter_name: name,
          counter_value: value,
        };
        if (this.gamedatas_server && this.gamedatas_server.counters[name]) this.gamedatas_server.counters[name].counter_value = value;
        this.updateCountersSafe(counters);
      } else if ($(name)) {
        this.setDomTokenState(name, value);
      }
      //  console.log("** notif counter " + notif.args.counter_name + " -> " + notif.args.counter_value);
    } catch (ex) {
      console.error("Cannot update " + notif.args.counter_name, notif, ex, ex.stack);
    }
  }

  setDomTokenState(tokenId: ElementOrId, newState: any) {
    // XXX it should not be here
  }

  notif_score(notif: Notif) {
    const args = notif.args;
    console.log(notif);
    const prev = this.scoreCtrl[args.player_id].getValue();
    const inc = args.player_score - prev;
    this.scoreCtrl[args.player_id].toValue(args.player_score);
    if (args.target) {
      const duration = notif.args.duration ? notif.args.duration : 1000;
      this.notifqueue.setSynchronous("score", duration);
      const color = this.gamedatas.this.displayScoring(args.target, args.color, inc, args.duration);
    }
  }
}

function joinId(first, second) {
  return first + "_" + second;
}
function getIntPart(word, i) {
  var arr = word.split("_");
  return parseInt(arr[i]);
}
function getPart(word, i) {
  var arr = word.split("_");
  return arr[i];
}
function getFirstParts(word, count) {
  var arr = word.split("_");
  var res = arr[0];
  for (var i = 1; i < arr.length && i < count; i++) {
    res += "_" + arr[i];
  }
  return res;
}
function getParentParts(word) {
  var arr = word.split("_");
  if (arr.length <= 1) return "";
  return getFirstParts(word, arr.length - 1);
}

function reloadCss() {
  var links = document.getElementsByTagName("link");
  for (var cl in links) {
    var link = links[cl];
    if (link.rel === "stylesheet" && link.href.includes("99999")) {
      var index = link.href.indexOf("?timestamp=");
      var href = link.href;
      if (index >= 0) {
        href = href.substring(0, index);
      }

      link.href = href + "?timestamp=" + Date.now();

      console.log("reloading " + link.href);
    }
  }
}

function setStyleAttributes(element: HTMLElement, attrs: { [key: string]: string }): void {
  if (attrs !== undefined) {
    Object.keys(attrs).forEach((key: string) => {
      element.style.setProperty(key, attrs[key]);
    });
  }
}
