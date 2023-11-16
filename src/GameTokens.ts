/**
 * Interface that mimics token datatabase object
 */
interface Token {
  key: string;
  location: string;
  state: number;
}

interface TokenDisplayInfo {
  key: string; // token id
  tokenId: string; // original id of html node
  typeKey: string; // this is key in token_types structure
  mainType: string; // first type
  imageTypes: string; // all classes
  name?: string;
  tooltip?: string;
  tooltip_action?: string;
  showtooltip?: boolean;
  [key: string]: any;
}

interface TokenMoveInfo extends Token {
  x?: number;
  y?: number;
  position?: string;
  onEnd?: (node: Element) => void;
  onClick?: eventhandler;
  animtime?: number;
  relation?: string;
  nop?: boolean;
  from?: string;
}

class GameTokens extends GameBasics {
  restoreList: string[];
  player_color: string;
  clientStateArgs: any;
  original_click_id: any;
  limbo: HTMLElement;

  setup(gamedatas: any): void {
    super.setup(gamedatas);
    this.restoreList = []; // list of object dirtied during client state visualization
    this.gamedatas_server = dojo.clone(this.gamedatas);

    const first_player_id = Object.keys(gamedatas.players)[0];
    if (!this.isSpectator) this.player_color = gamedatas.players[this.player_id].color;
    else this.player_color = gamedatas.players[first_player_id].color;
    if (!this.gamedatas.tokens) {
      console.error("Missing gamadatas.tokens!");
      this.gamedatas.tokens = {};
    }
    if (!this.gamedatas.token_types) {
      console.error("Missing gamadatas.token_types!");
      this.gamedatas.token_types = {};
    }
    this.clientStateArgs = {}; // collector of client state arguments

    this.instantaneousMode = true;

    this.gamedatas.tokens["limbo"] = {
      key: "limbo",
      state: 0,
      location: "thething",
    };
    this.limbo = this.placeToken("limbo");

    // Setting up player boards
    for (var player_id in gamedatas.players) {
      var playerInfo = gamedatas.players[player_id];
      this.setupPlayer(playerInfo);
    }
    this.setupTokens();
    this.instantaneousMode = false;
  }

  onEnteringState_before(stateName: string, args: any) {
    if (!this.on_client_state) {
      // we can use it to preserve arguments for client states
      this.clientStateArgs = {};
    }
  }

  cancelLocalStateEffects() {
    this.clientStateArgs = {};
    if (this.restoreList) {
      var restoreList = this.restoreList;
      this.restoreList = [];
      for (var i = 0; i < restoreList.length; i++) {
        var token = restoreList[i];
        var tokenInfo = this.gamedatas.tokens[token];
        this.placeTokenWithTips(token, tokenInfo);
      }
    }
    super.cancelLocalStateEffects();
  }

  setupPlayer(playerInfo: any) {
    console.log("player info " + playerInfo.id, playerInfo);
    const mini = $(`miniboard_${playerInfo.color}`);
    const pp = `player_panel_content_${playerInfo.color}`;
    document.querySelectorAll(`#${pp}>.miniboard`).forEach((node) => dojo.destroy(node));
    $(pp).appendChild(mini);
  }

  getAllLocations() {
    const res = [];
    for (const key in this.gamedatas.token_types) {
      const info = this.gamedatas.token_types[key];
      if (this.isLocationByType(key) && info.scope != "player") res.push(key);
    }
    for (var token in this.gamedatas.tokens) {
      var tokenInfo = this.gamedatas.tokens[token];
      var location = tokenInfo.location;
      if (res.indexOf(location) < 0) res.push(location);
    }
    return res;
  }

  isLocationByType(id: string) {
    return this.hasType(id, "location");
  }

  hasType(id: string, type: string): boolean {
    const loc = this.getRulesFor(id, "type", "");
    const split = loc.split(" ");
    return split.indexOf(type) >= 0;
  }

  setupTokens() {
    console.log("Setup tokens");

    for (var counter in this.gamedatas.counters) {
      this.placeTokenWithTips(counter);
    }
    this.updateCountersSafe(this.gamedatas.counters);

    for (var loc of this.getAllLocations()) {
      this.placeToken(loc);
    }

    for (var token in this.gamedatas.tokens) {
      var tokenInfo = this.gamedatas.tokens[token];
      var location = tokenInfo.location;
      if (!this.gamedatas.tokens[location] && !$(location)) {
        this.placeToken(location);
      }
      this.placeToken(token);
    }

    for (var loc of this.getAllLocations()) {
      this.updateTooltip(loc);
    }
    for (var token in this.gamedatas.tokens) {
      this.updateTooltip(token);
    }
  }

  setTokenInfo(token_id: string, place_id?: string, new_state?: number, serverdata?: boolean): Token {
    var token = token_id;
    if (!this.gamedatas.tokens[token]) {
      this.gamedatas.tokens[token] = {
        key: token,
        state: 0,
        location: this.limbo.id,
      };
    }
    if (place_id !== undefined) {
      this.gamedatas.tokens[token].location = place_id;
    }

    if (new_state !== undefined) {
      this.gamedatas.tokens[token].state = new_state;
    }

    if (serverdata === undefined) serverdata = true;
    if (serverdata && this.gamedatas_server) this.gamedatas_server.tokens[token] = dojo.clone(this.gamedatas.tokens[token]);
    return this.gamedatas.tokens[token];
  }

  hideCard(tokenId: ElementOrId) {
    this.limbo.appendChild($(tokenId));
  }

  getPlaceRedirect(tokenInfo: Token): TokenMoveInfo {
    var location = tokenInfo.location;
    var result: TokenMoveInfo = {
      location: location,
      key: tokenInfo.key,
      state: tokenInfo.state,
    };

    if (location.startsWith("discard")) {
      result.onEnd = (node) => this.hideCard(node);
    } else if (location.startsWith("deck")) {
      result.onEnd = (node) => this.hideCard(node);
    }
    return result;
  }

  saveRestore(tokenId: ElementOrId, force?: boolean) {
    if (this.on_client_state || force) {
      if (!tokenId) return;
      if (typeof tokenId != "string") {
        tokenId = tokenId.id;
      }

      if (this.restoreList.indexOf(tokenId) < 0) {
        this.restoreList.push(tokenId);
      }
    }
  }

  setDomTokenState(tokenId: ElementOrId, newState: any) {
    var node = $(tokenId);
    // console.log(token + "|=>" + newState);
    if (!node) return;
    this.saveRestore(node);
    node.setAttribute("data-state", newState);
    if (newState > 0) {
      node.setAttribute("data-sign", "+");
    } else {
      node.removeAttribute("data-sign");
    }
  }

  getDomTokenLocation(tokenId: ElementOrId) {
    return ($(tokenId).parentNode as HTMLElement).id;
  }

  getDomTokenState(tokenId: ElementOrId) {
    return parseInt(($(tokenId).parentNode as HTMLElement).getAttribute("data-state") || "0");
  }

  createToken(placeInfo: TokenMoveInfo) {
    const tokenId = placeInfo.key;
    var info = this.getTokenDisplayInfo(tokenId);
    var place = placeInfo.from ?? placeInfo.location ?? this.getRulesFor(tokenId, "location");
    const tokenDiv = this.createDivNode(info.key, info.imageTypes, place);

    if (placeInfo.onClick) {
      this.connect(info.key, "onclick", placeInfo.onClick);
    }
    return tokenDiv;
  }

  syncTokenDisplayInfo(tokenNode: HTMLElement) {
    if (!tokenNode.getAttribute("data-info")) {
      const displayInfo = this.getTokenDisplayInfo(tokenNode.id);
      const classes = displayInfo.imageTypes.split(/  */);
      tokenNode.classList.add(...classes);
      //dojo.addClass(tokenNode, displayInfo.imageTypes);
      tokenNode.setAttribute("data-info", "1");
    }
  }

  updateLocalCounters(tokenInfo: Token) {
    // not implemented, override
  }

  placeTokenLocal(tokenId: string, location: string, state?: number, args?: any) {
    const tokenInfo = this.setTokenInfo(tokenId, location, state, false);
    this.on_client_state = true;
    this.placeTokenWithTips(tokenId, tokenInfo, args);
    if (this.instantaneousMode) {
      // skip counters update
    } else {
      this.updateLocalCounters(tokenInfo);
    }
  }

  placeTokenServer(tokenId: string, location: string, state?: number, args?: any) {
    const tokenInfo = this.setTokenInfo(tokenId, location, state, true);
    this.placeTokenWithTips(tokenId, tokenInfo, args);
  }

  placeToken(token: string, tokenInfo?: Token, args?: any) {
    try {
      var tokenNode = $(token);
      if (args === undefined) {
        args = {};
      }
      if (!tokenInfo) {
        tokenInfo = this.gamedatas.tokens[token];
      }
      var noAnnimation = false;
      if (args.noa) {
        noAnnimation = true;
      }

      if (!tokenInfo) {
        const rules = this.getAllRules(token);
        if (rules) tokenInfo = this.setTokenInfo(token, rules.location, rules.state, false);
        else tokenInfo = this.setTokenInfo(token, undefined, undefined, false);

        if (tokenNode) {
          tokenInfo = this.setTokenInfo(token, this.getDomTokenLocation(tokenNode), this.getDomTokenState(tokenNode), false);
        }
        noAnnimation = true;
      }

      const placeInfo = this.getPlaceRedirect(tokenInfo);
      const location = placeInfo.location;

      // console.log(token + ": " + " -place-> " + place + " " + tokenInfo.state);

      this.saveRestore(token);

      if (tokenNode == null) {
        //debugger;
        if (!placeInfo.from && args.place_from) placeInfo.from = args.place_from;
        tokenNode = this.createToken(placeInfo);
      }
      this.syncTokenDisplayInfo(tokenNode);

      var state = 0;
      if (tokenInfo) state = tokenInfo.state;
      this.setDomTokenState(tokenNode, state);

      if (dojo.hasClass(tokenNode, "infonode")) {
        this.placeInfoBox(tokenNode);
      }

     if (placeInfo.nop) {
        // no placement
        return;
      }
      if (!$(location)) {
        if (location) console.error("Unknown place '" + location + "' for '" + tokenInfo.key + "' " + token);
        return;
      }
      if (location === "dev_null") {
        // no annimation
        noAnnimation = true;
      }
      if (this.instantaneousMode || typeof g_replayFrom != "undefined" || args.noa || placeInfo.animtime == 0) {
        noAnnimation = true;
      }
      // console.log(token + ": " + tokenInfo.key + " -move-> " + place + " " + tokenInfo.state);

      var animtime = placeInfo.animtime ?? this.defaultAnimationDuration;
      if (!tokenNode.parentNode) noAnnimation = true;
      if (noAnnimation) animtime = 0;

      let mobileStyle = undefined;
      if (placeInfo.x !== undefined || placeInfo.y !== undefined) {
        mobileStyle = {
          position: placeInfo.position || "absolute",
          left: placeInfo.x + "px",
          top: placeInfo.y + "px",
        };
      }

      this.slideAndPlace(tokenNode, location, animtime, mobileStyle, placeInfo.onEnd);
    } catch (e) {
      console.error("Exception thrown", e, e.stack);
      // this.showMessage(token + " -> FAILED -> " + place + "\n" + e, "error");
    }
    return tokenNode;
  }

  placeTokenWithTips(token: string, tokenInfo?: Token, args?: any) {
    if (!tokenInfo) {
      tokenInfo = this.gamedatas.tokens[token];
    }
    this.placeToken(token, tokenInfo, args);
    this.updateTooltip(token);
    if (tokenInfo) this.updateTooltip(tokenInfo.location);
  }

  placeInfoBoxClass(clazz: string) {
    document.querySelectorAll("." + clazz).forEach((node) => this.placeInfoBox(node));
  }

  placeInfoBox(node: ElementOrId) {
    node = $(node);
    const boxes = node.querySelectorAll(".infobox");
    if (boxes.length > 0) return;
    const infoid = node.id + "_info";
    this.createDivNode(infoid, "infobox fa fa-question-circle-o", node.id);
    //this.updateTooltip(node.id, infoid);
  }

  updateTooltip(token: string, attachTo?: ElementOrId, delay?: number) {
    if (attachTo === undefined) {
      attachTo = token;
    }
    let attachNode = $(attachTo);

    if (!attachNode) return;

    // console.log("tooltips for "+token);
    if (typeof token != "string") {
      console.error("cannot calc tooltip" + token);
      return;
    }
    var tokenInfo = this.getTokenDisplayInfo(token);
    if (tokenInfo.name) {
      attachNode.setAttribute("data-name", this.getTr(tokenInfo.name));
    }
    if (tokenInfo.showtooltip == false) {
      return;
    }
    if (tokenInfo.title) {
      attachNode.setAttribute("title", this.getTr(tokenInfo.title));
      return;
    }

    if (!tokenInfo.tooltip && !tokenInfo.name) {
      return;
    }

    // if (!tokenInfo.tooltip && tokenInfo.name) {
    //   attachNode.setAttribute("title", this.getTr(tokenInfo.name));
    //   return;
    // }

    var main = this.getTooptipHtmlForTokenInfo(tokenInfo);

    if (main) {
      attachNode.classList.add("withtooltip");

      if (attachNode.classList.contains("infonode")) {
        const box = attachNode.querySelector(".infobox") as HTMLElement;
        if (box) {
          attachNode.setAttribute("title", _("Click on ? to see tooltip"));
          this.addTooltipHtml(box.id, main, 1000 * 2);
          box.addEventListener(
            "click",
            (event) => {
              event.stopPropagation();
              return !this.showHelp(box.id, true);
            },
            true,
          );
        }
      } else {
        this.addTooltipHtml(attachNode.id, main, delay ?? this.defaultTooltipDelay);
        attachNode.removeAttribute("title"); // unset title so both title and tooltip do not show up
      }
      this.handleStackedTooltips(attachNode);
    } else {
      attachNode.classList.remove("withtooltip");
    }
  }

  handleStackedTooltips(attachNode: Element){

  }

  removeTooltip(nodeId: string): void {
    if (this.tooltips[nodeId]) 
        console.log('removing tooltip for ',nodeId);
    this.inherited(arguments);
    this.tooltips[nodeId] = null;
  }

  getTooptipHtmlForToken(token: string) {
    if (typeof token != "string") {
      console.error("cannot calc tooltip" + token);
      return null;
    }
    var tokenInfo = this.getTokenDisplayInfo(token);
    // console.log(tokenInfo);
    if (!tokenInfo) return;
    return this.getTooptipHtmlForTokenInfo(tokenInfo);
  }

  getTooptipHtmlForTokenInfo(tokenInfo: TokenDisplayInfo) {
    return this.getTooptipHtml(tokenInfo.name, tokenInfo.tooltip, tokenInfo.imageTypes, tokenInfo.tooltip_action);
  }

  getTokenName(tokenId: string): string {
    var tokenInfo = this.getTokenDisplayInfo(tokenId);
    if (tokenInfo) {
      return this.getTr(tokenInfo.name);
    } else {
      return "? " + tokenId;
    }
  }

  getTokenInfoState(tokenId: string) {
    var tokenInfo = this.gamedatas.tokens[tokenId];
    return parseInt(tokenInfo.state);
  }

  getAllRules(tokenId: string) {
    return this.getRulesFor(tokenId, "*", null);
  }

  getRulesFor(tokenId: string, field?: string, def?: any) {
    if (field === undefined) field = "r";
    var key = tokenId;
    let chain = [key];
    while (key) {
      var info = this.gamedatas.token_types[key];
      if (info === undefined) {
        key = getParentParts(key);
        if (!key) {
          //console.error("Undefined info for " + tokenId);
          return def;
        }
        chain.push(key);
        continue;
      }
      if (field === "*") {
        info["_chain"] = chain.join(" ");
        return info;
      }
      var rule = info[field];
      if (rule === undefined) return def;
      return rule;
    }
    return def;
  }

  getTokenDisplayInfo(tokenId: string): TokenDisplayInfo {
    let tokenInfo = this.getAllRules(tokenId);
    if (!tokenInfo && tokenId && tokenId.startsWith("alt_")) {
      tokenInfo = this.getAllRules(tokenId.substring(4));
    }

    if (!tokenInfo) {
      tokenInfo = {
        key: tokenId,
        _chain: tokenId,
        name: tokenId,
        showtooltip: false,
      };
    } else {
      tokenInfo = dojo.clone(tokenInfo);
    }

    const imageTypes = tokenInfo._chain ?? tokenId ?? "";
    const ita = imageTypes.split(" ");
    const tokenKey = ita[ita.length - 1];
    const declaredTypes = tokenInfo.type || "token";

    tokenInfo.typeKey = tokenKey; // this is key in token_types structure
    tokenInfo.mainType = getPart(tokenId, 0); // first type
    tokenInfo.imageTypes = `${tokenInfo.mainType} ${declaredTypes} ${imageTypes}`.trim(); // other types used for div
    if (tokenInfo.create == 3 || tokenInfo.create == 4) {
      tokenInfo.color = getPart(tokenId, 1);
    }

    if (!tokenInfo.key) {
      tokenInfo.key = tokenId;
    }

    tokenInfo.tokenId = tokenId; 

    this.updateTokenDisplayInfo(tokenInfo);

    return tokenInfo;
  }


  getTokenPresentaton(type: string, tokenKey: string): string {
    return this.getTokenName(tokenKey); // just a name for now
  }

  /** @Override */
  format_string_recursive(log: string, args: any) {
    try {
      if (args.log_others !== undefined && this.player_id != args.player_id) {
        log = args.log_others;
      }

      if (log && args && !args.processed) {
        args.processed = true;

        // if (!args.name && log.includes("{name}")) {
        //   debugger;
        //   console.trace("format_string_recursive(" + log + ")", args);
        // }

        if (args.you) args.you = this.divYou(); // will replace ${you} with colored version
        args.You = this.divYou(); // will replace ${You} with colored version

        var keys = ["token_name", "token_divs", "token_names", "token_div", "token_div_count", "place_name"];
        for (var i in keys) {
          const key = keys[i];
          // console.log("checking " + key + " for " + log);
          if (args[key] === undefined) continue;
          const arg_value = args[key];

          if (key == "token_divs" || key == "token_names") {
            var list = args[key].split(",");
            var res = "";
            for (let l = 0; l < list.length; l++) {
              const value = list[l];
              res += this.getTokenPresentaton(key, value);
            }
            res = res.trim();
            if (res) args[key] = res;
            continue;
          }
          if (typeof arg_value == "string" && this.isMarkedForTranslation(key, args)) {
            continue;
          }
          var res = this.getTokenPresentaton(key, arg_value);
          if (res) args[key] = res;
        }
      }
    } catch (e) {
      console.error(log, args, "Exception thrown", e.stack);
    }
    return this.inherited(arguments);
  }

  /**
   * setClientState and defines handler for onUpdateActionButtons and onToken for specific client state only
   * the setClientState will be called asyncroniously
   * @param name - state name i.e. client_foo
   * @param onUpdate - onUpdateActionButtons handler
   * @param onToken - onToken handler
   * @param args - args passes to setClientState
   */
  setClientStateUpdOn(name: string, onUpdate: (args: any) => void, onToken: (id: string) => void, args?: any) {
    this[`onUpdateActionButtons_${name}`] = onUpdate;
    if (onToken) this[`onToken_${name}`] = onToken;
    setTimeout(() => this.setClientState(name, args), 1);
  }

  updateTokenDisplayInfo(tokenDisplayInfo: TokenDisplayInfo) {
    // override to generate dynamic tooltips and such
  }

  /** default click processor */
  onToken(event: Event, fromMethod?: string) {
    let id = this.onClickSanity(event);
    if (!id) return true;
    if (!fromMethod) fromMethod = "onToken";

    var methodName = fromMethod + "_" + this.getStateName();
    if (this.callfn(methodName, id) === undefined) return false;
    return true;
  }

  setupNotifications(): void {
    super.setupNotifications();

    this.subscribeNotification("tokenMoved");
    this.subscribeNotification("tokenMovedAsync", 1, "tokenMoved"); // same as conter but no delay
    /*
    dojo.subscribe("tokenMoved", this, "notif_tokenMoved");
    this.notifqueue.setSynchronous("tokenMoved", 500);
    dojo.subscribe("tokenMovedAsync", this, "notif_tokenMoved"); // same as tokenMoved but no delay

     */
  }

  notif_tokenMoved(notif: Notif) {
    this.onNotif(notif);
    //	console.log('notif_tokenMoved', notif);
    if (notif.args.list !== undefined) {
      // move bunch of tokens
      for (var i = 0; i < notif.args.list.length; i++) {
        var one = notif.args.list[i];
        var new_state = notif.args.new_state;
        if (new_state === undefined) {
          if (notif.args.new_states !== undefined && notif.args.new_states.length > i) {
            new_state = notif.args.new_states[i];
          }
        }
        this.placeTokenServer(one, notif.args.place_id, new_state, notif.args);
      }
    } else {
      this.placeTokenServer(notif.args.token_id, notif.args.place_id, notif.args.new_state, notif.args);
    }
  }
}
