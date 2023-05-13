var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
// @ts-ignore
GameGui = /** @class */ (function () {
    function GameGui() { }
    return GameGui;
})();
/**
 * Class that extends default bga core game class with more functionality
 * Contains generally usefull features such as animation, additional utils, etc
 */
var GameBasics = /** @class */ (function (_super) {
    __extends(GameBasics, _super);
    function GameBasics() {
        var _this = _super.call(this) || this;
        _this.classActiveSlot = "active_slot";
        _this.defaultTooltipDelay = 400;
        _this.defaultAnimationDuration = 500;
        _this._helpMode = false; // help mode where tooltip shown instead of click action
        _this._displayedTooltip = null; // used in help mode
        console.log("game constructor");
        _this.laststate = null;
        _this.pendingUpdate = false;
        return _this;
    }
    GameBasics.prototype.setup = function (gamedatas) {
        console.log("Starting game setup", gamedatas);
        // add reload Css debug button
        var parent = document.querySelector(".debug_section");
        if (parent) {
            var butt = dojo.create("a", { class: "bgabutton bgabutton_gray", innerHTML: "Reload CSS" }, parent);
            dojo.connect(butt, "onclick", function () { return reloadCss(); });
        }
        this.setupNotifications();
    };
    // state hooks
    GameBasics.prototype.onEnteringState = function (stateName, args) {
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
    };
    GameBasics.prototype.onEnteringState_before = function (stateName, args) {
        // to override
    };
    GameBasics.prototype.onLeavingState = function (stateName) {
        console.log("onLeavingState: " + stateName);
        this.disconnectAllTemp();
        this.removeAllClasses(this.classActiveSlot);
    };
    GameBasics.prototype.onUpdateActionButtons = function (stateName, args) {
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
    };
    GameBasics.prototype.onUpdateActionButtons_before = function (stateName, args) { };
    GameBasics.prototype.onUpdateActionButtons_after = function (stateName, args) {
        if (this.isCurrentPlayerActive()) {
            if (this.on_client_state && !$("button_cancel")) {
                this.addActionButton("button_cancel", _("Cancel"), "onCancel", null, false, "red");
            }
        }
    };
    /**
     *
     * @param {string} methodName
     * @param {object} args
     * @returns
     */
    GameBasics.prototype.callfn = function (methodName, args) {
        if (this[methodName] !== undefined) {
            console.log("Calling " + methodName);
            return this[methodName](args);
        }
        return undefined;
    };
    GameBasics.prototype.ajaxcallwrapper = function (action, args, handler) {
        if (this.checkAction(action)) {
            if (!args) {
                args = {};
            }
            if (args.lock === false) {
                delete args.lock;
            }
            else {
                args.lock = true;
            }
            var gname = this.game_name;
            var url = "/".concat(gname, "/").concat(gname, "/").concat(action, ".html");
            this.ajaxcall(url, args, this, function (result) { }, handler);
        }
    };
    /**
     * This execute a specific action called userAction via ajax and passes json as arguments
     * However php action check will be on "action" and corresponding php method will be called from game.php side
     * @param action
     * @param args
     * @param handler
     */
    GameBasics.prototype.ajaxuseraction = function (action, args, handler) {
        if (this.checkAction(action)) {
            var gname = this.game_name;
            var url = "/".concat(gname, "/").concat(gname, "/userAction.html");
            this.ajaxcall(url, { call: action, lock: true, args: JSON.stringify(args !== null && args !== void 0 ? args : {}) }, //
            this, function (result) { }, handler);
        }
    };
    GameBasics.prototype.onCancel = function (event) {
        if (event)
            dojo.stopEvent(event);
        this.cancelLocalStateEffects();
    };
    GameBasics.prototype.restoreServerData = function () {
        if (typeof this.gamedatas.gamestate.reflexion.initial != "undefined") {
            this.gamedatas_server.gamestate.reflexion.initial = this.gamedatas.gamestate.reflexion.initial;
            this.gamedatas_server.gamestate.reflexion.initial_ts = this.gamedatas.gamestate.reflexion.initial_ts;
        }
        this.gamedatas = dojo.clone(this.gamedatas_server);
    };
    GameBasics.prototype.updateCountersSafe = function (counters) {
        // console.log(counters);
        var safeCounters = {};
        for (var key in counters) {
            if (counters.hasOwnProperty(key) && $(key)) {
                safeCounters[key] = counters[key];
                var node = $(key);
                if (node)
                    node.innerHTML = counters[key].counter_value;
            }
            else {
                console.log("unknown counter " + key);
            }
        }
        this.updateCounters(safeCounters);
    };
    GameBasics.prototype.cancelLocalStateEffects = function () {
        this.disconnectAllTemp();
        this.restoreServerData();
        this.updateCountersSafe(this.gamedatas.counters);
        this.restoreServerGameState();
    };
    // ANIMATIONS
    /**
     * This method will remove all inline style added to element that affect positioning
     */
    GameBasics.prototype.stripPosition = function (token) {
        // console.log(token + " STRIPPING");
        // remove any added positioning style
        token = $(token);
        for (var _i = 0, _a = ["display", "top", "left", "position", "opacity", "bottom", "right"]; _i < _a.length; _i++) {
            var key = _a[_i];
            $(token).style.removeProperty(key);
        }
    };
    /**
     * This method will attach mobile to a new_parent without destroying, unlike original attachToNewParent which destroys mobile and
     * all its connectors (onClick, etc)
     */
    GameBasics.prototype.attachToNewParentNoDestroy = function (mobile_in, new_parent_in, relation, mobileStyle) {
        //console.log("attaching ",mobile,new_parent,relation);
        var mobile = $(mobile_in);
        var newParent = $(new_parent_in);
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
        var box = {};
        box.left = tgt.left - targetParent.left;
        box.top = tgt.top - targetParent.top;
        return box;
    };
    /*
     * This method is similar to slideToObject but works on object which do not use inline style positioning. It also attaches object to
     * new parent immediately, so parent is correct during animation
     */
    GameBasics.prototype.slideToObjectRelative = function (tokenId, finalPlace, duration, delay, onEnd, relation, mobileStyle) {
        var _this = this;
        var mobileNode = $(tokenId);
        duration = duration !== null && duration !== void 0 ? duration : this.defaultAnimationDuration;
        this.delayedExec(function () {
            mobileNode.classList.add("moving_token");
            if (!mobileStyle) {
                mobileStyle = {
                    position: "relative",
                    top: "0px",
                    left: "0px",
                };
            }
            var box = _this.attachToNewParentNoDestroy(mobileNode, finalPlace, relation, mobileStyle);
            mobileNode.style.transition = "all " + duration + "ms ease-in-out";
            mobileNode.style.left = box.left + "px";
            mobileNode.style.top = box.top + "px";
        }, function () {
            mobileNode.style.removeProperty("transition");
            _this.stripPosition(mobileNode);
            mobileNode.classList.remove("moving_token");
            setStyleAttributes(mobileNode, mobileStyle);
            if (onEnd)
                onEnd(mobileNode);
        }, duration, delay);
    };
    GameBasics.prototype.slideToObjectAbsolute = function (tokenId, finalPlace, x, y, duration, delay, onEnd, relation, mobileStyle) {
        var _this = this;
        var mobileNode = $(tokenId);
        duration = duration !== null && duration !== void 0 ? duration : this.defaultAnimationDuration;
        this.delayedExec(function () {
            mobileNode.classList.add("moving_token");
            if (!mobileStyle) {
                mobileStyle = {
                    position: "absolute",
                    left: x + "px",
                    top: y + "px",
                };
            }
            _this.attachToNewParentNoDestroy(mobileNode, finalPlace, relation, mobileStyle);
            mobileNode.style.transition = "all " + duration + "ms ease-in-out";
            mobileNode.style.left = x + "px";
            mobileNode.style.top = y + "px";
        }, function () {
            mobileNode.style.removeProperty("transition");
            mobileNode.classList.remove("moving_token");
            setStyleAttributes(mobileNode, mobileStyle);
            if (onEnd)
                onEnd(mobileNode);
        }, duration, delay);
    };
    GameBasics.prototype.delayedExec = function (onStart, onEnd, duration, delay) {
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
        }
        else {
            onStart();
            if (onEnd) {
                setTimeout(onEnd, duration);
            }
        }
    };
    GameBasics.prototype.slideAndPlace = function (token, finalPlace, tlen, mobileStyle, onEnd) {
        if ($(token).parentNode == $(finalPlace))
            return;
        this.phantomMove(token, finalPlace, tlen, mobileStyle, onEnd);
    };
    GameBasics.prototype.getFulltransformMatrix = function (from, to) {
        var fullmatrix = "";
        var par = from;
        while (par != to && par != null && par != document.body) {
            var style = window.getComputedStyle(par);
            var matrix = style.transform; //|| "matrix(1,0,0,1,0,0)";
            if (matrix && matrix != "none")
                fullmatrix += " " + matrix;
            par = par.parentNode;
            // console.log("tranform  ",fullmatrix,par);
        }
        return fullmatrix;
    };
    GameBasics.prototype.projectOnto = function (from, postfix, ontoWhat) {
        var elem = $(from);
        var over;
        if (ontoWhat)
            over = $(ontoWhat);
        else
            over = $("oversurface"); // this div has to exists with pointer-events: none and cover all area with high zIndex
        var par = elem.parentNode;
        var elemRect = elem.getBoundingClientRect();
        //console.log("elemRect", elemRect);
        var newId = elem.id + postfix;
        var old = $(newId);
        if (old)
            old.parentNode.removeChild(old);
        var clone = elem.cloneNode(true);
        clone.id = newId;
        clone.classList.add("phantom");
        clone.classList.add("phantom" + postfix);
        var fullmatrix = this.getFulltransformMatrix(elem.parentNode, over.parentNode);
        over.appendChild(clone);
        var cloneRect = clone.getBoundingClientRect();
        var centerY = elemRect.y + elemRect.height / 2;
        var centerX = elemRect.x + elemRect.width / 2;
        // centerX/Y is where the center point must be
        // I need to calculate the offset from top and left
        // Therefore I remove half of the dimensions + the existing offset
        var offsetX = centerX - cloneRect.width / 2 - cloneRect.x;
        var offsetY = centerY - cloneRect.height / 2 - cloneRect.y;
        // Then remove the clone's parent position (since left/top is from tthe parent)
        //console.log("cloneRect", cloneRect);
        // @ts-ignore
        clone.style.left = offsetX + "px";
        clone.style.top = offsetY + "px";
        clone.style.transform = fullmatrix;
        return clone;
    };
    GameBasics.prototype.phantomMove = function (mobileId, newparentId, duration, mobileStyle, onEnd) {
        var mobileNode = $(mobileId);
        if (!mobileNode)
            throw new Error("Does not exists ".concat(mobileId));
        var newparent = $(newparentId);
        if (!newparent)
            throw new Error("Does not exists ".concat(newparentId));
        if (!duration)
            duration = this.defaultAnimationDuration;
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
        setTimeout(function () {
            mobileNode.style.removeProperty("opacity"); // restore visibility of original
            if (clone.parentNode)
                clone.parentNode.removeChild(clone); // destroy clone
            if (onEnd)
                onEnd(mobileNode);
        }, duration);
    };
    // HTML MANIPULATIONS
    /**
     * Create node from string and place on location. The divstr has to be single root node.
     * @param divstr - single root node html string
     * @param location - optional location
     * @returns element
     */
    GameBasics.prototype.createHtml = function (divstr, location) {
        var tempHolder = document.createElement("div");
        tempHolder.innerHTML = divstr;
        var div = tempHolder.firstElementChild;
        var parentNode = document.getElementById(location);
        if (parentNode)
            parentNode.appendChild(div);
        return div;
    };
    GameBasics.prototype.createDivNode = function (id, classes, location) {
        var _a;
        var div = document.createElement("div");
        if (id)
            div.id = id;
        if (classes) {
            var classesList = classes.split(/  */);
            (_a = div.classList).add.apply(_a, classesList);
        }
        var parentNode = location ? document.getElementById(location) : null;
        if (parentNode)
            parentNode.appendChild(div);
        else if (location) {
            console.error("Cannot find location [" + location + "] for ", div);
        }
        return div;
    };
    GameBasics.prototype.getTooptipHtml = function (name, message, imgTypes, action) {
        if (name == null || message == "-")
            return "";
        if (!message)
            message = "";
        var divImg = "";
        var containerType = "tooltipcontainer ";
        if (imgTypes) {
            divImg = "<div class='tooltipimage ".concat(imgTypes, "'></div>");
            var itypes = imgTypes.split(" ");
            for (var i = 0; i < itypes.length; i++) {
                containerType += itypes[i] + "_tooltipcontainer ";
            }
        }
        var name_tr = this.getTr(name);
        var message_tr = this.getTr(message);
        var actionLine = action ? this.getActionLine(action) : "";
        return "<div class='".concat(containerType, "'>\n        <div class='tooltiptitle'>").concat(name_tr, "</div>\n        <div class='tooltip-body-separator'></div>\n        <div class='tooltip-body'>\n           ").concat(divImg, "\n           <div class='tooltipmessage tooltiptext'>").concat(message_tr, "</div>\n        </div>\n        ").concat(actionLine, "\n    </div>");
    };
    GameBasics.prototype.showHelp = function (id, force) {
        if (!force)
            if (!this._helpMode)
                return false;
        if (this.tooltips[id]) {
            dijit.hideTooltip(id);
            this._displayedTooltip = new ebg.popindialog();
            this._displayedTooltip.create("current_tooltip");
            var html = this.tooltips[id].getContent($(id));
            this._displayedTooltip.setContent(html);
            this._displayedTooltip.show();
        }
        return true;
    };
    GameBasics.prototype.getTr = function (name) {
        if (name === undefined)
            return null;
        if (name.log !== undefined) {
            name = this.format_string_recursive(name.log, name.args);
        }
        else {
            name = this.clienttranslate_string(name);
        }
        return name;
    };
    GameBasics.prototype.isMarkedForTranslation = function (key, args) {
        if (!args.i18n) {
            return false;
        }
        else {
            var i = args.i18n.indexOf(key);
            if (i >= 0) {
                return true;
            }
        }
        return false;
    };
    GameBasics.prototype.getActionLine = function (text) {
        return ("<img class='imgtext' src='" + g_themeurl + "img/layout/help_click.png' alt='action' /> <span class='tooltiptext'>" + text + "</span>");
    };
    GameBasics.prototype.setDescriptionOnMyTurn = function (text, moreargs) {
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
        }
        else {
            this.setMainTitle(title);
        }
    };
    GameBasics.prototype.setMainTitle = function (text) {
        var main = $("pagemaintitletext");
        main.innerHTML = text;
    };
    GameBasics.prototype.divYou = function () {
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
    };
    // INPUT CONNECTORS
    GameBasics.prototype.setActiveSlot = function (node) {
        if (!$(node)) {
            this.showError("Not found " + node);
            return;
        }
        $(node).classList.add(this.classActiveSlot);
    };
    GameBasics.prototype.setActiveSlots = function (params) {
        for (var index = 0; index < params.length; index++) {
            var element = params[index];
            this.setActiveSlot(element);
        }
    };
    GameBasics.prototype.connectClickTemp = function (node, handler) {
        node.classList.add(this.classActiveSlot, "temp_click_handler");
        this.connect(node, "click", handler);
    };
    GameBasics.prototype.connectAllTemp = function (query, handler) {
        var _this = this;
        document.querySelectorAll(query).forEach(function (node) {
            _this.connectClickTemp(node, handler);
        });
    };
    GameBasics.prototype.disconnectClickTemp = function (node) {
        node.classList.remove(this.classActiveSlot, "temp_click_handler");
        this.disconnect(node, "click");
    };
    GameBasics.prototype.disconnectAllTemp = function (query) {
        var _this = this;
        if (!query)
            query = ".temp_click_handler";
        document.querySelectorAll(query).forEach(function (node) {
            //console.log("disconnecting => " + node.id);
            _this.disconnectClickTemp(node);
        });
    };
    /**
     * Remove all listed class from all document elements
     * @param classes - list of classes separated by space
     */
    GameBasics.prototype.removeAllClasses = function (classes) {
        if (!classes)
            return;
        var classesList = classes.split(/  */);
        classesList.forEach(function (className) {
            document.querySelectorAll(".".concat(className)).forEach(function (node) {
                node.classList.remove(className);
            });
        });
    };
    /**
     * setClientState and defines handler for onUpdateActionButtons
     * the setClientState will be called asyncroniously
     * @param name - state name i.e. client_foo
     * @param onUpdate - handler
     * @param args - args passes to setClientState
     */
    GameBasics.prototype.setClientStateUpd = function (name, onUpdate, args) {
        var _this = this;
        this["onUpdateActionButtons_".concat(name)] = onUpdate;
        setTimeout(function () { return _this.setClientState(name, args); }, 1);
    };
    // ASSORTED UTILITY
    GameBasics.prototype.setDomTokenState = function (tokenId, newState) {
        // XXX it should not be here
    };
    /** @Override onScriptError from gameui */
    GameBasics.prototype.onScriptError = function (msg, url, linenumber) {
        if (gameui.page_is_unloading) {
            // Don't report errors during page unloading
            return;
        }
        // In anycase, report these errors in the console
        console.error(msg);
        // cannot call super - dojo still have to used here
        //super.onScriptError(msg, url, linenumber);
        return this.inherited(arguments);
    };
    GameBasics.prototype.showError = function (log, args) {
        if (typeof args == "undefined") {
            args = {};
        }
        args.you = this.divYou();
        var message = this.format_string_recursive(log, args);
        this.showMessage(message, "error");
        console.error(message);
        return;
    };
    /**
     * This is convenient function to be called when processing click events, it - remembers id of object - stops propagation - logs to
     * console - the if checkActive is set to true check if element has active_slot class
     */
    GameBasics.prototype.onClickSanity = function (event, checkActiveSlot, checkActivePlayer) {
        var id = event.currentTarget.id;
        // Stop this event propagation
        dojo.stopEvent(event); // XXX
        console.log("on slot " + id);
        if (!id)
            return null;
        if (this.showHelp(id))
            return null;
        if (checkActiveSlot && !id.startsWith("button_") && !this.checkActiveSlot(id)) {
            return null;
        }
        if (checkActivePlayer && !this.checkActivePlayer()) {
            return null;
        }
        id = id.replace("tmp_", "");
        id = id.replace("button_", "");
        return id;
    };
    GameBasics.prototype.checkActivePlayer = function () {
        if (!this.isCurrentPlayerActive()) {
            this.showMessage(__("lang_mainsite", "This is not your turn"), "error");
            return false;
        }
        return true;
    };
    GameBasics.prototype.isActiveSlot = function (id) {
        if (dojo.hasClass(id, this.classActiveSlot)) {
            return true;
        }
        if (dojo.hasClass(id, "hidden_" + this.classActiveSlot)) {
            return true;
        }
        return false;
    };
    GameBasics.prototype.checkActiveSlot = function (id) {
        if (!this.isActiveSlot(id)) {
            this.showMoveUnauthorized();
            return false;
        }
        return true;
    };
    GameBasics.prototype.getStateName = function () {
        return this.gamedatas.gamestate.name;
    };
    GameBasics.prototype.getServerStateName = function () {
        return this.last_server_state.name;
    };
    GameBasics.prototype.getPlayerColor = function (playerId) {
        var _a;
        return (_a = this.gamedatas.players[playerId]) !== null && _a !== void 0 ? _a : "000000";
    };
    GameBasics.prototype.getPlayerIdByColor = function (color) {
        for (var playerId in this.gamedatas.players) {
            var playerInfo = this.gamedatas.players[playerId];
            if (color === playerInfo.color) {
                return playerId;
            }
        }
        return undefined;
    };
    GameBasics.prototype.isReadOnly = function () {
        return this.isSpectator || typeof g_replayFrom != "undefined" || g_archive_mode;
    };
    // NOTIFICATIONS
    GameBasics.prototype.setupNotifications = function () {
        console.log("notifications subscriptions setup");
        dojo.subscribe("counter", this, "notif_counter");
        this.notifqueue.setSynchronous("counter", 100);
        dojo.subscribe("counterAsync", this, "notif_counter"); // same as conter but no delay
        dojo.subscribe("score", this, "notif_score");
        this.notifqueue.setSynchronous("score", 50); // XXX
        dojo.subscribe("scoreAsync", this, "notif_score"); // same as score but no delay
        dojo.subscribe("message_warning", this, "notif_message_warning");
        dojo.subscribe("message_info", this, "notif_message_info");
        dojo.subscribe("message", this, "notif_message");
        dojo.subscribe("speechBubble", this, "notif_speechBubble");
        this.notifqueue.setSynchronous("speechBubble", 5000);
        dojo.subscribe("log", this, "notif_log");
    };
    GameBasics.prototype.notif_log = function (notif) {
        if (notif.log) {
            console.log(notif.log, notif.args);
            var message = this.format_string_recursive(notif.log, notif.args);
            if (message != notif.log)
                console.log(message);
        }
        else {
            console.log("hidden log", notif.args);
        }
    };
    GameBasics.prototype.notif_message_warning = function (notif) {
        if (!this.isReadOnly() && !this.instantaneousMode) {
            var message = this.format_string_recursive(notif.log, notif.args);
            this.showMessage(_("Warning:") + " " + message, "warning");
        }
        this.onNotif(notif);
    };
    GameBasics.prototype.notif_message_info = function (notif) {
        if (!this.isReadOnly() && !this.instantaneousMode) {
            var message = this.format_string_recursive(notif.log, notif.args);
            this.showMessage(_("Announcement:") + " " + message, "info");
        }
        this.onNotif(notif);
    };
    GameBasics.prototype.notif_message = function (notif) {
        this.onNotif(notif);
    };
    GameBasics.prototype.ntf_gameStateMultipleActiveUpdate = function (notif) {
        this.gamedatas.gamestate.descriptionmyturn = '...';
        return this.inherited(arguments);
    };
    GameBasics.prototype.onNotif = function (notif) {
        if (!this.instantaneousMode && notif.log) {
            this.setDescriptionOnMyTurn(notif.log, notif.args);
        }
    };
    GameBasics.prototype.notif_speechBubble = function (notif) {
        var html = this.format_string_recursive(notif.args.text, notif.args.args);
        var duration = notif.args.duration ? notif.args.duration : 1000;
        this.notifqueue.setSynchronous("speechBubble", duration);
        this.showBubble(notif.args.target, html, notif.args.delay, duration);
    };
    GameBasics.prototype.notif_counter = function (notif) {
        try {
            this.onNotif(notif);
            var name_1 = notif.args.counter_name;
            var value = void 0;
            if (notif.args.counter_value !== undefined) {
                value = notif.args.counter_value;
            }
            else {
                var counter_inc = notif.args.counter_inc;
                value = notif.args.counter_value = this.gamedatas.counters[name_1].counter_value + counter_inc;
            }
            if (this.gamedatas.counters[name_1]) {
                var counters = {};
                counters[name_1] = {
                    counter_name: name_1,
                    counter_value: value,
                };
                if (this.gamedatas_server && this.gamedatas_server.counters[name_1])
                    this.gamedatas_server.counters[name_1].counter_value = value;
                this.updateCountersSafe(counters);
            }
            else if ($(name_1)) {
                this.setDomTokenState(name_1, value);
            }
            //  console.log("** notif counter " + notif.args.counter_name + " -> " + notif.args.counter_value);
        }
        catch (ex) {
            console.error("Cannot update " + notif.args.counter_name, notif, ex, ex.stack);
        }
    };
    GameBasics.prototype.notif_score = function (notif) {
        this.onNotif(notif);
        var args = notif.args;
        console.log(notif);
        var prev = this.scoreCtrl[args.player_id].getValue();
        var inc = args.player_score - prev;
        this.scoreCtrl[args.player_id].toValue(args.player_score);
        if (args.target) {
            var duration = notif.args.duration ? notif.args.duration : 1000;
            this.notifqueue.setSynchronous("score", duration);
            var color = this.gamedatas.this.displayScoring(args.target, args.color, inc, args.duration);
        }
    };
    return GameBasics;
}(GameGui));
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
    if (arr.length <= 1)
        return "";
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
function setStyleAttributes(element, attrs) {
    if (attrs !== undefined) {
        Object.keys(attrs).forEach(function (key) {
            element.style.setProperty(key, attrs[key]);
        });
    }
}
var Card = /** @class */ (function () {
    function Card() {
    }
    return Card;
}());
;
var GameTokens = /** @class */ (function (_super) {
    __extends(GameTokens, _super);
    function GameTokens() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    GameTokens.prototype.setup = function (gamedatas) {
        _super.prototype.setup.call(this, gamedatas);
        this.restoreList = []; // list of object dirtied during client state visualization
        this.gamedatas_server = dojo.clone(this.gamedatas);
        var first_player_id = Object.keys(gamedatas.players)[0];
        if (!this.isSpectator)
            this.player_color = gamedatas.players[this.player_id].color;
        else
            this.player_color = gamedatas.players[first_player_id].color;
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
    };
    GameTokens.prototype.onEnteringState_before = function (stateName, args) {
        if (!this.on_client_state) {
            // we can use it to preserve arguments for client states
            this.clientStateArgs = {};
        }
    };
    GameTokens.prototype.cancelLocalStateEffects = function () {
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
        _super.prototype.cancelLocalStateEffects.call(this);
    };
    GameTokens.prototype.addCancelButton = function () {
        var _this = this;
        if (!$("button_cancel")) {
            this.addActionButton("button_cancel", _("Cancel"), function () { return _this.cancelLocalStateEffects(); }, null, null, "red");
        }
    };
    GameTokens.prototype.setupPlayer = function (playerInfo) {
        console.log("player info " + playerInfo.id, playerInfo);
        var mini = $("miniboard_".concat(playerInfo.color));
        var pp = "player_panel_content_".concat(playerInfo.color);
        document.querySelectorAll("#".concat(pp, ">.miniboard")).forEach(function (node) { return dojo.destroy(node); });
        $(pp).appendChild(mini);
    };
    GameTokens.prototype.getAllLocations = function () {
        var res = [];
        for (var key in this.gamedatas.token_types) {
            var info = this.gamedatas.token_types[key];
            if (this.isLocationByType(key) && info.scope != "player")
                res.push(key);
        }
        for (var token in this.gamedatas.tokens) {
            var tokenInfo = this.gamedatas.tokens[token];
            var location = tokenInfo.location;
            if (res.indexOf(location) < 0)
                res.push(location);
        }
        return res;
    };
    GameTokens.prototype.isLocationByType = function (id) {
        return this.hasType(id, "location");
    };
    GameTokens.prototype.hasType = function (id, type) {
        var loc = this.getRulesFor(id, "type", "");
        var split = loc.split(" ");
        return split.indexOf(type) >= 0;
    };
    GameTokens.prototype.setupTokens = function () {
        console.log("Setup tokens");
        for (var counter in this.gamedatas.counters) {
            this.placeTokenWithTips(counter);
        }
        this.updateCountersSafe(this.gamedatas.counters);
        for (var _i = 0, _a = this.getAllLocations(); _i < _a.length; _i++) {
            var loc = _a[_i];
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
        for (var _b = 0, _c = this.getAllLocations(); _b < _c.length; _b++) {
            var loc = _c[_b];
            this.updateTooltip(loc);
        }
        for (var token in this.gamedatas.tokens) {
            this.updateTooltip(token);
        }
    };
    GameTokens.prototype.setTokenInfo = function (token_id, place_id, new_state, serverdata) {
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
        if (serverdata === undefined)
            serverdata = true;
        if (serverdata && this.gamedatas_server)
            this.gamedatas_server.tokens[token] = dojo.clone(this.gamedatas.tokens[token]);
        return this.gamedatas.tokens[token];
    };
    GameTokens.prototype.hideCard = function (tokenId) {
        this.limbo.appendChild($(tokenId));
    };
    GameTokens.prototype.getPlaceRedirect = function (tokenInfo) {
        var _this = this;
        var location = tokenInfo.location;
        var result = {
            location: location,
            key: tokenInfo.key,
            state: tokenInfo.state,
        };
        if (location.startsWith("discard")) {
            result.onEnd = function (node) { return _this.hideCard(node); };
        }
        else if (location.startsWith("deck")) {
            result.onEnd = function (node) { return _this.hideCard(node); };
        }
        return result;
    };
    GameTokens.prototype.saveRestore = function (tokenId, force) {
        if (this.on_client_state || force) {
            if (!tokenId)
                return;
            if (typeof tokenId != "string") {
                tokenId = tokenId.id;
            }
            if (this.restoreList.indexOf(tokenId) < 0) {
                this.restoreList.push(tokenId);
            }
        }
    };
    GameTokens.prototype.setDomTokenState = function (tokenId, newState) {
        var node = $(tokenId);
        // console.log(token + "|=>" + newState);
        if (!node)
            return;
        this.saveRestore(node);
        node.setAttribute("data-state", newState);
    };
    GameTokens.prototype.getDomTokenLocation = function (tokenId) {
        return $(tokenId).parentNode.id;
    };
    GameTokens.prototype.getDomTokenState = function (tokenId) {
        return parseInt($(tokenId).parentNode.getAttribute("data-state") || "0");
    };
    GameTokens.prototype.createToken = function (placeInfo) {
        var _a;
        var tokenId = placeInfo.key;
        var info = this.getTokenDisplayInfo(tokenId);
        var place = (_a = placeInfo.location) !== null && _a !== void 0 ? _a : this.getRulesFor(tokenId, "location");
        var tokenDiv = this.createDivNode(info.key, info.imageTypes, place);
        if (placeInfo.onClick) {
            this.connect(info.key, "onclick", placeInfo.onClick);
        }
        return tokenDiv;
    };
    GameTokens.prototype.syncTokenDisplayInfo = function (tokenNode) {
        var _a;
        if (!tokenNode.getAttribute("data-info")) {
            var displayInfo = this.getTokenDisplayInfo(tokenNode.id);
            var classes = displayInfo.imageTypes.split(/  */);
            (_a = tokenNode.classList).add.apply(_a, classes);
            //dojo.addClass(tokenNode, displayInfo.imageTypes);
            tokenNode.setAttribute("data-info", "1");
        }
    };
    GameTokens.prototype.updateLocalCounters = function (tokenInfo) {
        // not implemented, override
    };
    GameTokens.prototype.placeTokenLocal = function (tokenId, location, state, args) {
        var tokenInfo = this.setTokenInfo(tokenId, location, state, false);
        this.on_client_state = true;
        this.placeTokenWithTips(tokenId, tokenInfo, args);
        if (this.instantaneousMode) {
            // skip counters update
        }
        else {
            this.updateLocalCounters(tokenInfo);
        }
    };
    GameTokens.prototype.placeTokenServer = function (tokenId, location, state, args) {
        var tokenInfo = this.setTokenInfo(tokenId, location, state, true);
        this.placeTokenWithTips(tokenId, tokenInfo, args);
    };
    GameTokens.prototype.placeToken = function (token, tokenInfo, args) {
        var _a;
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
                var rules = this.getAllRules(token);
                if (rules)
                    tokenInfo = this.setTokenInfo(token, rules.location, rules.state, false);
                else
                    tokenInfo = this.setTokenInfo(token, undefined, undefined, false);
                if (tokenNode) {
                    tokenInfo = this.setTokenInfo(token, this.getDomTokenLocation(tokenNode), this.getDomTokenState(tokenNode), false);
                }
                noAnnimation = true;
            }
            var placeInfo = this.getPlaceRedirect(tokenInfo);
            var location_1 = placeInfo.location;
            // console.log(token + ": " + " -place-> " + place + " " + tokenInfo.state);
            this.saveRestore(token);
            if (tokenNode == null) {
                //debugger;
                tokenNode = this.createToken(placeInfo);
            }
            this.syncTokenDisplayInfo(tokenNode);
            var state = 0;
            if (tokenInfo)
                state = tokenInfo.state;
            this.setDomTokenState(tokenNode, state);
            if (dojo.hasClass(tokenNode, "infonode")) {
                this.placeInfoBox(tokenNode);
            }
            if (placeInfo.nop) {
                // no placement
                this.renderSpecificToken(tokenNode);
                return;
            }
            if (!$(location_1)) {
                debugger;
                console.error("Unknown place " + location_1 + " for " + tokenInfo.key + " " + token);
                return;
            }
            if (location_1 === "dev_null") {
                // no annimation
                noAnnimation = true;
            }
            if (this.instantaneousMode || typeof g_replayFrom != "undefined" || args.noa || placeInfo.animtime == 0) {
                noAnnimation = true;
            }
            // console.log(token + ": " + tokenInfo.key + " -move-> " + place + " " + tokenInfo.state);
            var animtime = (_a = placeInfo.animtime) !== null && _a !== void 0 ? _a : this.defaultAnimationDuration;
            if (!tokenNode.parentNode)
                noAnnimation = true;
            if (noAnnimation)
                animtime = 0;
            var mobileStyle = undefined;
            if (placeInfo.x !== undefined || placeInfo.y !== undefined) {
                mobileStyle = {
                    position: placeInfo.position || "absolute",
                    left: placeInfo.x + "px",
                    top: placeInfo.y + "px",
                };
            }
            this.slideAndPlace(tokenNode, location_1, animtime, mobileStyle, placeInfo.onEnd);
            this.renderSpecificToken(tokenNode);
            if (this.instantaneousMode) {
                // skip counters update
            }
            else {
                //this.updateMyCountersAll();
            }
        }
        catch (e) {
            console.error("Exception thrown", e, e.stack);
            // this.showMessage(token + " -> FAILED -> " + place + "\n" + e, "error");
        }
        return tokenNode;
    };
    GameTokens.prototype.placeTokenWithTips = function (token, tokenInfo, args) {
        if (!tokenInfo) {
            tokenInfo = this.gamedatas.tokens[token];
        }
        this.placeToken(token, tokenInfo, args);
        this.updateTooltip(token);
        if (tokenInfo)
            this.updateTooltip(tokenInfo.location);
    };
    GameTokens.prototype.placeInfoBoxClass = function (clazz) {
        var _this = this;
        document.querySelectorAll("." + clazz).forEach(function (node) { return _this.placeInfoBox(node); });
    };
    GameTokens.prototype.placeInfoBox = function (node) {
        node = $(node);
        var boxes = node.querySelectorAll(".infobox");
        if (boxes.length > 0)
            return;
        var infoid = node.id + "_info";
        this.createDivNode(infoid, "infobox fa fa-question-circle-o", node.id);
        //this.updateTooltip(node.id, infoid);
    };
    GameTokens.prototype.updateTooltip = function (token, attachTo, delay) {
        var _this = this;
        if (attachTo === undefined) {
            attachTo = token;
        }
        var attachNode = $(attachTo);
        if (!attachNode)
            return;
        // console.log("tooltips for "+token);
        if (typeof token != "string") {
            console.error("cannot calc tooltip" + token);
            return;
        }
        var tokenInfo = this.getTokenDisplayInfo(token);
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
        if (!tokenInfo.tooltip && tokenInfo.name) {
            attachNode.setAttribute("title", this.getTr(tokenInfo.name));
            return;
        }
        var main = this.getTooptipHtmlForTokenInfo(tokenInfo);
        if (main) {
            attachNode.classList.add("withtooltip");
            if (attachNode.classList.contains("infonode")) {
                var box_1 = attachNode.querySelector(".infobox");
                if (box_1) {
                    attachNode.setAttribute("title", _("Click on ? to see tooltip"));
                    this.addTooltipHtml(box_1.id, main, 1000 * 2);
                    box_1.addEventListener("click", function (event) {
                        event.stopPropagation();
                        return !_this.showHelp(box_1.id, true);
                    }, true);
                }
            }
            else {
                this.addTooltipHtml(attachNode.id, main, delay !== null && delay !== void 0 ? delay : this.defaultTooltipDelay);
                attachNode.removeAttribute("title"); // unset title so both title and tooltip do not show up
            }
        }
        else {
            attachNode.classList.remove("withtooltip");
        }
    };
    GameTokens.prototype.getTooptipHtmlForToken = function (token) {
        if (typeof token != "string") {
            console.error("cannot calc tooltip" + token);
            return null;
        }
        var tokenInfo = this.getTokenDisplayInfo(token);
        // console.log(tokenInfo);
        if (!tokenInfo)
            return;
        return this.getTooptipHtmlForTokenInfo(tokenInfo);
    };
    GameTokens.prototype.getTooptipHtmlForTokenInfo = function (tokenInfo) {
        return this.getTooptipHtml(tokenInfo.name, tokenInfo.tooltip, tokenInfo.imageTypes, tokenInfo.tooltip_action);
    };
    GameTokens.prototype.getTokenName = function (tokenId) {
        var tokenInfo = this.getTokenDisplayInfo(tokenId);
        if (tokenInfo) {
            return this.getTr(tokenInfo.name);
        }
        else {
            return "? " + tokenId;
        }
    };
    GameTokens.prototype.getTokenInfoState = function (tokenId) {
        var tokenInfo = this.gamedatas.tokens[tokenId];
        return parseInt(tokenInfo.state);
    };
    GameTokens.prototype.getAllRules = function (tokenId) {
        return this.getRulesFor(tokenId, "*", null);
    };
    GameTokens.prototype.getRulesFor = function (tokenId, field, def) {
        if (field === undefined)
            field = "r";
        var key = tokenId;
        var chain = [key];
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
            if (rule === undefined)
                return def;
            return rule;
        }
        return def;
    };
    GameTokens.prototype.getTokenDisplayInfo = function (tokenId) {
        var _a, _b;
        var tokenInfo = this.getAllRules(tokenId);
        if (!tokenInfo) {
            tokenInfo = {
                key: tokenId,
                _chain: tokenId,
                name: tokenId,
            };
        }
        else {
            tokenInfo = dojo.clone(tokenInfo);
        }
        var imageTypes = (_b = (_a = tokenInfo._chain) !== null && _a !== void 0 ? _a : tokenId) !== null && _b !== void 0 ? _b : "";
        var ita = imageTypes.split(" ");
        var tokenKey = ita[ita.length - 1];
        var declaredTypes = tokenInfo.type || "token";
        tokenInfo.typeKey = tokenKey; // this is key in token_types structure
        tokenInfo.mainType = getPart(tokenId, 0); // first type
        tokenInfo.imageTypes = "".concat(tokenInfo.mainType, " ").concat(declaredTypes, " ").concat(imageTypes).trim(); // other types used for div
        if (!tokenInfo.key) {
            tokenInfo.key = tokenId;
        }
        this.updateTokenDisplayInfo(tokenInfo);
        return tokenInfo;
    };
    GameTokens.prototype.renderSpecificToken = function (tokenNode) { };
    GameTokens.prototype.getTokenPresentaton = function (type, tokenKey) {
        return this.getTokenName(tokenKey); // just a name for now
    };
    /** @Override */
    GameTokens.prototype.format_string_recursive = function (log, args) {
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
                if (args.you)
                    args.you = this.divYou(); // will replace ${you} with colored version
                args.You = this.divYou(); // will replace ${You} with colored version
                var keys = ["token_name", "token_divs", "token_names", "token_div", "token_div_count", "place_name"];
                for (var i in keys) {
                    var key = keys[i];
                    // console.log("checking " + key + " for " + log);
                    if (args[key] === undefined)
                        continue;
                    var arg_value = args[key];
                    if (key == "token_divs" || key == "token_names") {
                        var list = args[key].split(",");
                        var res = "";
                        for (var l = 0; l < list.length; l++) {
                            var value = list[l];
                            res += this.getTokenPresentaton(key, value);
                        }
                        res = res.trim();
                        if (res)
                            args[key] = res;
                        continue;
                    }
                    if (typeof arg_value == "string" && this.isMarkedForTranslation(key, args)) {
                        continue;
                    }
                    var res = this.getTokenPresentaton(key, arg_value);
                    if (res)
                        args[key] = res;
                }
            }
        }
        catch (e) {
            console.error(log, args, "Exception thrown", e.stack);
        }
        return this.inherited(arguments);
    };
    /**
     * setClientState and defines handler for onUpdateActionButtons and onToken for specific client state only
     * the setClientState will be called asyncroniously
     * @param name - state name i.e. client_foo
     * @param onUpdate - onUpdateActionButtons handler
     * @param onToken - onToken handler
     * @param args - args passes to setClientState
     */
    GameTokens.prototype.setClientStateUpdOn = function (name, onUpdate, onToken, args) {
        var _this = this;
        this["onUpdateActionButtons_".concat(name)] = onUpdate;
        if (onToken)
            this["onToken_".concat(name)] = onToken;
        setTimeout(function () { return _this.setClientState(name, args); }, 1);
    };
    GameTokens.prototype.updateTokenDisplayInfo = function (tokenDisplayInfo) {
        // override to generate dynamic tooltips and such
    };
    /** default click processor */
    GameTokens.prototype.onToken = function (event, fromMethod) {
        var id = this.onClickSanity(event);
        if (!id)
            return true;
        if (!fromMethod)
            fromMethod = "onToken";
        var methodName = fromMethod + "_" + this.getStateName();
        if (this.callfn(methodName, id) === undefined)
            return false;
        return true;
    };
    GameTokens.prototype.setupNotifications = function () {
        _super.prototype.setupNotifications.call(this);
        dojo.subscribe("tokenMoved", this, "notif_tokenMoved");
        this.notifqueue.setSynchronous("tokenMoved", 500);
        dojo.subscribe("tokenMovedAsync", this, "notif_tokenMoved"); // same as tokenMoved but no delay
    };
    GameTokens.prototype.notif_tokenMoved = function (notif) {
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
        }
        else {
            this.placeTokenServer(notif.args.token_id, notif.args.place_id, notif.args.new_state, notif.args);
        }
    };
    return GameTokens;
}(GameBasics));
/** Game class */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var GameXBody = /** @class */ (function (_super) {
    __extends(GameXBody, _super);
    function GameXBody() {
        return _super.call(this) || this;
    }
    GameXBody.prototype.setup = function (gamedatas) {
        var _this = this;
        this.defaultTooltipDelay = 800;
        //custom destinations for tokens
        this.custom_placement = {
            tracker_t: "temperature_map",
            tracker_o: "oxygen_map",
            tracker_w: "oceans_pile",
        };
        _super.prototype.setup.call(this, gamedatas);
        // hexes are not moved so manually connect
        this.connectClass("hex", "onclick", "onToken");
        document.querySelectorAll(".hex").forEach(function (node) {
            _this.updateTooltip(node.id);
        });
        this.connectClass("filter_button", "onclick", "onFilterButton");
        console.log("Ending game setup");
    };
    GameXBody.prototype.setupPlayer = function (playerInfo) {
        _super.prototype.setupPlayer.call(this, playerInfo);
        //move own player board in main zone
        if (playerInfo.id == this.player_id) {
            var board = $("player_area_".concat(playerInfo.color));
            $("thisplayer_zone").appendChild(board);
        }
    };
    GameXBody.prototype.syncTokenDisplayInfo = function (tokenNode) {
        var _a;
        var _b, _c, _d, _e, _f, _g;
        if (!tokenNode.getAttribute("data-info")) {
            var displayInfo = this.getTokenDisplayInfo(tokenNode.id);
            var classes = displayInfo.imageTypes.split(/  */);
            (_a = tokenNode.classList).add.apply(_a, classes);
            tokenNode.setAttribute("data-info", "1");
            // use this to generate some fake parts of card, remove this when use images
            if (displayInfo.mainType == "card") {
                var tagshtm = "";
                if (!tokenNode.id.startsWith('card_stanproj')) {
                    //tags
                    if (displayInfo.tags && displayInfo.tags != "") {
                        for (var _i = 0, _h = displayInfo.tags.split(' '); _i < _h.length; _i++) {
                            var tag = _h[_i];
                            tagshtm += '<div class="badge tag_' + tag + '"></div>';
                        }
                    }
                    var parsedActions = this.parseActionsToHTML((_c = (_b = displayInfo.a) !== null && _b !== void 0 ? _b : displayInfo.e) !== null && _c !== void 0 ? _c : '');
                    var decor = this.createDivNode(null, "card_decor", tokenNode.id);
                    decor.innerHTML = "\n                <div class=\"card_illustration cardnum_".concat(displayInfo.num, "\"></div>\n                <div class=\"card_bg\"></div>\n                <div class='card_badges'>").concat(tagshtm, "</div>\n                <div class='card_title'>").concat(displayInfo.name, "</div>\n                <div class='card_cost'>").concat(displayInfo.cost, "</div> \n                <div class=\"card_action\">").concat((_e = (_d = displayInfo.a) !== null && _d !== void 0 ? _d : displayInfo.e) !== null && _e !== void 0 ? _e : '', "</div>\n                <div class=\"card_effect\"><div class=\"card_tt\">").concat(displayInfo.text, "</div></div>\n                <div class=\"card_prereq\">").concat((_f = displayInfo.pre) !== null && _f !== void 0 ? _f : '', "</div>\n                <div class=\"card_vp\">").concat((_g = displayInfo.vp) !== null && _g !== void 0 ? _g : '', "</div>\n          ");
                    // <div class="card_action">${parsedActions}</div>
                    //  <div class="card_action">${displayInfo.a ?? displayInfo.e ?? ''}</div>
                }
                else {
                    //standard project formatting:
                    //cost -> action title
                    //except for sell patents
                    var decor = this.createDivNode(null, "stanp_decor", tokenNode.id);
                    var parsedActions = this.parseActionsToHTML(displayInfo.r);
                    //const costhtm='<div class="stanp_cost">'+displayInfo.cost+'</div>';
                    decor.innerHTML = "\n             <div class='stanp_cost'>".concat(displayInfo.cost, "</div>\n             <div class='stanp_arrow'></div>\n             <div class='stanp_action'>").concat(parsedActions, "</div>  \n             <div class='standard_projects_title'>").concat(displayInfo.name, "</div>  \n          ");
                }
                var div = this.createDivNode(null, "card_info_box", tokenNode.id);
                div.innerHTML = "\n\n        <div class='token_title'>".concat(displayInfo.name, "</div>\n        <div class='token_cost'>").concat(displayInfo.cost, "</div> \n        <div class='token_rules'>").concat(displayInfo.r, "</div>\n        <div class='token_descr'>").concat(displayInfo.text, "</div>\n        ");
                tokenNode.appendChild(div);
                tokenNode.setAttribute("data-card-type", displayInfo.t);
            }
            this.connect(tokenNode, "onclick", "onToken");
        }
    };
    GameXBody.prototype.parseActionsToHTML = function (actions) {
        var ret = actions;
        var easyParses = {
            'forest': { classes: 'tracker tracker_forest' },
            'city': { classes: 'tracker tracker_city' },
            'draw': { classes: 'token_img draw_icon' },
            '[1,](sell)': { classes: '' },
            'pe': { classes: 'token_img tracker_e', production: true },
            'pm': { classes: 'token_img tracker_m', production: true, content: "1" },
            'pu': { classes: 'token_img tracker_u', production: true },
            'pp': { classes: 'token_img tracker_p', production: true },
            'ph': { classes: 'token_img tracker_h', production: true },
            'e': { classes: 'token_img tracker_e' },
            'm': { classes: 'token_img tracker_m', content: "1" },
            'u': { classes: 'token_img tracker_u' },
            'p': { classes: 'token_img tracker_p' },
            'h': { classes: 'token_img tracker_h' },
            't': { classes: 'token_img temperature_icon' },
            'w': { classes: 'tile tile_3' },
            ':': { classes: 'action_arrow' },
        };
        var idx = 0;
        var finds = [];
        for (var key in easyParses) {
            var item = easyParses[key];
            if (ret.includes(key)) {
                ret = ret.replace(key, "%" + idx + "%");
                var content = item.content != undefined ? item.content : "";
                if (item.production === true) {
                    finds[idx] = '<div class="outer_production"><div class="' + item.classes + '">' + content + '</div></div>';
                }
                else {
                    finds[idx] = '<div class="' + item.classes + '"></div>';
                }
                idx++;
            }
        }
        //remove ";" between icons
        ret = ret.replace('%;%', '%%');
        //replaces
        for (var key in finds) {
            var htm = finds[key];
            ret = ret.replace('%' + key + '%', htm);
        }
        return ret;
    };
    GameXBody.prototype.renderSpecificToken = function (tokenNode) {
        /* It seems duplicates the other stuff which is already there, disabled for now
        const displayInfo = this.getTokenDisplayInfo(tokenNode.id);
        if (tokenNode && displayInfo && tokenNode.parentNode && displayInfo.location) {
          const originalHtml = tokenNode.outerHTML;
          this.darhflog(
            "checking",
            tokenNode.id,
            "maintype",
            displayInfo.mainType,
            "location inc",
            displayInfo.location.includes("miniboard_")
          );
          if (displayInfo.mainType == "tracker" && displayInfo.location.includes("miniboard_")) {
            const rpDiv = document.createElement("div");
            rpDiv.classList.add("outer_tracker", "outer_" + displayInfo.typeKey);
            rpDiv.innerHTML = '<div class="token_img ' + displayInfo.typeKey + '"></div>' + originalHtml;
            tokenNode.parentNode.replaceChild(rpDiv, tokenNode);
          }
        }*/
    };
    //finer control on how to place things
    GameXBody.prototype.createDivNode = function (id, classes, location) {
        var _a;
        this.darhflog("placing ", id);
        if (id && location && this.custom_placement[id]) {
            location = this.custom_placement[id];
            this.darhflog("placing id elsewhere: ", id, "at location ", location);
        }
        var div = _super.prototype.createDivNode.call(this, id, classes, location);
        this.darhflog("id ".concat(div.id, " has been created at ").concat((_a = div.parentNode) === null || _a === void 0 ? void 0 : _a.id));
        return div;
    };
    GameXBody.prototype.updateTokenDisplayInfo = function (tokenDisplayInfo) {
        var _a;
        // override to generate dynamic tooltips and such
        if (tokenDisplayInfo.mainType == "card") {
            var rules = (_a = tokenDisplayInfo.r) !== null && _a !== void 0 ? _a : "";
            if (tokenDisplayInfo.a)
                rules += ";a:" + tokenDisplayInfo.a;
            if (tokenDisplayInfo.e)
                rules += ";e:" + tokenDisplayInfo.e;
            tokenDisplayInfo.imageTypes += " infonode";
            tokenDisplayInfo.tooltip = rules + "<br>" +
                (tokenDisplayInfo.ac ? "(" + this.getTr(tokenDisplayInfo.ac) + ")<br>" : "") +
                this.getTr(tokenDisplayInfo.text) +
                "<br>" +
                _("Number: " + tokenDisplayInfo.num) +
                (tokenDisplayInfo.tags ? "<br>" + _("Tags: " + tokenDisplayInfo.tags) : "");
            if (tokenDisplayInfo.vp) {
                tokenDisplayInfo.tooltip += "<br>VP:" + tokenDisplayInfo.vp;
            }
        }
        if (this.isLocationByType(tokenDisplayInfo.key)) {
            tokenDisplayInfo.imageTypes += " infonode";
        }
    };
    GameXBody.prototype.getPlaceRedirect = function (tokenInfo) {
        var result = _super.prototype.getPlaceRedirect.call(this, tokenInfo);
        if (tokenInfo.key.startsWith("tracker") && $(tokenInfo.key)) {
            result.nop = true; // do not relocate or do anyting
        }
        else if (tokenInfo.key.startsWith("award")) {
            result.nop = true;
        }
        else if (tokenInfo.key.startsWith("milestone")) {
            result.nop = true;
        }
        else if (this.custom_placement[tokenInfo.key]) {
            result.location = this.custom_placement[tokenInfo.key];
        }
        else if (tokenInfo.key.startsWith('card_main') && tokenInfo.location.startsWith('tableau')) {
            var t = this.getRulesFor(tokenInfo.key, 't');
            if (t !== undefined)
                result.location = tokenInfo.location + "_cards_" + t;
        }
        if (!result.location) // if failed to find revert to server one
            result.location = tokenInfo.location;
        return result;
    };
    GameXBody.prototype.isLayoutVariant = function (num) {
        return this.prefs[100].value == num;
    };
    GameXBody.prototype.darhflog = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (this.isLayoutVariant(1)) {
            console.log.apply(console, args);
        }
    };
    GameXBody.prototype.sendActionResolve = function (op, args) {
        if (!args)
            args = {};
        this.ajaxuseraction("resolve", {
            ops: [__assign({ op: op }, args)],
        });
    };
    GameXBody.prototype.sendActionDecline = function (op) {
        this.ajaxuseraction("decline", {
            ops: [{ op: op }],
        });
    };
    GameXBody.prototype.sendActionSkip = function () {
        this.ajaxuseraction("skip", {});
    };
    GameXBody.prototype.getButtonNameForOperation = function (op) {
        if (op.args.button)
            return this.format_string_recursive(op.args.button, op.args.args);
        else
            return this.getButtonNameForOperationExp(op.type);
    };
    GameXBody.prototype.getButtonNameForOperationExp = function (op) {
        var rules = this.getRulesFor("op_" + op, "*");
        if (rules && rules.name)
            return this.getTr(rules.name);
        return op;
    };
    GameXBody.prototype.getOperationRules = function (opInfo) {
        if (typeof opInfo == "string")
            return this.getRulesFor("op_" + opInfo, "*");
        return this.getRulesFor("op_" + opInfo.type, "*");
    };
    GameXBody.prototype.onUpdateActionButtons_playerConfirm = function (args) {
        var _this = this;
        this.addActionButton("button_0", _("Confirm"), function () {
            _this.ajaxuseraction("confirm");
        });
    };
    GameXBody.prototype.sendActionResolveWithTarget = function (opId, target) {
        this.sendActionResolve(opId, {
            target: target,
        });
        return;
    };
    GameXBody.prototype.activateSlots = function (opInfo, opId, single) {
        var _this = this;
        var _a, _b;
        var opargs = opInfo.args;
        var paramargs = (_a = opargs.target) !== null && _a !== void 0 ? _a : [];
        var ttype = (_b = opargs.ttype) !== null && _b !== void 0 ? _b : "none";
        var from = opInfo.mcount;
        var count = opInfo.count;
        if (single) {
            debugger;
            this.setDescriptionOnMyTurn(opargs.prompt, opargs.args);
            if (paramargs.length == 0) {
                if (count == from) {
                    this.addActionButton("button_" + opId, _("Confirm"), function () {
                        _this.sendActionResolve(opId);
                    });
                }
                else {
                    // counter select stub for now
                    if (from > 0)
                        this.addActionButton("button_" + opId + "_0", from, function () {
                            _this.sendActionResolve(opId, {
                                count: from,
                            });
                        });
                    if (from == 0 && count > 1) {
                        this.addActionButton("button_" + opId + "_1", "1", function () {
                            _this.sendActionResolve(opId, {
                                count: 1,
                            });
                        });
                    }
                    this.addActionButton("button_" + opId + "_max", count + " (max)", function () {
                        // XXX
                        _this.sendActionResolve(opId, {
                            count: count,
                        });
                    });
                }
            }
        }
        if (ttype == "token") {
            paramargs.forEach(function (tid) {
                if (tid == "none") {
                    if (single) {
                        _this.addActionButton("button_none", _("None"), function () {
                            _this.sendActionResolveWithTarget(opId, "none");
                        });
                    }
                }
                else {
                    _this.setActiveSlot(tid);
                    _this.setReverseIdMap(tid, opId, tid);
                    if (single) {
                        if (paramargs.length <= 5) {
                            // magic number?
                            _this.addActionButton("button_" + tid, _this.getTokenName(tid), function () {
                                _this.sendActionResolveWithTarget(opId, tid);
                            });
                        }
                    }
                }
            });
        }
        else if (ttype == "player") {
            paramargs.forEach(function (tid) {
                // XXX need to be pretty
                var _a;
                var playerId = _this.getPlayerIdByColor(tid);
                // here divId can be like player name on miniboard
                var divId = "player_name_".concat(playerId);
                if (single) {
                    var buttonId = "button_" + tid;
                    var name_2 = (_a = _this.gamedatas.players[playerId]) === null || _a === void 0 ? void 0 : _a.name;
                    _this.addActionButton(buttonId, name_2 !== null && name_2 !== void 0 ? name_2 : tid, function () {
                        _this.onSelectTarget(opId, tid);
                    }, undefined, false, 'gray');
                    if (name_2)
                        $(buttonId).style.color = "#" + tid;
                }
                _this.setReverseIdMap(divId, opId, tid);
            });
        }
        else if (ttype == "enum") {
            paramargs.forEach(function (tid, i) {
                var _a;
                if (single) {
                    var detailsInfo = (_a = _this.gamedatas.gamestate.args.operations[opId].args.info) === null || _a === void 0 ? void 0 : _a[tid];
                    var sign = detailsInfo.sign; // 0 complete payment, -1 incomplete, +1 overpay
                    //console.log("enum details "+tid,detailsInfo);
                    var buttonColor = undefined;
                    if (sign < 0)
                        buttonColor = "gray";
                    if (sign > 0)
                        buttonColor = "red";
                    var divId = "button_" + i;
                    _this.addActionButton(divId, tid, function () {
                        _this.onSelectTarget(opId, tid);
                    }, undefined, false, buttonColor);
                }
            });
        }
    };
    GameXBody.prototype.clearReverseIdMap = function () {
        this.reverseIdLookup = new Map();
    };
    GameXBody.prototype.setReverseIdMap = function (divId, opId, target, param_name) {
        var prev = this.reverseIdLookup.get(divId);
        if (prev && prev.opId != opId) {
            // ambiguous lookup
            this.reverseIdLookup.set(divId, 0);
            return;
        }
        this.reverseIdLookup.set(divId, {
            op: opId,
            param_name: param_name !== null && param_name !== void 0 ? param_name : "target",
            target: target !== null && target !== void 0 ? target : divId,
        });
    };
    GameXBody.prototype.onUpdateActionButtons_playerTurnChoice = function (args) {
        var _this = this;
        var _a;
        var operations = args.operations;
        if (!operations)
            return; // XXX
        this.clientStateArgs.call = "resolve";
        this.clientStateArgs.ops = [];
        this.clearReverseIdMap();
        var xop = args.op;
        var single = Object.keys(operations).length == 1;
        var ordered = xop == "," && !single;
        if (ordered)
            this.setDescriptionOnMyTurn("${you} must choose order of operations");
        var i = 0;
        var _loop_1 = function (opIdS) {
            var opId = parseInt(opIdS);
            var opInfo = operations[opId];
            var opargs = opInfo.args;
            var name_3 = this_1.getButtonNameForOperation(opInfo);
            var paramargs = (_a = opargs.target) !== null && _a !== void 0 ? _a : [];
            var singleOrFirst = single || (ordered && i == 0);
            this_1.activateSlots(opInfo, opId, singleOrFirst);
            if (!single && !ordered) {
                // xxx add something for remaining ops in ordered case?
                if (paramargs.length > 0) {
                    this_1.addActionButton("button_" + opId, name_3, function () {
                        _this.setClientStateUpdOn("client_collect", function (args) {
                            // on update action buttons
                            _this.clearReverseIdMap();
                            _this.activateSlots(opInfo, opId, true);
                        }, function (id) {
                            // onToken
                            _this.onSelectTarget(opId, id);
                        });
                    });
                }
                else {
                    this_1.addActionButton("button_" + opId, name_3, function () {
                        _this.sendActionResolve(opId);
                    });
                }
                if (opargs.void) {
                    dojo.addClass("button_" + opId, "disabled");
                }
            }
            // add done (skip) when optional
            if (singleOrFirst) {
                if (opInfo.mcount <= 0)
                    this_1.addActionButton("button_skip", _("Skip"), function () {
                        _this.sendActionSkip();
                    });
            }
            i = i + 1;
        };
        var this_1 = this;
        for (var opIdS in operations) {
            _loop_1(opIdS);
        }
    };
    GameXBody.prototype.onUpdateActionButtons_multiplayerChoice = function (args) {
        var _a;
        var operations = (_a = args.player_operations[this.player_id]) !== null && _a !== void 0 ? _a : undefined;
        if (!operations)
            return;
        this.onUpdateActionButtons_playerTurnChoice(operations);
    };
    GameXBody.prototype.onUpdateActionButtons_after = function (stateName, args) {
        var _this = this;
        if (this.isCurrentPlayerActive()) {
            // add undo on every state
            if (this.on_client_state)
                this.addCancelButton();
            else
                this.addActionButton("button_undo", _("Undo"), function () { return _this.ajaxcallwrapper("undo"); }, undefined, undefined, "red");
        }
    };
    GameXBody.prototype.onSelectTarget = function (opId, target) {
        // can add prompt
        return this.sendActionResolveWithTarget(opId, target);
    };
    // on click hooks
    GameXBody.prototype.onToken_playerTurnChoice = function (tid) {
        var _a;
        var info = this.reverseIdLookup.get(tid);
        if (info && info !== "0") {
            var opId = info.op;
            if (info.param_name == "target")
                this.onSelectTarget(opId, (_a = info.target) !== null && _a !== void 0 ? _a : tid);
            else
                this.showError("Not implemented");
        }
        else {
            this.showMoveUnauthorized();
        }
    };
    GameXBody.prototype.onToken_multiplayerChoice = function (tid) {
        this.onToken_playerTurnChoice(tid);
    };
    GameXBody.prototype.onToken_multiplayerDispatch = function (tid) {
        this.onToken_playerTurnChoice(tid);
    };
    //custom actions
    GameXBody.prototype.onFilterButton = function (event) {
        var id = event.currentTarget.id;
        // Stop this event propagation
        dojo.stopEvent(event); // XXX
        var plcolor = $(id).dataset.player;
        var btncolor = $(id).dataset.color;
        var tblitem = 'visibility' + btncolor;
        $('tableau_' + plcolor).dataset[tblitem] = $('tableau_' + plcolor).dataset[tblitem] == "1" ? "0" : "1";
        $(id).dataset.enabled = $(id).dataset.enabled == "1" ? "0" : "1";
        return true;
    };
    // notifications
    GameXBody.prototype.setupNotifications = function () {
        _super.prototype.setupNotifications.call(this);
    };
    return GameXBody;
}(GameTokens));
var Operation = /** @class */ (function () {
    function Operation() {
    }
    return Operation;
}());
define([
    "dojo",
    "dojo/_base/declare",
    "ebg/core/gamegui",
    "ebg/counter"
], function (dojo, declare) {
    declare("bgagame.mars", ebg.core.gamegui, new GameXBody());
});
