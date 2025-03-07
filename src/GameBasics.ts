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
  isLoadingLogsComplete: boolean;

  classActiveSlot: string = "active_slot";
  classButtonDisabled: string = "disabled";

  gamedatas_server: any; // copy of server state gamedatas
  defaultTooltipDelay: number = 800;
  defaultAnimationDuration: number = 500;
  _helpMode: boolean = false; // help mode where tooltip shown instead of click action
  _displayedTooltip: any = null; // used in help mode
  _notif_uid_to_log_id: any = {};
  _notif_uid_to_mobile_log_id: any = {};
  _last_notif: any = null;

  zoom: number = 1.0;

  constructor() {
    super();
    console.log("game constructor");
    this.laststate = null;
    this.pendingUpdate = false;
    this._notif_uid_to_log_id = {};
    this._notif_uid_to_mobile_log_id = {};
    this._last_notif = null;
  }

  setup(gamedatas: any) {
    console.log("Starting game setup", gamedatas);
    dojo.destroy("debug_output"); // its too slow and useless
    this.gamedatas_server = dojo.clone(this.gamedatas);
    this.setupInfoPanel();
    this.setupNotifications();
    this.upldateColorMapping(".player-name *");
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
    if (this.laststate != stateName && args != null) {
      // if args is null it is game state, they are not fired consistencly with onEnter
      // delay firing this until onEnteringState is called so they always called in same order
      this.pendingUpdate = true;
      this.restoreMainBar();
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
    this.restoreMainBar();
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

  tmAjaxCallWrapperUnchecked(action: string, args?: any, handler?: (err: any, res?: any) => void) {
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

  tmAjaxCallWrapper(action: string, args?: any, handler?: (err: any, res?: any) => void) {
    if (this.checkAction(action)) {
      this.tmAjaxCallWrapperUnchecked(action, args, handler);
    }
  }

  /**
   * This execute a specific action called userAction via ajax and passes json as arguments
   * However php action check will be on "action" and corresponding php method will be called from game.php side
   * @param action
   * @param args
   * @param handler
   */
  ajaxuseraction(action: string, args?: any, handler?: (err: any, message?: string) => void) {
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
    console.log(this.last_server_state);
    this.disconnectAllTemp();
    //this.restoreServerData();
    //this.updateCountersSafe(this.gamedatas.counters);

    if (this.on_client_state) this.restoreServerGameState();

    if (this.isCurrentPlayerActive()) {
      if (this.gamedatas.gamestate.private_state != null) {
        let gamestate = this.gamedatas.gamestate.private_state;
        this.updatePageTitle(gamestate);
        this.onEnteringState(gamestate.name, gamestate);
        this.onUpdateActionButtons(gamestate.name, gamestate.args);
      } else {
        this.updatePageTitle(this.gamedatas.gamestate);
      }
    }
  }

  updatePageTitle(state = null) {
    //debugger;
    console.log("updatePageTitle", state);
    if (state?.private_state) this.inherited(state.private_state);
    return this.inherited(arguments);
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
            left: "0px"
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
            top: y + "px"
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
    var elemRect = elem.getBoundingClientRect();

    //console.log("elemRect", elemRect);

    var newId = elem.id + postfix;
    var old = $(newId);
    if (old) old.parentNode.removeChild(old);

    var clone = elem.cloneNode(true) as HTMLElement;
    clone.id = newId;
    clone.classList.add("phantom");
    clone.classList.add("phantom" + postfix);
    clone.style.transitionDuration = "0ms"; // disable animation during projection

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
    clone.style.transitionDuration = undefined;

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
    if (duration === undefined) duration = this.defaultAnimationDuration;
    if (!duration || duration < 0) duration = 0;
    const noanimation = duration <= 0 || !mobileNode.parentNode;
    const oldParent = mobileNode.parentElement;
    var clone = null;
    if (!noanimation) {
      // do animation
      clone = this.projectOnto(mobileNode, "_temp");
      mobileNode.style.opacity = "0"; // hide original
    }

    const rel = mobileStyle?.relation;
    if (rel) {
      delete mobileStyle.relation;
    }
    if (rel == "first") {
      newparent.insertBefore(mobileNode, null);
    } else {
      newparent.appendChild(mobileNode); // move original
    }

    setStyleAttributes(mobileNode, mobileStyle);
    newparent.classList.add("move_target");
    oldParent?.classList.add("move_source");
    mobileNode.offsetHeight; // recalc

    if (noanimation) {
      setTimeout(() => {
        newparent.offsetHeight;
        newparent.classList.remove("move_target");
        oldParent?.classList.remove("move_source");
        if (onEnd) onEnd(mobileNode);
      }, 0);
      return;
    }

    var desti = this.projectOnto(mobileNode, "_temp2"); // invisible destination on top of new parent
    try {
      //setStyleAttributes(desti, mobileStyle);
      clone.style.transitionDuration = duration + "ms";
      clone.style.transitionProperty = "all";
      clone.style.visibility = "visible";
      clone.style.opacity = "1";
      // that will cause animation
      clone.style.left = desti.style.left;
      clone.style.top = desti.style.top;
      clone.style.transform = desti.style.transform;
      // now we don't need destination anymore
      desti.parentNode?.removeChild(desti);
      setTimeout(() => {
        newparent.classList.remove("move_target");
        oldParent?.classList.remove("move_source");
        mobileNode.style.removeProperty("opacity"); // restore visibility of original
        clone.parentNode?.removeChild(clone); // destroy clone
        if (onEnd) onEnd(mobileNode);
      }, duration);
    } catch (e) {
      // if bad thing happen we have to clean up clones
      console.error("ERR:C01:animation error", e);
      desti.parentNode?.removeChild(desti);
      clone.parentNode?.removeChild(clone); // destroy clone
      //if (onEnd) onEnd(mobileNode);
    }
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

  createDivNode(id?: string | undefined, classes?: string, location?: ElementOrId) {
    const div = document.createElement("div");
    if (id) div.id = id;
    if (classes) {
      const classesList = classes.split(/  */);
      div.classList.add(...classesList);
    }
    const parentNode = location ? $(location) : null;
    if (parentNode) parentNode.appendChild(div);
    else if (location) {
      console.error("Cannot find location [" + location + "] for ", div);
    }
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
    const actionLine = action ? this.getActionLine(action) : "";
    let body = "";
    if (imgTypes.includes("_override")) {
      body = message;
    } else {
      const message_tr = this.getTr(message);
      body = `
          ${divImg}
           <div class='tooltipmessage tooltiptext'>${message_tr}</div>
    `;
    }

    return `<div class='${containerType}'>
        <div class='tooltiptitle'>${name_tr}</div>
        <div class='tooltip-body-separator'></div>
        <div class='tooltip-body'>${body}</div>
        ${actionLine}
    </div>`;
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

  divColoredPlayer(player_id: number) {
    var color = this.gamedatas.players[player_id].color || "black";
    var color_bg = "";
    if (this.gamedatas.players[player_id].color_back) {
      color_bg = "background-color:#" + this.gamedatas.players[player_id].color_back + ";";
    }
    var div = '<span style="color:#' + color + ";" + color_bg + '">' + this.gamedatas.players[player_id].name + "</span>";
    return div;
  }

  // INPUT CONNECTORS

  setActiveSlot(node: ElementOrId) {
    if (!$(node)) {
      this.showError("Not found " + node);
      return;
    }
    $(node).classList.add(this.classActiveSlot);
  }

  setActiveSlots(slots: any[]) {
    for (let index = 0; index < slots.length; index++) {
      const element = slots[index];
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
   * Return array of node id, carefull - not all nodes have ids, it could be undefines there
   * @param query
   * @returns array of ids
   */
  queryIds(query: string) {
    const ids = [];
    document.querySelectorAll(query).forEach((node) => ids.push(node.id));
    return ids;
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
  setDomTokenState(tokenId: ElementOrId, newState: any) {
    // XXX it should not be here
  }

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

  findActiveParent(element: HTMLElement) {
    if (this.isActiveSlot(element)) return element;
    const parent = element.parentElement;
    if (!parent || parent.id == "thething" || parent == element) return null;
    return this.findActiveParent(parent);
  }

  /**
   * This is convenient function to be called when processing click events, it - remembers id of object - stops propagation - logs to
   * console - the if checkActive is set to true check if element has active_slot class
   */
  onClickSanity(event: Event, checkActiveSlot?: boolean, checkActivePlayer?: boolean) {
    let id = (event.currentTarget as HTMLElement).id;
    let target = event.target as HTMLElement;
    if (id == "thething") {
      let node = this.findActiveParent(target);
      id = node?.id;
    }

    console.log("on slot " + id, target?.id || target);
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
      console.error(new Error("unauth"), id);
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
    return this.gamedatas.players[playerId]?.color ?? "ffffff";
  }

  getPlayerName(playerId: number) {
    return this.gamedatas.players[playerId]?.name ?? _("Not a Player");
  }

  getPlayerIdByColor(color: string): number | undefined {
    for (var playerId in this.gamedatas.players) {
      var playerInfo = this.gamedatas.players[playerId];
      if (color == playerInfo.color) {
        return parseInt(playerId);
      }
    }
    return undefined;
  }
  getPlayerIdByNo(no: string): number | undefined {
    for (var playerId in this.gamedatas.players) {
      var playerInfo = this.gamedatas.players[playerId];
      if (no == playerInfo.no) {
        return parseInt(playerId);
      }
    }
    return undefined;
  }

  isReadOnly() {
    return this.isSpectator || typeof g_replayFrom != "undefined" || g_archive_mode;
  }

  addCancelButton(name?: string, handler?: any) {
    if (!name) name = _("Cancel");
    if (!handler) handler = () => this.cancelLocalStateEffects();
    if ($("button_cancel")) dojo.destroy("button_cancel");
    this.addActionButton("button_cancel", name, handler, null, false, "red");
  }

  addActionButton(id: string, label: string, method: string | eventhandler, destination?: ElementOrId, blinking?: boolean, color?: string) {
    if ($(id)) dojo.destroy(id);
    this.inherited(arguments);
    return $(id);
  }

  cloneAndFixIds(orig: ElementOrId, postfix: string, removeInlineStyle?: boolean) {
    if (!$(orig)) {
      const div = document.createElement("div");
      div.innerHTML = _("NOT FOUND") + " " + orig.toString();
      return div;
    }
    const fixIds = function (node: HTMLElement) {
      if (node.id) {
        node.id = node.id + postfix;
      }
      if (removeInlineStyle) {
        node.removeAttribute("style");
      }
    };
    const div = $(orig).cloneNode(true) as HTMLElement;
    div.querySelectorAll("*").forEach(fixIds);
    fixIds(div);

    return div;
  }

  /* @Override */
  updatePlayerOrdering() {
    this.inherited(arguments);
    dojo.place("player_board_config", "player_boards", "first");
  }

  destroyDivOtherCopies(id: string) {
    const panels = document.querySelectorAll("#" + id);
    panels.forEach((p, i) => {
      if (i < panels.length - 1) p.parentNode.removeChild(p);
    });
    return panels[0] ?? null;
  }

  setupSettings() {
    // re-place fake mini board
    this.destroyDivOtherCopies("player_board_config");
    dojo.place("player_board_config", "player_boards", "first");

    // move preference in gear tab
    const userPrefContainerId = "settings-controls-container-prefs";
    $(userPrefContainerId).setAttribute("data-name", _("Preferences"));
    for (let index = 100; index <= 199; index++) {
      const prefDivId = "preference_control_" + index;
      const element = this.destroyDivOtherCopies(prefDivId);
      if (element) {
        let parent = element.parentElement.parentElement;
        if (parent.parentElement.id != userPrefContainerId) {
          dojo.place(parent, userPrefContainerId);
          if (this.refaceUserPreference(index, parent, prefDivId) == false) {
            // remove the class because otherwise framework will hook its own listener there
            parent.querySelectorAll(".game_preference_control").forEach((node) => dojo.removeClass(node, "game_preference_control"));
            dojo.connect(parent, "onchange", (e: any) => this.onChangePreferenceCustom(e));
          }
        }
      }
    }

    // add bug button
    var bug = $("bug_button");
    if (!bug) {
      var url = this.metasiteurl + "/bug?id=0&table=" + this.table_id;
      bug = dojo.create("a", {
        id: "bug_button",
        class: "action-button bgabutton bgabutton_gray",
        innerHTML: "Send BUG",
        href: url,
        target: "_blank"
      });
    }

    // add copy log button
    let copylog = $("button_copylog");
    if (!copylog) {
      copylog = this.addActionButton(
        "button_copylog",
        _("Copy LOG"),
        () => this.copyLogToClipBoard(),
        "settings-controls-container",
        false,
        "gray"
      );
      copylog.dataset.lines = "100";
    }

    dojo.place(copylog, "settings-controls-container", "first");
    dojo.place(bug, "settings-controls-container", "first");
  }

  extractTextFromLogItem(node: any) {
    if (node.title) return node.title;
    if (node.children?.length > 0) {
      const array = Array.from(node.childNodes);
      const sep = node.classList.contains("log") ? "\n" : "";
      return array.map((x: any) => this.extractTextFromLogItem(x)).join(sep);
    }
    if (node.nodeType == Node.TEXT_NODE) return node.nodeValue;
    return node.innerText;
  }

  extractTextGameInfo() {
    let text = "";
    text += `Current player ${this.getPlayerName(this.player_id)} ${this.getPlayerColor(this.player_id)}\n`;

    return text;
  }

  copyLogToClipBoard() {
    const linesMax = parseInt($("button_copylog")?.dataset.lines ?? "100");
    let text = `LOGS (${linesMax} last lines)\n`;
    let lines = 0;

    document.querySelectorAll("#logs > *").forEach((lognode) => {
      lines++;
      if (lines > linesMax) return;
      text += this.extractTextFromLogItem(lognode) + "\n";
    });
    let text2 = "GAME situation\n";
    text2 += this.extractTextGameInfo();

    navigator.clipboard.writeText(text + text2);

    var html = `
    Text was copied to clipboard, you can just paste it in the bug report<br>
    NOTE: this may reveal private info about your hand card, please remove this info manually if you care
    <br>
    <pre class='mr_scrollable'>
    ${text}
    </pre>
    <br>
    <pre class='mr_scrollable'>
    ${text2}
    </pre>
    `;
    this.showPopin(html, "log_info", "Game Info for bug report");
  }

  /** Show pop in dialog. If you need div id of dialog its `popin_${id}` where id is second parameter here */
  showPopin(html: string, id = "mr_dialog", title: string = undefined, refresh: boolean = false) {
    const content_id = `popin_${id}_contents`;
    if (refresh && $(content_id)) {
      $(content_id).innerHTML = html;
      return undefined;
    }

    const dialog = new ebg.popindialog();
    dialog.create(id);
    if (title) dialog.setTitle(title);
    dialog.setContent(html);
    dialog.show();
    return dialog;
  }

  refaceUserPreference(pref_id: number, node: Element, prefDivId: string) {
    // can override to change apperance
    return false; // return false to hook defaut listener, other return true and you have to hook listener yourself
  }

  /**
   * Control where click is registered has to have matching id (where part will be the pref_id) or have attribute data-pref_id set
   * @param e Event
   */
  onChangePreferenceCustom(e: any): void {
    const target = e.target;
    if (!target.id) return;
    var match = target.id.match(/^preference_[cf]ontrol_(\d+).*$/);
    let prefId;
    if (match) {
      // Extract the ID and value from the UI control
      prefId = +match[1];
    } else {
      prefId = target.getAttribute("data-pref-id");
    }
    if (!prefId) return; // error?
    const prefValue = +(target.value ?? target.getAttribute("value"));
    this.tmAjaxCallChangePreferenceCustom(prefId, prefValue);
  }

  tmAjaxCallChangePreferenceCustom(pref_id: number, value: any) {
    console.log("ajaxCallChangePreference", pref_id, value);
    value = parseInt(value);
    this.prefs[pref_id].value = value;
    // send to mainsite to update
    this.ajaxcall(
      "/table/table/changePreference.html",
      {
        id: pref_id,
        value: value,
        lock: true,
        game: this.game_name
      },
      this,
      function (result) {
        console.log("=> back", result);

        // send to our game to update per game table
        this.gamedatas.server_prefs[pref_id] = value;
        if (pref_id >= 100 && pref_id < 200) {
          var args = { pref_id: pref_id, pref_value: value, player_id: this.player_id, lock: false };
          this.tmAjaxCallWrapperUnchecked("changePreference", args, (err, res) => {
            if (err) console.error("changePreference callback failed " + res);
            else {
              console.log("changePreference sent " + pref_id + "=" + value);
              const opname = _(this.prefs[pref_id].name);
              const opvalue = _(this.prefs[pref_id].values[value].name);
              this.showMessage(_("Done, preference changed:") + " " + opname + " => " + opvalue, "info");
            }
          });
        }
        // this is async to other server send, its ok
        if (result.status == "reload") {
          this.showMessage(_("Done, reload in progress..."), "info");
          window.location.hash = "";
          window.location.reload();
        } else {
          if (result.pref_id == this.GAMEPREFERENCE_DISPLAYTOOLTIPS) {
            this.switchDisplayTooltips(result.value);
          }
        }
      }
    );
  }

  toggleSettings() {
    console.log("toggle setting");
    dojo.toggleClass("settings-controls-container", "settingsControlsHidden");
    // do not call setupSettings() here it has to be only called once

    // Hacking BGA framework
    if (dojo.hasClass("ebd-body", "mobile_version")) {
      dojo.query(".player-board").forEach((elt) => {
        if (elt.style.height != "auto") {
          dojo.style(elt, "min-height", elt.style.height);
          elt.style.height = "auto";
        }
      });
    }
  }

  toggleHelpMode(b) {
    if (b) this.activateHelpMode();
    else this.deactivateHelpMode();
  }

  helpModeHandler = this.onClickForHelp.bind(this);
  closeHelpHandler = this.closeCurrentTooltip.bind(this);

  activateHelpMode() {
    let chk = $("help-mode-switch");
    dojo.setAttr(chk, "bchecked", true);
    this._helpMode = true;
    dojo.addClass("ebd-body", "help-mode");
    this._displayedTooltip = null;
    document.body.addEventListener("click", this.closeHelpHandler);
    this.setDescriptionOnMyTurn(_("HELP MODE Activated. Click on game elements to get tooltips"));
    dojo.empty("generalactions");
    this.addCancelButton(undefined, () => this.deactivateHelpMode());

    document.querySelectorAll(".withtooltip").forEach((node) => {
      node.addEventListener("click", this.helpModeHandler, false);
    });
  }

  deactivateHelpMode() {
    let chk = $("help-mode-switch");
    dojo.setAttr(chk, "bchecked", false);
    this.closeCurrentTooltip();
    this._helpMode = false;
    dojo.removeClass("ebd-body", "help-mode");
    document.body.removeEventListener("click", this.closeHelpHandler);
    document.querySelectorAll(".withtooltip").forEach((node) => {
      node.removeEventListener("click", this.helpModeHandler, false);
    });
    this.on_client_state = true;
    this.cancelLocalStateEffects();
  }

  closeCurrentTooltip() {
    if (!this._helpMode) return;

    if (this._displayedTooltip == null) return;

    this._displayedTooltip.destroy();
    this._displayedTooltip = null;
  }

  onClickForHelp(event) {
    console.trace("onhelp", event);
    if (!this._helpMode) return false;
    event.stopPropagation();
    event.preventDefault();
    this.showHelp(event.currentTarget.id);
    return true;
  }

  showHelp(id: string, force?: boolean) {
    if (!force) if (!this._helpMode) return false;
    if (this.tooltips[id]) {
      dijit.hideTooltip(id);
      var html = this.tooltips[id].getContent($(id));
      this._displayedTooltip = this.showPopin(html, "current_tooltip");
    }
    return true;
  }

  onScreenWidthChange() {
    // override
  }

  setupInfoPanel() {
    //dojo.place('player_board_config', 'player_boards', 'first');

    dojo.connect($("show-settings"), "onclick", () => this.toggleSettings());
    this.addTooltip("show-settings", "", _("Display game preferences"));

    let chk = $("help-mode-switch");
    dojo.setAttr(chk, "bchecked", false);
    dojo.connect(chk, "onclick", () => {
      console.log("on check", chk);
      const bchecked = !chk.getAttribute("bchecked");
      //dojo.setAttr(chk, "bchecked", !chk.bchecked);
      this.toggleHelpMode(bchecked);
    });
    this.addTooltip(chk.id, "", _("Toggle help mode"));

    //$('help-mode-switch').style.display='none';
    this.setupSettings();
    //this.setupHelper();
    //this.setupTour();

    this.addTooltip("zoom-in", "", _("Zoom in"));
    this.addTooltip("zoom-out", "", _("Zoom out"));
  }

  // NOTIFICATIONS

  setupNotifications(): void {
    console.log("notifications subscriptions setup");

    dojo.subscribe("score", this, "notif_score");
    this.notifqueue.setSynchronous("score", 5000); // reset in notif handler
    dojo.subscribe("scoreAsync", this, "notif_score"); // same as score but no delay
    dojo.subscribe("message_warning", this, "notif_message_warning");
    dojo.subscribe("message_info", this, "notif_message_info");
    dojo.subscribe("message", this, "notif_message");
    dojo.subscribe("speechBubble", this, "notif_speechBubble");
    this.notifqueue.setSynchronous("speechBubble", 5000);
    dojo.subscribe("log", this, "notif_log");
  }

  subscribeNotification(notifName: string, duration: number = 0, funcName?: string): void {
    if (funcName === undefined) funcName = notifName;
    if (!(typeof this["notif_" + funcName] === "function")) {
      this.showError("ERR:C02:Notification notif_" + funcName + " isn't set !");
      return;
    }

    dojo.subscribe(notifName, this, (notif) => this.playnotif(funcName, notif, duration));
    if (duration == 0) {
      //variable duration
      //don't forget to call this.notifqueue.setSynchronousDuration(duration);
      this.notifqueue.setSynchronous(notifName, 5000); // max fallback to prevent haning
    } else if (duration == 1) {
      //Notif has no animation, thus no delay
      //this.notifqueue.setSynchronous(notifName, duration);
    } else {
      this.notifqueue.setSynchronous(notifName, duration);
    }
  }

  playnotif(notifname: string, notif: Notif, setDelay: number): void {
    //console.log("playing notif " + notifname + " with args ", notif.args);

    //setSynchronous has to set for non active player in ignored notif
    // if (setDelay == -1) {
    //   if (notif.args.player_id == this.player_id) {
    //     //     this.notifqueue.setSynchronous(notifname, 1);
    //   } else {
    //     //   this.notifqueue.setSynchronous(notifname);
    //   }
    // }

    /*
    Client-side duplicat notification check
    Disabled for now
    if (this.prev_notif_uid == args.uid) {
      this.sendAction('ui_warning', { log: "duplicated notification uid received " + args.uid });
      // return; // FIXME: return only if reported through production log and confirmed as an issue
    }
    this.prev_notif_uid = args.uid;
    */

    let notiffunc = "notif_" + notifname;

    if (!this[notiffunc]) {
      this.showMessage("Notif: " + notiffunc + " not implemented yet", "error");
    } else {
      //const startTime = Date.now();
      //  this.onNotif(notif);//should be moved here
      let p = this[notiffunc](notif);
      if (setDelay == 1) {
        //nothing to do here
      } else if (!(p instanceof Promise)) {
        //no promise returned: no animation played
        // console.log(notifname+' : no return, sync set to 1');
        this.notifqueue.setSynchronousDuration(1);
      } else {
        //  this.animated=true;
        p.then(() => {
          this.notifqueue.setSynchronousDuration(10);
          //const executionTime = Date.now() - startTime;
          //  console.log(notifname+' : sync has been set to dynamic after '+executionTime+"ms  elapsed");
          //    this.animated=false;
        });
      }
    }
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
    this.onNotif(notif);
  }

  notif_message_info(notif: Notif) {
    if (!this.isReadOnly() && !this.instantaneousMode) {
      var message = this.format_string_recursive(notif.log, notif.args);
      this.showMessage(_("Announcement:") + " " + message, "info");
    }
    this.onNotif(notif);
  }
  notif_message(notif: Notif) {
    this.onNotif(notif);
  }

  // ntf_gameStateMultipleActiveUpdate(notif) {
  //   this.gamedatas.gamestate.descriptionmyturn = "...";
  //   return this.inherited(arguments);
  // }

  onLockInterface(lock) {
    $("gameaction_status_wrap").setAttribute("data-interface-status", lock?.status ?? "updated");
    this.inherited(arguments);
    // if (lock.status == "queued") {
    //    // do not hide the buttons when locking call comes from another player
    // }

    this.restoreMainBar();
  }

  rgbToHex(arr: any[]) {
    try {
      return (
        "#" +
        arr
          .map((x) => {
            if (typeof x === "string") {
              x = parseInt(x.trim());
            }
            const hex = x.toString(16);
            return hex.length === 1 ? "0" + hex : hex;
          })
          .join("")
      );
    } catch (e) {
      return undefined;
    }
  }

  getColorMappingVar(color: string) {
    if (!color) return undefined;

    if (color.startsWith("rgb(")) {
      const rgb = color.substring(4, color.length - 1);
      color = this.rgbToHex(rgb.split(","));
    }
    if (color.startsWith("#")) color = color.substring(1);

    for (let player_id in this.gamedatas.players) {
      if (this.gamedatas.players[player_id].color == color) {
        return `var(--color-mapping_${color})`;
      }
    }
    return undefined;
  }

  upldateColorMapping(query: string) {
    document.querySelectorAll(query).forEach((node) => {
      const color = (node as HTMLElement).style?.color;
      if (!color) return;
      const cvar = this.getColorMappingVar(color);
      if (cvar) {
        (node as HTMLElement).style.color = cvar;
      }
    });
  }
  /**
   * This is the hack to keep the status bar on
   */
  restoreMainBar() {
    //console.trace("restore main bar");
    dojo.style("pagemaintitle_wrap", "display", "block");
    dojo.style("gameaction_status_wrap", "display", "block");
    if (this.interface_status == "updated") {
      // this is normal status nothing is pending
      $("gameaction_status").innerHTML = "&nbsp;";
      $("gameaction_status_wrap").setAttribute("data-interface-status", this.interface_status);
    }
    // update hardcoded colors to variable
    this.upldateColorMapping("#page-title *");
  }

  onNotif(notif: Notif) {
    this.restoreMainBar();
    //console.log("notif", notif);
    // if (!this.instantaneousMode && notif.log) {
    //   this.setDescriptionOnMyTurn(notif.log, notif.args);
    // }
  }

  notif_speechBubble(notif: Notif) {
    var html = this.format_string_recursive(notif.args.text, notif.args.args);
    const duration = notif.args.duration ? notif.args.duration : 1000;
    this.notifqueue.setSynchronous("speechBubble", duration);
    this.showBubble(notif.args.target, html, notif.args.delay, duration);
  }

  notif_score(notif: Notif) {
    this.onNotif(notif);
    console.log(notif);
    try {
      this.updatePlayerScoreWithAnim(notif.args);
    } finally {
      this.notifqueue.setSynchronousDuration(notif.args.duration ?? 1000);
    }
  }

  updatePlayerScoreWithAnim(args) {
    if (this.scoreCtrl[args.player_id]) {
      if (args.noa) this.scoreCtrl[args.player_id].setValue(args.player_score);
      else this.scoreCtrl[args.player_id].toValue(args.player_score);
    }
    const prev = this.gamedatas.players[args.player_id].score;
    const inc = args.player_score - prev;

    this.gamedatas.players[args.player_id].score = args.player_score;

    if (args.target && !args.noa && inc != 0) {
      const duration = args.duration ?? 1000;
      const color = args.color ?? this.getPlayerColor(args.player_id);

      this.displayScoring(args.target, color, inc, args.duration);
      args.duration = duration;
    } else {
      args.duration = 0;
    }
  }

  /*
   * [Undocumented] Called by BGA framework on any notification message
   * Handle cancelling log messages for restart turn
   */
  onPlaceLogOnChannel(msg) {
    var currentLogId = this.notifqueue.next_log_id;
    var currentMobileLogId = this.next_log_id;
    var res = this.inherited(arguments);
    this._notif_uid_to_log_id[msg.uid] = currentLogId;
    this._notif_uid_to_mobile_log_id[msg.uid] = currentMobileLogId;
    this._last_notif = {
      logId: currentLogId,
      mobileLogId: currentMobileLogId,
      msg
    };
    return res;
  }

  /*
   * cancelLogs:
   *   strikes all log messages related to the given array of notif ids
   */
  checkLogCancel(notifId) {
    if (this.gamedatas.canceledNotifIds != null && this.gamedatas.canceledNotifIds.includes(notifId)) {
      this.cancelLogs([notifId]);
    }
  }

  cancelLogs(notifIds: any[] | undefined) {
    if (!notifIds) return;
    notifIds.forEach((uid) => {
      if (this._notif_uid_to_log_id.hasOwnProperty(uid)) {
        let logId = this._notif_uid_to_log_id[uid];
        if ($("log_" + logId)) dojo.addClass("log_" + logId, "cancel");
      }
      if (this._notif_uid_to_mobile_log_id.hasOwnProperty(uid)) {
        let mobileLogId = this._notif_uid_to_mobile_log_id[uid];
        if ($("dockedlog_" + mobileLogId)) dojo.addClass("dockedlog_" + mobileLogId, "cancel");
      }
    });
  }

  /*
  			* [Undocumented] Override BGA framework functions to call onLoadingLogsComplete when loading is done
                        @Override
   			*/
  setLoader(image_progress: number, logs_progress: number) {
    if (typeof g_replayFrom != "undefined" && image_progress >= 8) {
      dojo.style("loader_mask", "display", "none");
    }
    this.inherited(arguments); // required, this is "super()" call, do not remove
    //console.log("loader", image_progress, logs_progress)
    if (!this.isLoadingLogsComplete && logs_progress >= 100) {
      this.isLoadingLogsComplete = true; // this is to prevent from calling this more then once
      this.onLoadingLogsComplete();
    }
  }

  onLoadingLogsComplete() {
    console.log("Loading logs complete");
    // do something here
    this.upldateColorMapping(".playername");
    this.upldateColorMapping(".player-name *");
  }

  // /** @override to fix bug */
  // ntf_newPrivateState(notif) {
  //   this.inherited(arguments);
  //   this.last_server_state.private_state = dojo.clone(notif.args);
  // }
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
  if (arr.length <= i) return "";
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

/** This is essentically dojo.place but without dojo */
function placeHtml(html: string, parent: ElementOrId, how: InsertPosition = "beforeend") {
  return $(parent).insertAdjacentHTML(how, html);
}
