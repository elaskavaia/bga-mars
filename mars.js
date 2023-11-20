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
        _this.defaultTooltipDelay = 800;
        _this.defaultAnimationDuration = 500;
        _this._helpMode = false; // help mode where tooltip shown instead of click action
        _this._displayedTooltip = null; // used in help mode
        _this.zoom = 1.0;
        console.log("game constructor");
        _this.laststate = null;
        _this.pendingUpdate = false;
        return _this;
    }
    GameBasics.prototype.setup = function (gamedatas) {
        console.log("Starting game setup", gamedatas);
        this.setupInfoPanel();
        // add reload Css debug button
        var parent = document.querySelector(".debug_section");
        if (parent && !$("reloadcss")) {
            var butt = dojo.create("a", { id: "reloadcss", class: "bgabutton bgabutton_gray", innerHTML: "Reload CSS" }, parent);
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
    };
    GameBasics.prototype.onUpdateActionButtons_before = function (stateName, args) { };
    GameBasics.prototype.onUpdateActionButtons_after = function (stateName, args) {
        if (this.isCurrentPlayerActive()) {
            if (this.on_client_state && !$("button_cancel")) {
                this.addActionButton("button_cancel", _("Cancel"), "onCancel", null, false, "red");
            }
        }
        this.restoreMainBar();
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
    GameBasics.prototype.ajaxcallwrapper_unchecked = function (action, args, handler) {
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
    };
    GameBasics.prototype.ajaxcallwrapper = function (action, args, handler) {
        if (this.checkAction(action)) {
            this.ajaxcallwrapper_unchecked(action, args, handler);
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
                    left: "0px"
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
                    top: y + "px"
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
        var rel = mobileStyle === null || mobileStyle === void 0 ? void 0 : mobileStyle.relation;
        if (rel) {
            delete mobileStyle.relation;
        }
        if (rel == "first") {
            newparent.insertBefore(mobileNode, null);
        }
        else {
            newparent.appendChild(mobileNode); // move original
        }
        setStyleAttributes(mobileNode, mobileStyle);
        mobileNode.offsetHeight; // recalc
        var desti = this.projectOnto(mobileNode, "_temp2"); // invisible destination on top of new parent
        setStyleAttributes(desti, mobileStyle);
        clone.style.transitionProperty = "all";
        clone.style.transitionDuration = duration + "ms";
        clone.style.visibility = "visible";
        clone.style.opacity = "1";
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
        var parentNode = location ? $(location) : null;
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
    GameBasics.prototype.findActiveParent = function (element) {
        if (this.isActiveSlot(element))
            return element;
        var parent = element.parentElement;
        if (!parent || parent.id == "thething" || parent == element)
            return null;
        return this.findActiveParent(parent);
    };
    /**
     * This is convenient function to be called when processing click events, it - remembers id of object - stops propagation - logs to
     * console - the if checkActive is set to true check if element has active_slot class
     */
    GameBasics.prototype.onClickSanity = function (event, checkActiveSlot, checkActivePlayer) {
        var id = event.currentTarget.id;
        // Stop this event propagation
        dojo.stopEvent(event); // XXX
        if (id == "thething") {
            var node = this.findActiveParent(event.target);
            id = node === null || node === void 0 ? void 0 : node.id;
        }
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
        return (_a = this.gamedatas.players[playerId].color) !== null && _a !== void 0 ? _a : "000000";
    };
    GameBasics.prototype.getPlayerName = function (playerId) {
        var _a;
        return (_a = this.gamedatas.players[playerId].name) !== null && _a !== void 0 ? _a : _("Not a Player");
    };
    GameBasics.prototype.getPlayerIdByColor = function (color) {
        for (var playerId in this.gamedatas.players) {
            var playerInfo = this.gamedatas.players[playerId];
            if (color == playerInfo.color) {
                return parseInt(playerId);
            }
        }
        return undefined;
    };
    GameBasics.prototype.isReadOnly = function () {
        return this.isSpectator || typeof g_replayFrom != "undefined" || g_archive_mode;
    };
    GameBasics.prototype.addCancelButton = function (name, handler) {
        var _this = this;
        if (!name)
            name = _("Cancel");
        if (!handler)
            handler = function () { return _this.cancelLocalStateEffects(); };
        if ($("button_cancel"))
            dojo.destroy("button_cancel");
        this.addActionButton("button_cancel", name, handler, null, false, "red");
    };
    GameBasics.prototype.cloneAndFixIds = function (orig, postfix, removeInlineStyle) {
        if (!$(orig)) {
            var div_1 = document.createElement("div");
            div_1.innerHTML = _("NOT FOUND") + " " + orig.toString();
            return div_1;
        }
        var fixIds = function (node) {
            if (node.id) {
                node.id = node.id + postfix;
            }
            if (removeInlineStyle) {
                node.removeAttribute("style");
            }
        };
        var div = $(orig).cloneNode(true);
        div.querySelectorAll("*").forEach(fixIds);
        fixIds(div);
        return div;
    };
    /* @Override */
    GameBasics.prototype.updatePlayerOrdering = function () {
        this.inherited(arguments);
        dojo.place("player_board_config", "player_boards", "first");
    };
    GameBasics.prototype.destroyDivOtherCopies = function (id) {
        var _a;
        var panels = document.querySelectorAll("#" + id);
        panels.forEach(function (p, i) {
            if (i < panels.length - 1)
                p.parentNode.removeChild(p);
        });
        return (_a = panels[0]) !== null && _a !== void 0 ? _a : null;
    };
    GameBasics.prototype.setupSettings = function () {
        var _this = this;
        // re-place fake mini board
        this.destroyDivOtherCopies('player_board_config');
        dojo.place("player_board_config", "player_boards", "first");
        // move preference in gear tab 
        var userPrefContainerId = "settings-controls-container-prefs";
        $(userPrefContainerId).setAttribute("data-name", _("Preferences"));
        for (var index = 100; index <= 199; index++) {
            var prefDivId = "preference_control_" + index;
            var element = this.destroyDivOtherCopies(prefDivId);
            if (element) {
                var parent_1 = element.parentNode.parentNode;
                if (parent_1.parentNode.id != userPrefContainerId) {
                    dojo.place(parent_1, userPrefContainerId);
                    // remove the class because otherwise framework will hook its own listener there
                    parent_1.querySelectorAll(".game_preference_control").forEach(function (node) { return dojo.removeClass(node, "game_preference_control"); });
                    if (this.refaceUserPreference(index, parent_1, prefDivId) == false)
                        dojo.connect(parent_1, "onchange", function (e) { return _this.onChangePreferenceCustom(e); });
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
        dojo.place(bug, "settings-controls-container", "last");
    };
    GameBasics.prototype.refaceUserPreference = function (pref_id, node, prefDivId) {
        // can override to change apperance
        return false; // return false to hook defaut listener, other return true and you have to hook listener yourself
    };
    GameBasics.prototype.onChangePreferenceCustom = function (e) {
        var _a;
        var target = e.target;
        if (!target.id)
            return;
        var match = target.id.match(/^preference_[cf]ontrol_(\d+).*$/);
        if (!match) {
            return;
        }
        // Extract the ID and value from the UI control
        var prefId = +match[1];
        var prefValue = +((_a = target.value) !== null && _a !== void 0 ? _a : target.getAttribute('value'));
        this.ajaxCallChangePreferenceCustom(prefId, prefValue);
    };
    GameBasics.prototype.ajaxCallChangePreferenceCustom = function (pref_id, value) {
        console.log("ajaxCallChangePreference", pref_id, value);
        value = parseInt(value);
        this.prefs[pref_id].value = value;
        // send to mainsite to update
        this.ajaxcall("/table/table/changePreference.html", {
            id: pref_id,
            value: value,
            game: this.game_name
        }, this, function (result) {
            var _this = this;
            console.log("=> back", result);
            if (result.status == "reload") {
                this.showMessage(_("Done, reload in progress..."), "info");
                window.location.hash = "";
                window.location.reload();
            }
            else {
                if (result.pref_id == this.GAMEPREFERENCE_DISPLAYTOOLTIPS) {
                    this.switchDisplayTooltips(result.value);
                }
                else {
                    // send to our game to update per game table
                    this.gamedatas.server_prefs[pref_id] = value;
                    var args = { pref_id: pref_id, pref_value: value, player_id: this.player_id, lock: false };
                    this.ajaxcallwrapper_unchecked("changePreference", args, function (err, res) {
                        if (err)
                            console.error("changePreference callback failed " + res);
                        else {
                            console.log("changePreference sent " + pref_id + "=" + value);
                            var opname = _(_this.prefs[pref_id].name);
                            var opvalue = _(_this.prefs[pref_id].values[value].name);
                            _this.showMessage(_('Done, preference changed:') + " " + opname + " => " + opvalue, "info");
                        }
                    });
                }
            }
        });
    };
    GameBasics.prototype.toggleSettings = function () {
        console.log("toggle setting");
        dojo.toggleClass("settings-controls-container", "settingsControlsHidden");
        // do not call setupSettings() here it has to be only called once
        // Hacking BGA framework
        if (dojo.hasClass("ebd-body", "mobile_version")) {
            dojo.query(".player-board").forEach(function (elt) {
                if (elt.style.height != "auto") {
                    dojo.style(elt, "min-height", elt.style.height);
                    elt.style.height = "auto";
                }
            });
        }
    };
    GameBasics.prototype.toggleHelpMode = function (b) {
        if (b)
            this.activateHelpMode();
        else
            this.deactivateHelpMode();
    };
    GameBasics.prototype.activateHelpMode = function () {
        var _this = this;
        var chk = $("help-mode-switch");
        dojo.setAttr(chk, "bchecked", true);
        this._helpMode = true;
        dojo.addClass("ebd-body", "help-mode");
        this._displayedTooltip = null;
        document.body.addEventListener("click", this.closeCurrentTooltip.bind(this));
        this.setDescriptionOnMyTurn(_("HELP MODE Activated. Click on game elements to get tooltips"));
        dojo.empty("generalactions");
        this.addCancelButton(undefined, function () { return _this.deactivateHelpMode(); });
        var handler = this.onClickForHelp.bind(this);
        document.querySelectorAll(".withtooltip").forEach(function (node) {
            node.addEventListener("click", handler, false);
        });
    };
    GameBasics.prototype.deactivateHelpMode = function () {
        var chk = $("help-mode-switch");
        dojo.setAttr(chk, "bchecked", false);
        this.closeCurrentTooltip();
        this._helpMode = false;
        dojo.removeClass("ebd-body", "help-mode");
        document.body.removeEventListener("click", this.closeCurrentTooltip.bind(this));
        var handler = this.onClickForHelp.bind(this);
        document.querySelectorAll(".withtooltip").forEach(function (node) {
            node.removeEventListener("click", handler, false);
        });
        this.cancelLocalStateEffects();
    };
    GameBasics.prototype.closeCurrentTooltip = function () {
        if (!this._helpMode)
            return;
        if (this._displayedTooltip == null)
            return;
        this._displayedTooltip.destroy();
        this._displayedTooltip = null;
    };
    GameBasics.prototype.onClickForHelp = function (event) {
        console.trace("onhelp", event);
        if (!this._helpMode)
            return false;
        event.stopPropagation();
        event.preventDefault();
        this.showHelp(event.currentTarget.id);
        return true;
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
    GameBasics.prototype.checkZoom = function (zoom) {
        zoom = parseFloat(zoom);
        if (!zoom || zoom < 0.1 || zoom > 10) {
            zoom = 1;
        }
        return zoom;
    };
    GameBasics.prototype.setZoom = function (zoom) {
        if (!zoom)
            zoom = localStorage.getItem("mars.zoom");
        this.zoom = this.doSetZoom(this.checkZoom(zoom));
        localStorage.setItem("mars.zoom", "" + this.zoom);
    };
    GameBasics.prototype.incZoom = function (inc) {
        this.setZoom(this.checkZoom(this.zoom) + inc);
    };
    GameBasics.prototype.doSetZoom = function (zoom) {
        //console.log("set zoom "+zoom);
        zoom = this.checkZoom(zoom);
        var inner = document.getElementById("thething");
        var prevzoom = inner.getAttribute('data-zoom');
        if (parseInt(prevzoom) == zoom)
            return;
        var div = inner.parentElement;
        if (zoom == 1) {
            inner.style.removeProperty("transform");
            inner.style.removeProperty("width");
            div.style.removeProperty("height");
        }
        else {
            //inner.style.transform = "scale(" + zoom + ")";
            inner.offsetHeight; // reflow
            inner.style.transformOrigin = "0 0";
            inner.style.scale = "" + zoom;
            inner.style.width = 100 / zoom + "%";
            div.style.height = inner.offsetHeight * zoom + "px";
        }
        inner.setAttribute('data-zoom', "" + zoom);
        return zoom;
    };
    GameBasics.prototype.onScreenWidthChange = function () {
        // override
        this.zoom = this.doSetZoom(this.zoom);
    };
    GameBasics.prototype.setupInfoPanel = function () {
        //dojo.place('player_board_config', 'player_boards', 'first');
        var _this = this;
        dojo.connect($("show-settings"), "onclick", function () { return _this.toggleSettings(); });
        this.addTooltip("show-settings", "", _("Display game preferences"));
        var chk = $("help-mode-switch");
        dojo.setAttr(chk, "bchecked", false);
        dojo.connect(chk, "onclick", function () {
            console.log("on check", chk);
            var bchecked = !chk.getAttribute("bchecked");
            //dojo.setAttr(chk, "bchecked", !chk.bchecked);
            _this.toggleHelpMode(bchecked);
        });
        this.addTooltip(chk.id, "", _("Toggle help mode"));
        //$('help-mode-switch').style.display='none';
        this.setupSettings();
        //this.setupHelper();
        //this.setupTour();
        this.addTooltip("zoom-in", "", _("Zoom in"));
        this.addTooltip("zoom-out", "", _("Zoom out"));
    };
    // NOTIFICATIONS
    GameBasics.prototype.setupNotifications = function () {
        console.log("notifications subscriptions setup");
        //  dojo.subscribe("counter", this, "notif_counter");
        // this.notifqueue.setSynchronous("counter", 500);
        // dojo.subscribe("counterAsync", this, "notif_counter"); // same as conter but no delay
        this.subscribeNotification("counter");
        this.subscribeNotification("counterAsync", 1, "counter"); // same as conter but no delay
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
    GameBasics.prototype.subscribeNotification = function (notifName, duration, funcName) {
        var _this = this;
        if (duration === void 0) { duration = 0; }
        if (funcName === void 0) { funcName = ""; }
        if (funcName == "")
            funcName = notifName;
        if (!(typeof this["notif_" + funcName] === "function")) {
            console.error("Notification notif_" + funcName + " isn't set !");
        }
        dojo.subscribe(notifName, this, function (notif) { return _this.playnotif(funcName, notif, duration); });
        if (duration == 0) {
            //variable duration
            //don't forget to call this.notifqueue.setSynchronousDuration(duration);
            this.notifqueue.setSynchronous(notifName);
        }
        else if (duration == 1) {
            //Notif has no animation, thus no delay
            this.notifqueue.setSynchronous(notifName, duration);
        }
        else if (duration == -1) {
            //Notif has to be ignored for active player
            //something about this has been updated in the bga framework, don't know if the big delay is still necessary
            this.notifqueue.setSynchronous(notifName, 10000);
            this.notifqueue.setIgnoreNotificationCheck(notifName, function (notif) { return notif.args.player_id == _this.player_id; });
        }
        else {
            //real fixed duration
            this.notifqueue.setSynchronous(notifName, duration);
        }
    };
    GameBasics.prototype.playnotif = function (notifname, notif, setDelay) {
        var _this = this;
        console.log("playing notif " + notifname + " with args ", notif.args);
        //setSynchronous has to set for non active player in ignored notif
        if (setDelay == -1) {
            if (notif.args.player_id == this.player_id) {
                //     this.notifqueue.setSynchronous(notifname, 1);
            }
            else {
                //   this.notifqueue.setSynchronous(notifname);
            }
        }
        /*
        Client-side duplicat notification check
        Disabled for now
        if (this.prev_notif_uid == args.uid) {
          this.sendAction('ui_warning', { log: "duplicated notification uid received " + args.uid });
          // return; // FIXME: return only if reported through production log and confirmed as an issue
        }
        this.prev_notif_uid = args.uid;
        */
        var notiffunc = "notif_" + notifname;
        if (!this[notiffunc]) {
            this.showMessage("Notif: " + notiffunc + " not implemented yet", "error");
        }
        else {
            var startTime_1 = Date.now();
            //  this.onNotif(notif);//should be moved here
            var p = this[notiffunc](notif);
            if (setDelay == 1) {
                //nothing to do here
            }
            else if (p == undefined) {
                //no promise returned: no animation played
                // console.log(notifname+' : no return, sync set to 1');
                this.notifqueue.setSynchronousDuration(1);
            }
            else {
                //  this.animated=true;
                p.then(function () {
                    // console.log(notifname+' : waiting 50ms after returns');
                    return _this.wait(50);
                }).then(function () {
                    _this.notifqueue.setSynchronousDuration(10);
                    var executionTime = Date.now() - startTime_1;
                    //  console.log(notifname+' : sync has been set to dynamic after '+executionTime+"ms  elapsed");
                    //    this.animated=false;
                });
            }
        }
    };
    //return a timed promise
    GameBasics.prototype.wait = function (ms) {
        return new Promise(function (resolve, reject) {
            setTimeout(function () { return resolve(); }, ms);
        });
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
    // ntf_gameStateMultipleActiveUpdate(notif) {
    //   this.gamedatas.gamestate.descriptionmyturn = "...";
    //   return this.inherited(arguments);
    // }
    GameBasics.prototype.onLockInterface = function (lock) {
        var _a;
        $("gameaction_status_wrap").setAttribute("data-interface-status", (_a = lock === null || lock === void 0 ? void 0 : lock.status) !== null && _a !== void 0 ? _a : "updated");
        this.inherited(arguments);
        // if (lock.status == "queued") {
        //    // do not hide the buttons when locking call comes from another player
        // }
        this.restoreMainBar();
    };
    /**
     * This is the hack to keep the status bar on
     */
    GameBasics.prototype.restoreMainBar = function () {
        //console.trace("restore main bar");
        dojo.style("pagemaintitle_wrap", "display", "block");
        dojo.style("gameaction_status_wrap", "display", "block");
        if (this.interface_status == "updated") {
            // this is normal status nothing is pending
            $("gameaction_status").innerHTML = "&nbsp;";
            $("gameaction_status_wrap").setAttribute("data-interface-status", this.interface_status);
        }
    };
    GameBasics.prototype.onNotif = function (notif) {
        this.restoreMainBar();
        // if (!this.instantaneousMode && notif.log) {
        //   this.setDescriptionOnMyTurn(notif.log, notif.args);
        // }
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
                    counter_value: value
                };
                if (this.gamedatas_server && this.gamedatas_server.counters[name_1])
                    this.gamedatas_server.counters[name_1].counter_value = value;
                this.updateCountersSafe(counters);
            }
            else if ($(name_1)) {
                this.setDomTokenState(name_1, value);
            }
            console.log("** notif counter " + notif.args.counter_name + " -> " + notif.args.counter_value);
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
var CustomAnimation = /** @class */ (function () {
    function CustomAnimation(game) {
        this.game = game;
        this.animations = {};
        this.slide_duration = 800;
        this.animations['grow_appear'] =
            {
                name: 'grow_appear', duration: 500, easing: 'ease-in',
                keyframes: "   \n                         0% {\n                               transform:scale(0);\n                            }\n                         80% {\n                               transform:scale(1.1);\n                            }\n                         100% {\n                               transform:scale(1);\n\n                            }\n                    "
            };
        this.animations['small_tingle'] =
            {
                name: 'small_tingle', duration: 500, easing: 'ease-in',
                keyframes: "   \n                         0% {\n                               color:white;            \n                               transform:scale(1);\n                            }\n                         80% {\n                               color:red;\n                               transform:scale(1.1);\n                            }\n                         100% {\n                               color:white;\n                               transform:scale(1);\n\n                            }\n                    "
            };
        this.animations['great_tingle'] =
            {
                name: 'great_tingle', duration: 500, easing: 'ease-in',
                keyframes: "   \n                         0% {\n                               transform:scale(1);\n                               color:white;\n                            }\n                         80% {\n                               color:red;\n                               transform:scale(2);\n                            }\n                         100% {\n                              color:white;\n                               transform:scale(1);\n\n                            }\n                    "
            };
        this.animations['pop_and_tilt'] =
            {
                name: 'pop_and_tilt', duration: 300, easing: 'ease-in',
                keyframes: "   \n                         0% {\n                               transform:scale(1);\n                            }\n                         100% {\n                               transform:scale(1.2);\n                               \n                            }\n                    "
            };
        this.animations['depop_and_tilt'] =
            {
                name: 'depop_and_tilt', duration: 300, easing: 'ease-in',
                keyframes: "   \n                         0% {\n                               transform:scale(1.2);\n                            }\n                         100% {\n                               transform:scale(1);\n                               \n                            }\n                    "
            };
        this.addAnimationsToDocument(this.animations);
    }
    CustomAnimation.prototype.setOriginalFilter = function (tableau_id, original, actual) {
        var btn_original = "player_viewcards_" + original + "_" + tableau_id.replace("tableau_", "");
        var btn_actual = "player_viewcards_" + actual + "_" + tableau_id.replace("tableau_", "");
        var exec = function () {
            $(tableau_id).dataset["visibility_" + original] = "1";
            $(tableau_id).dataset["visibility_" + actual] = "0";
            $(btn_original).dataset.selected = "1";
            $(btn_actual).dataset.selected = "0";
        };
        if (this.areAnimationsPlayed()) {
            this.wait(1500).then(function () {
                exec();
            });
        }
        else {
            exec();
        }
    };
    CustomAnimation.prototype.animateTilePop = function (token_id) {
        if (!this.areAnimationsPlayed())
            return this.getImmediatePromise();
        return this.playCssAnimation(token_id, 'grow_appear', null, null);
    };
    CustomAnimation.prototype.animatetingle = function (counter_id) {
        if (!this.areAnimationsPlayed())
            return this.getImmediatePromise();
        if (this.nodeExists('alt_' + counter_id))
            this.playCssAnimation('alt_' + counter_id, 'small_tingle', null, null);
        return this.playCssAnimation(counter_id, 'small_tingle', null, null);
    };
    CustomAnimation.prototype.animatePlaceResourceOnCard = function (resource_id, place_id) {
        var _this = this;
        if (!this.areAnimationsPlayed())
            return this.getImmediatePromise();
        var animate_token = resource_id;
        if (!this.game.isLayoutFull() && place_id.startsWith('card_main_'))
            animate_token = place_id.replace('card_main_', 'resource_holder_');
        var anim_1 = this.playCssAnimation(place_id, 'pop_and_tilt', function () {
            dojo.style(place_id, 'filter', 'grayscale(0)');
        }, function () {
            dojo.style(place_id, 'transform', 'scale(1.2)');
        });
        var anim_2 = anim_1.then(function () {
            return _this.playCssAnimation(animate_token, 'great_tingle', function () {
                dojo.style(animate_token, 'z-index', '10');
            }, function () {
                dojo.style(animate_token, 'z-index', '');
            });
        });
        return anim_2.then(function () {
            return _this.playCssAnimation(place_id, 'depop_and_tilt', function () {
                dojo.style(place_id, 'transform', '');
            }, function () {
                dojo.style(place_id, 'filter', '');
            });
        });
    };
    CustomAnimation.prototype.animateRemoveResourceFromCard = function (resource_id) {
        if (!this.areAnimationsPlayed())
            return this.getImmediatePromise();
        var animate_token = $(resource_id).parentElement.id;
        if (animate_token.includes("tableau")) {
            //too late, resource is not on card anymore
            return this.getImmediatePromise();
        }
        return this.playCssAnimation(animate_token, 'great_tingle', function () {
            dojo.style(animate_token, 'z-index', '10');
        }, function () {
            dojo.style(animate_token, 'z-index', '');
        });
    };
    CustomAnimation.prototype.moveResources = function (tracker, qty) {
        var _this = this;
        if (!this.areAnimationsPlayed())
            return this.getImmediatePromise();
        if (qty == 0)
            return this.getImmediatePromise();
        var trk_item = tracker.replace('tracker_', '').split('_')[0];
        var delay = 0;
        var mark = "";
        if (Math.abs(qty) > 3) {
            mark = String(Math.abs(qty));
            qty = -1;
        }
        var htm = '<div id="%t" class="resmover">' + CustomRenders.parseActionsToHTML(trk_item, mark) + '</div>';
        var _loop_1 = function (i) {
            var tmpid = 'tmp_' + String(Math.random() * 1000000000);
            var visiblenode = "";
            if (dojo.style('gameaction_status_wrap', "display") != "none") {
                visiblenode = 'gameaction_status';
            }
            else if (dojo.style('pagemaintitle_wrap', "display") != "none") {
                visiblenode = 'pagemaintitletext';
            }
            var fnode = visiblenode != "" ? $(visiblenode).querySelector('.token_img.tracker_' + trk_item) : null;
            if (fnode) {
                dojo.place('<div id="move_from_' + tmpid + '" class="topbar_movefrom"></div>', fnode);
            }
            else {
                dojo.place('<div id="move_from_' + tmpid + '" class="topbar_movefrom"></div>', 'thething');
            }
            var origin_1 = qty > 0 ? 'move_from_' + tmpid : tracker.replace('tracker_', 'alt_tracker_');
            var destination = qty > 0 ? tracker.replace('tracker_', 'alt_tracker_') : 'move_from_' + tmpid;
            if (!this_1.nodeExists(origin_1) && origin_1.startsWith('alt_'))
                origin_1 = tracker;
            if (!this_1.nodeExists(destination) && destination.startsWith('alt_'))
                destination = tracker;
            dojo.place(htm.replace('%t', tmpid), origin_1);
            this_1.wait(delay).then(function () {
                if (destination.startsWith('move_from_') && !dojo.byId(destination)) {
                    dojo.place('<div id="move_from_' + tmpid + '" class="topbar_movefrom"></div>', 'thething');
                }
                _this.game.slideAndPlace(tmpid, destination, 500, undefined, function () {
                    if (dojo.byId(tmpid))
                        dojo.destroy(tmpid);
                    if (dojo.byId('move_from_' + tmpid))
                        dojo.destroy('move_from_' + tmpid);
                });
            });
            /*
            this.wait(delay).then(()=>{return this.slideToObjectAndAttach(tmpid,destination);}).then(()=>{
                dojo.destroy(tmpid);
              }
            );*/
            delay += 100;
        };
        var this_1 = this;
        for (var i = 0; i < Math.abs(qty); i++) {
            _loop_1(i);
        }
        return this.wait(delay + 500);
    };
    CustomAnimation.prototype.addAnimationsToDocument = function (animations) {
        var head = document.getElementsByTagName('head')[0];
        var s = document.createElement('style');
        s.setAttribute('type', 'text/css');
        s.setAttribute('id', 'css_animations');
        var css = "";
        for (var _i = 0, _a = Object.keys(animations); _i < _a.length; _i++) {
            var idx = _a[_i];
            var anim = animations[idx];
            css = css + '.anim_' + anim.name + ' {\n';
            css = css + ' animation: key_anim_' + anim.name + ' ' + anim.duration + 'ms ' + anim.easing + ';\n';
            css = css + '}\n';
            css = css + '@keyframes key_anim_' + anim.name + ' {\n';
            css = css + anim.keyframes;
            css = css + '}\n';
        }
        s.innerHTML = css;
        head.appendChild(s);
    };
    CustomAnimation.prototype.areAnimationsPlayed = function () {
        //if(this.game.animated) return true;
        if (this.game.instantaneousMode)
            return false;
        if (document.hidden || document.visibilityState === 'hidden')
            return false;
        return true;
    };
    //"fake" promise, made to use as functional empty default
    CustomAnimation.prototype.getImmediatePromise = function () {
        return new Promise(function (resolve, reject) {
            resolve("");
        });
    };
    //return a timed promise
    CustomAnimation.prototype.wait = function (ms) {
        return new Promise(function (resolve, reject) {
            setTimeout(function () { return resolve(""); }, ms);
        });
    };
    //Adds css class on element, plays it, executes onEnd and removes css class
    //a promise is returned for easy chaining
    CustomAnimation.prototype.playCssAnimation = function (targetId, animationname, onStart, onEnd) {
        var _this = this;
        var animation = this.animations[animationname];
        return new Promise(function (resolve, reject) {
            var cssClass = 'anim_' + animation.name;
            var timeoutId = null;
            var resolvedOK = false;
            var localCssAnimationCallback = function (e) {
                if (e.animationName != 'key_' + cssClass) {
                    //  console.log("+anim",animationname,"animation name intercepted ",e.animationName);
                    return;
                }
                resolvedOK = true;
                $(targetId).removeEventListener('animationend', localCssAnimationCallback);
                $(targetId).classList.remove(cssClass);
                if (onEnd)
                    onEnd();
                //   this.log('+anim',animationname,'resolved with callback');
                resolve("");
            };
            if (onStart)
                onStart();
            $(targetId).addEventListener('animationend', localCssAnimationCallback);
            dojo.addClass(targetId, cssClass);
            // this.MAIN.log('+anim',animationname,'starting playing');
            //timeout security
            timeoutId = setTimeout(function () {
                if (resolvedOK)
                    return;
                if (_this.nodeExists(targetId)) {
                    $(targetId).removeEventListener('animationend', localCssAnimationCallback);
                    $(targetId).classList.remove(cssClass);
                }
                if (onEnd)
                    onEnd();
                //this.MAIN.log('+anim',animationname,'resolved with timeout');
                resolve("");
            }, animation.duration * 1.5);
        });
    };
    CustomAnimation.prototype.slideToObjectAndAttach = function (movingId, destinationId, rotation, posX, posY) {
        var _this = this;
        if (rotation === void 0) { rotation = 0; }
        if (posX === void 0) { posX = undefined; }
        if (posY === void 0) { posY = undefined; }
        var object = document.getElementById(movingId);
        var destination = document.getElementById(destinationId);
        var zoom = 1;
        if (destination.contains(object)) {
            return Promise.resolve(true);
        }
        return new Promise(function (resolve) {
            var originalZIndex = Number(object.style.zIndex);
            object.style.zIndex = '25';
            var objectCR = object.getBoundingClientRect();
            var destinationCR = destination.getBoundingClientRect();
            var deltaX = destinationCR.left - objectCR.left + (posX !== null && posX !== void 0 ? posX : 0) * zoom;
            var deltaY = destinationCR.top - objectCR.top + (posY !== null && posY !== void 0 ? posY : 0) * zoom;
            //When move ends
            var attachToNewParent = function () {
                object.style.top = posY !== undefined ? "".concat(posY, "px") : null;
                object.style.left = posX !== undefined ? "".concat(posX, "px") : null;
                object.style.position = (posX !== undefined || posY !== undefined) ? 'absolute' : null;
                object.style.zIndex = originalZIndex ? '' + originalZIndex : null;
                object.style.transform = rotation ? "rotate(".concat(rotation, "deg)") : null;
                object.style.transition = null;
                destination.appendChild(object);
            };
            object.style.transition = 'transform ' + _this.slide_duration + 'ms ease-in';
            object.style.transform = "translate(".concat(deltaX / zoom, "px, ").concat(deltaY / zoom, "px) rotate(").concat(rotation, "deg)");
            if (object.style.position != "absolute")
                object.style.position = 'relative';
            var securityTimeoutId = null;
            var transitionend = function () {
                attachToNewParent();
                object.removeEventListener('transitionend', transitionend);
                object.removeEventListener('transitioncancel', transitionend);
                resolve(true);
                if (securityTimeoutId) {
                    clearTimeout(securityTimeoutId);
                }
            };
            object.addEventListener('transitionend', transitionend);
            object.addEventListener('transitioncancel', transitionend);
            // security check : if transition fails, we force tile to destination
            securityTimeoutId = setTimeout(function () {
                if (!destination.contains(object)) {
                    attachToNewParent();
                    object.removeEventListener('transitionend', transitionend);
                    object.removeEventListener('transitioncancel', transitionend);
                    resolve(true);
                }
            }, _this.slide_duration * 1.2);
        });
    };
    CustomAnimation.prototype.nodeExists = function (node_id) {
        var node = dojo.byId(node_id);
        if (!node) {
            return false;
        }
        else {
            return true;
        }
    };
    return CustomAnimation;
}());
/* Module for rendering  card effects, powers , etc
*
*/
var CustomRenders = /** @class */ (function () {
    function CustomRenders() {
    }
    CustomRenders.parseExprToHtml = function (expr, card_num, action_mode, effect_mode) {
        if (action_mode === void 0) { action_mode = false; }
        if (effect_mode === void 0) { effect_mode = false; }
        var rethtm = '';
        if (!expr || expr.length < 1)
            return '';
        if (!action_mode && !effect_mode) {
            if (card_num && this['customcard_rules_' + card_num]) {
                return this['customcard_rules_' + card_num]();
            }
        }
        else if (action_mode == true) {
            if (card_num && this['customcard_action_' + card_num]) {
                return this['customcard_action_' + card_num]();
            }
        }
        else if (effect_mode == true) {
            if (card_num && this['customcard_effect_' + card_num]) {
                return this['customcard_effect_' + card_num]();
            }
        }
        //patch
        var items = this.parseExprItem(expr, 0);
        var prodgains = [];
        var prodlosses = [];
        var gains = [];
        var losses = [];
        for (var _i = 0, items_1 = items; _i < items_1.length; _i++) {
            var parse = items_1[_i];
            //group by type
            if (parse != null) {
                if (action_mode == true || effect_mode == true) {
                    //simpler : gains -> losses
                    if (parse.group == "ACTION_SPEND") {
                        losses.push({ item: parse, qty: parse.qty });
                    }
                    else {
                        //card patches
                        if (card_num == 20)
                            parse.qty = -1;
                        if ([70, 79, 94, 150, 166].includes(card_num))
                            parse.qty = -2;
                        gains.push({ item: parse, qty: parse.qty });
                    }
                }
                else {
                    //card patches
                    if (card_num == 19)
                        parse.norepeat = true;
                    if (card_num == 152)
                        parse.qty = -99;
                    if (parse.negative && parse.production) {
                        prodlosses.push({ item: parse, qty: parse.qty });
                    }
                    else if (!parse.negative && parse.production) {
                        prodgains.push({ item: parse, qty: parse.qty });
                    }
                    else if (parse.negative && !parse.production) {
                        losses.push({ item: parse, qty: parse.qty });
                    }
                    else if (!parse.negative && !parse.production) {
                        gains.push({ item: parse, qty: parse.qty });
                    }
                }
            }
        }
        if (action_mode == true || effect_mode == true) {
            rethtm += '<div class="card_icono icono_losses cnt_losses"><div class="outer_gains">';
            rethtm += this.parseRulesToHtmlBlock(losses);
            rethtm += '</div></div>';
            if (action_mode == true)
                rethtm += '<div class="action_arrow"></div>';
            else
                rethtm += '<div class="effect_separator">:</div>';
            rethtm += '<div class="card_icono icono_gains cnt_gains"><div class="outer_gains">';
            rethtm += this.parseRulesToHtmlBlock(gains);
            rethtm += '</div></div>';
        }
        else {
            //rules mode
            var blocks = 0;
            //losses first
            if (losses.length > 0) {
                rethtm += '<div class="card_icono icono_losses cnt_losses"><div class="outer_gains"><div class="plusminus">-</div>';
                rethtm += this.parseRulesToHtmlBlock(losses);
                rethtm += '</div></div>';
                blocks++;
            }
            if (prodgains.length > 0 || prodlosses.length > 0) {
                rethtm += '<div class="card_icono icono_prod"><div class="outer_production">';
                if (prodlosses.length > 0) {
                    rethtm += '<div class="production_line cnt_losses"><div class="plusminus">-</div>';
                    rethtm += this.parseRulesToHtmlBlock(prodlosses);
                    rethtm += '</div>';
                }
                if (prodgains.length > 0) {
                    rethtm += '<div class="production_line cnt_gains">';
                    if (prodlosses.length > 0 && !action_mode)
                        rethtm += '<div class="plusminus">+</div>';
                    rethtm += this.parseRulesToHtmlBlock(prodgains);
                    rethtm += '</div>';
                }
                rethtm += '</div></div>';
                blocks++;
            }
            if (gains.length > 0) {
                rethtm += '<div class="card_icono icono_gains cnt_gains"><div class="outer_gains">';
                if (losses.length > 0)
                    rethtm += '<div class="plusminus">+</div>';
                rethtm += this.parseRulesToHtmlBlock(gains);
                rethtm += '</div></div>';
                blocks++;
            }
        }
        return rethtm;
    };
    CustomRenders.parseExprItem = function (expr, depth) {
        if (!expr)
            return [];
        if (!Array.isArray(expr)) {
            expr = [expr];
        }
        var items = [];
        var op = expr[0];
        var min = (expr.length > 1) ? expr[1] : "";
        var max = (expr.length > 2) ? expr[2] : "";
        var arg1 = (expr.length > 3) ? expr[3] : "";
        //simple op, one resource gain
        if (expr.length == 1) {
            //special patch
            if (op == "play_cardSpaceEvent") {
                items.push(this.getParse('tagSpace', depth));
                items.push(this.getParse('tagEvent', depth));
            }
            else if (op == "acard5") {
                items.push(this.getParse('tagMicrobe', depth));
                items.push(this.getParse('star', depth));
                items.push(this.getParse('twopoints', depth));
                items.push(this.getParse('res_Science', depth));
            }
            else {
                items.push(this.getParse(op, depth));
            }
        }
        else if (op == '!') {
            if (arg1 != "") {
                var item = this.getParse(arg1, depth);
                if (item != null) {
                    item.qty = max;
                    items.push(item);
                }
            }
        }
        else if (op == ',' && arg1.includes('counter(')) {
            var retSrcs = this.parseExprItem(expr[3], depth + 1);
            var retGains = this.parseExprItem(expr[4], depth + 1);
            var isProd = false;
            for (var _i = 0, retGains_1 = retGains; _i < retGains_1.length; _i++) {
                var retGain = retGains_1[_i];
                if (retGain.production == true)
                    isProd = true;
                items.push(retGain);
            }
            for (var _a = 0, retSrcs_1 = retSrcs; _a < retSrcs_1.length; _a++) {
                var retSrc = retSrcs_1[_a];
                retSrc.group = "FOREACH";
                if (isProd)
                    retSrc.production = true;
                items.push(retSrc);
            }
        }
        else if (op == "," || op == ";") {
            for (var i = 3; i < expr.length; i++) {
                for (var _b = 0, _c = this.parseExprItem(expr[i], depth + 1); _b < _c.length; _b++) {
                    var ret = _c[_b];
                    items.push(ret);
                }
            }
        }
        else if (op == "/") {
            for (var i = 3; i < expr.length; i++) {
                //    items.push(this.parseExprItem(expr[i],true));
                for (var _d = 0, _e = this.parseExprItem(expr[i], depth + 1); _d < _e.length; _d++) {
                    var ret = _e[_d];
                    if (ret != null) {
                        ret.divider = "OR";
                        items.push(ret);
                    }
                }
            }
        }
        else if (op == ":") {
            var retSrcs = this.parseExprItem(expr[3], depth + 1);
            var retGains = this.parseExprItem(expr[4], depth + 1);
            for (var _f = 0, retSrcs_2 = retSrcs; _f < retSrcs_2.length; _f++) {
                var retSrc = retSrcs_2[_f];
                retSrc.group = "ACTION_SPEND";
                items.push(retSrc);
            }
            for (var _g = 0, retGains_2 = retGains; _g < retGains_2.length; _g++) {
                var retGain = retGains_2[_g];
                retGain.group = "ACTION_GAIN";
                items.push(retGain);
            }
        }
        return items;
    };
    CustomRenders.getParse = function (item, depth) {
        if (depth === void 0) { depth = 0; }
        var parse = null;
        if (item.includes('counter(')) {
            item = item.replace('counter(', '').replace(')', '');
        }
        item = item.replace('ores(Microbe)', 'ores_Microbe');
        item = item.replace('ores(Animal)', 'ores_Animal');
        item = item.replace("counter('(tagPlant>=3)*4')", 'special_tagplant_sup3');
        item = item.replace("tagMicrobe/2", 'special_tagmicrobe_half');
        item = item.replace("ph,0", 'ph');
        item = item.replace(/\([^)]*\)/g, '(*)');
        if (this.parses[item]) {
            parse = Object.assign({}, this.parses[item]);
        }
        else if (this.parses[item.replace('_Any', '')]) {
            parse = Object.assign({}, this.parses[item.replace('_Any', '')]);
            parse.redborder = "resource";
        }
        else if (this.parses[item.replace('play_', '')]) {
            parse = Object.assign({}, this.parses[item.replace('play_', '')]);
        }
        else if (this.parses[item.replace('place_', '')]) {
            parse = Object.assign({}, this.parses[item.replace('place_', '')]);
            parse.redborder = 'hex';
        }
        else if (this.parses[item.replace('(*)', '')]) {
            parse = Object.assign({}, this.parses[item.replace('(*)', '')]);
            parse.after = '*';
        }
        else {
            //unknown parse
            //this.darhflog('UNKNOWN PARSE :',item);
            parse = { class: 'unknown', content: item };
        }
        parse.depth = depth;
        return parse;
    };
    CustomRenders.parseRulesToHtmlBlock = function (items) {
        var rethtm = '';
        var foundor = false;
        for (var _i = 0, items_2 = items; _i < items_2.length; _i++) {
            var n = items_2[_i];
            if (n.item.divider && n.item.divider == "OR") {
                if (!foundor) {
                    foundor = true;
                    //  rethtm+='<div class="breaker"></div>';
                }
                else {
                    rethtm += _('OR') + '&nbsp;';
                }
            }
            //if (n.qty>1) rethtm+=n.qty+'&nbsp;';
            if (n.item.group && n.item.group == "FOREACH" && items[0] != n)
                rethtm += '&nbsp;/&nbsp;';
            rethtm += this.parseSingleItemToHTML(n.item, n.qty);
        }
        return rethtm;
    };
    CustomRenders.parseSingleItemToHTML = function (item, qty) {
        var ret = "";
        var content = item.content != undefined ? item.content : "";
        if (item.content != "" && item.classes == "txtcontent")
            item.content = _(item.content);
        if (content == "1" && qty != null) {
            content = qty;
            if (qty == -99)
                content = 'X';
        }
        else if (qty != null && (qty > 3 || item.norepeat == true)) {
            ret = qty + '&nbsp;';
        }
        else if (qty == -99) {
            ret = ret + 'X&nbsp;';
        }
        var before = item.before != undefined ? '<div class="before">' + item.before + '</div>&nbsp;' : "";
        var after = item.after != undefined ? item.after : "";
        //little resource for nmu & nms
        if (item.exp) {
            after = '<div class="resource_exponent"><div class="' + item.exp + '"></div></div>';
        }
        var resicon = before + '<div class="cnt_media ' + item.classes + ' depth_' + item.depth + '">' + content + '</div>' + after;
        if (item.redborder) {
            var redborderclass = item.classes.includes('tile') || item.classes.includes('city') || item.classes.includes('forest') || item.classes.includes('tracker_w') ? 'hex' : 'resource';
            resicon = '<div class="outer_redborder redborder_' + redborderclass + '">' + resicon + '</div>';
        }
        if (item.production === true) {
            resicon = '<div class="outer_production">' + resicon + '</div>';
        }
        ret = ret + resicon;
        /*
        if (item.production === true) {
           ret =ret+ '<div class="outer_production"><div class="cnt_media ' + item.classes + '">' + content + "</div>"+after+"</div>";
        } else if (item.redborder) {
          const redborderclass=item.classes.includes('tile') || item.classes.includes('city') || item.classes.includes('forest') ? 'hex' : 'resource';
          ret =ret+  '<div class="outer_redborder redborder_'+redborderclass+'"><div class="cnt_media ' + item.classes + '">' + content + "</div>"+after+"</div>";
        } else {
          ret =ret+  '<div class="cnt_media ' + item.classes + '">'+content+'</div>'+after;
        }
  
         */
        if (qty != null && qty > 1 && qty <= 3 && item.content != "1" && !item.norepeat) {
            ret = ret.repeat(qty);
        }
        return ret;
    };
    CustomRenders.parseActionsToHTML = function (actions, optional_content) {
        var ret = actions;
        var idx = 0;
        var finds = [];
        for (var key in this.parses) {
            var item = this.parses[key];
            if (ret.includes(key)) {
                ret = ret.replace(key, "%" + idx + "%");
                var content = item.content != undefined ? item.content : "";
                if (optional_content)
                    content = optional_content;
                var after = item.after != undefined ? item.after : "";
                if (item.production === true) {
                    finds[idx] = '<div class="outer_production"><div class="' + item.classes + '">' + content + "</div>" + after + "</div>";
                }
                else if (item.redborder) {
                    finds[idx] = '<div class="outer_redborder redborder_' + item.redborder + '"><div class="' + item.classes + '">' + content + "</div>" + after + "</div>";
                }
                else {
                    finds[idx] = '<div class="' + item.classes + '">' + content + '</div>' + after;
                }
                idx++;
            }
        }
        //remove ";" between icons
        ret = ret.replace("%;%", "%%");
        //replaces
        for (var key in finds) {
            var htm = finds[key];
            ret = ret.replace("%" + key + "%", htm);
        }
        return ret;
    };
    CustomRenders.parsePrereqToHTML = function (pre) {
        if (!pre)
            return "";
        var op = "";
        var what = "";
        var qty = 0;
        if (typeof pre === 'string') {
            op = ">=";
            what = pre;
            qty = 1;
        }
        else {
            if (pre.length < 3) {
                return "";
            }
            else {
                op = pre[0];
                what = pre[1];
                qty = pre[2];
            }
        }
        var suffix = "";
        var icon = CustomRenders.parseActionsToHTML(what);
        switch (what) {
            case "o":
                suffix = "%";
                break;
            case "t":
                suffix = "°C";
                break;
            case "tagScience":
                break;
            case "tagEnergy":
                break;
            case "forest":
                break;
            case "w":
                break;
        }
        var mode = "min";
        var prefix = "";
        if (op == "<=") {
            mode = "max";
            prefix = "max ";
        }
        var qtys;
        qtys = qty.toString();
        if (qty == 0 && what != "o" && what != "t")
            qtys = "";
        var htm = '<div class="prereq_content mode_' + mode + '">' + prefix + qtys + suffix + icon + '</div></div>';
        return htm;
    };
    CustomRenders.parsePrereqToText = function (pre, game) {
        if (!pre)
            return "";
        var op = "";
        var what = "";
        var qty = 0;
        if (typeof pre === "string") {
            op = ">=";
            what = pre;
            qty = 1;
        }
        else {
            if (pre.length < 3) {
                return "";
            }
            else {
                op = pre[0];
                what = pre[1];
                qty = pre[2];
            }
        }
        var mode = "min";
        if (op == "<=") {
            mode = "max";
        }
        var ret = '';
        switch (what) {
            case "o":
                ret = mode == "min" ? _("Requires $v% Oxygen.") : _("Oxygen must be $v% or less.");
                break;
            case "t":
                ret = mode == "min" ? _("Requires $v°C or warmer.") : _("It must be $v°C or colder.");
                break;
            case "w":
                ret = mode == "min" ? (ret = _("Requires $v ocean/s tiles.")) : _("$v ocean/s tiles or less.");
                break;
            case "forest":
                ret = _("Requires $v forest/s tiles.");
                break;
            case "all_city":
                ret = _("Requires $v citie/s in play.");
                break;
            case "ps":
                ret = _("Requires that you have steel production.");
                break;
            case "pu":
                ret = _("Requires that you have titanium production.");
                break;
            default:
                if (what.startsWith("tag")) {
                    if (qty == 1) {
                        ret = _("Requires a $tag tag.");
                    }
                    else {
                        ret = _("Requires $v $tag tags.");
                    }
                    ret = ret.replace("$tag", game.getTokenName(what));
                    break;
                }
                ret = "NOT FOUND :" + what;
                break;
        }
        ret = ret.replace('$v', String(qty));
        return ret;
    };
    //custom card stuff
    CustomRenders.customcard_vp_5 = function () {
        return this.parseSingleItemToHTML(this.getParse('res_Science', 0), 1) + '<div class="vp_qty">*:3</div>';
    };
    CustomRenders.customcard_action_6 = function () {
        return '<div class="groupline">' + this.parseSingleItemToHTML(this.getParse(':', 0), 1) + _('ACTION:LOOK AT THE TOP CARD AND EITHER BUY IT OR DISCARD IT') + '</div>';
    };
    CustomRenders.customcard_action_7 = function () {
        return '<div class="card_icono icono_losses cnt_losses"><div class="outer_gains"><div class="cnt_media token_img tracker_e depth_1"></div></div></div><div class="action_arrow"></div><div class="card_icono icono_gains cnt_gains"><div class="outer_gains"><div class="cnt_media token_img tracker_m depth_2">1</div> / <div class="outer_redborder redborder_hex"><div class="cnt_media tracker tracker_city depth_2"></div></div>*</div></div>';
    };
    CustomRenders.customcard_vp_8 = function () {
        return '<div class="vp_qty">1/</div>' + this.parseSingleItemToHTML(this.getParse('w', 0), 1) + '<div class="vp_qty">*</div>';
    };
    CustomRenders.customcard_vp_12 = function () {
        return '<div class="vp_qty">1/</div>' + this.parseSingleItemToHTML(this.getParse('tagJovian', 0), 1);
    };
    CustomRenders.customcard_vp_24 = function () {
        return '<div class="vp_qty">1/</div>' + this.parseSingleItemToHTML(this.getParse('res_Animal', 0), 1);
    };
    CustomRenders.customcard_effect_25 = function () {
        return '<div class="card_icono icono_losses cnt_losses"><div class="outer_gains"><div class="cnt_media tracker badge tracker_tagSpace depth_1"></div></div></div><div class="effect_separator">:</div><div class="card_icono icono_gains cnt_gains"><div class="outer_gains"><div class="cnt_media token_img tracker_m depth_1">-2</div></div></div>';
    };
    CustomRenders.customcard_vp_28 = function () {
        return '<div class="vp_qty">1/</div><div class="cnt_media token_img tracker_resFighter depth_1"></div>';
    };
    CustomRenders.customcard_action_33 = function () {
        return '<div class="groupline">' + this.parseSingleItemToHTML(this.getParse(':'), 1) + this.parseSingleItemToHTML(this.getParse('res_Microbe'), 1) + '</div>'
            + '<div class="groupline">OR&nbsp;' + this.parseSingleItemToHTML(this.getParse('res_Microbe'), 2) + this.parseSingleItemToHTML(this.getParse(':'), 1) + this.parseSingleItemToHTML(this.getParse('o'), 1) + '</div>';
    };
    CustomRenders.customcard_action_34 = function () {
        return '<div class="groupline">' + this.parseSingleItemToHTML(this.getParse(':', 0), 1) + this.parseSingleItemToHTML(this.getParse('res_Microbe', 0), 1) + '</div>'
            + '<div class="groupline">OR&nbsp;' + this.parseSingleItemToHTML(this.getParse('res_Microbe', 1), 2) + this.parseSingleItemToHTML(this.getParse(':', 0), 1) + this.parseSingleItemToHTML(this.getParse('t', 0), 1) + '</div>';
    };
    CustomRenders.customcard_vp_35 = function () {
        return '<div class="vp_qty">1/2</div>' + this.parseSingleItemToHTML(this.getParse('res_Microbe', 0), 1);
    };
    CustomRenders.customcard_rules_37 = function () {
        return '<div class="card_icono icono_prod">' +
            '<div class="outer_production">'
            + '<div class="groupline">'
            + this.parseSingleItemToHTML(this.getParse('pp'), 1) + '&nbsp;OR'
            + '</div>'
            + '<div class="groupline">'
            + '3&nbsp;' + this.parseSingleItemToHTML(this.getParse('tagPlant'), 1) + ':' + this.parseSingleItemToHTML(this.getParse('pp', 0), 4)
            + '</div>'
            + '</div>'
            + '</div>'
            + '<div class="card_icono icono_gains cnt_gains">'
            + '<div class="outer_gains">' + this.parseSingleItemToHTML(this.getParse('tr', 0), 2) + this.parseSingleItemToHTML(this.getParse('t', 0), 1)
            + '</div>'
            + '</div>';
    };
    CustomRenders.customcard_vp_49 = function () {
        return '<div class="vp_qty">1/4</div>' + this.parseSingleItemToHTML(this.getParse('res_Microbe', 0), 1);
    };
    CustomRenders.customcard_rules_50 = function () {
        return '<div class="card_icono icono_gains cnt_gains">' +
            '<div class="outer_gains">' +
            '              <div class="plusminus">-</div>' +
            '              2&nbsp;<div class="outer_redborder redborder_resource">' +
            '                        <div class="cnt_media token_img tracker_resAnimal depth_1"></div>' +
            '                     </div>' +
            '&nbsp;0R&nbsp;' +
            '            <div class="plusminus">-</div>' +
            '            5&nbsp;' +
            '            <div class="outer_redborder redborder_resource">' +
            '                <div class="cnt_media token_img tracker_p depth_1"></div>' +
            '            </div>' +
            '          </div>' +
            '     </div>';
        //  '<div class="card_tt">'+_('Remove up to 2 animals or 5 plants from any player.')+'</div>';
    };
    CustomRenders.customcard_vp_52 = function () {
        return '<div class="vp_qty">1/</div>' + this.parseSingleItemToHTML(this.getParse('res_Animal', 0), 1);
    };
    CustomRenders.customcard_vp_54 = function () {
        return '<div class="vp_qty">1/2</div>' + this.parseSingleItemToHTML(this.getParse('res_Animal', 0), 1);
    };
    CustomRenders.customcard_action_69 = function () {
        return '<div class="card_action_line card_action_icono"><div class="card_icono icono_losses cnt_losses"><div class="outer_gains">' + this.parseSingleItemToHTML(this.getParse('p', 0), 1) + '&nbsp;/&nbsp;' + this.parseSingleItemToHTML(this.getParse('s', 0), 1) + '</div></div><div class="action_arrow"></div><div class="card_icono icono_gains cnt_gains"><div class="outer_gains">' + this.parseSingleItemToHTML(this.getParse('m', 0), 7) + '</div></div></div>';
    };
    CustomRenders.customcard_action_71 = function () {
        return '<div class="card_action_line card_action_icono"><div class="card_icono">' +
            '<div class="outer_gains">' + this.parseSingleItemToHTML(this.getParse('u', 0), 1) + '&nbsp;:&nbsp;+' + this.parseSingleItemToHTML(this.getParse('m', 0), 1) + '</div>' +
            '<div class="outer_gains">' + this.parseSingleItemToHTML(this.getParse('s', 0), 1) + '&nbsp;:&nbsp;+' + this.parseSingleItemToHTML(this.getParse('m', 0), 1) + '</div>' +
            '</div></div>';
    };
    CustomRenders.customcard_vp_72 = function () {
        return '<div class="vp_qty">1/2</div>' + this.parseSingleItemToHTML(this.getParse('res_Animal', 0), 1);
    };
    CustomRenders.customcard_effect_74 = function () {
        return '<div class="groupline">'
            + this.parseSingleItemToHTML(this.getParse('tagPlant', 0), 1) + '/' + this.parseSingleItemToHTML(this.getParse('tagMicrobe', 0), 1) + '/' + this.parseSingleItemToHTML(this.getParse('tagAnimal', 0), 1)
            + '&nbsp;:&nbsp;'
            + this.parseSingleItemToHTML(this.getParse('p', 0), 1) + '/' + this.parseSingleItemToHTML(this.getParse('res_Microbe', 0), 1) + '<div class="resource_exponent">*</div>/' + this.parseSingleItemToHTML(this.getParse('res_Animal', 0), 1) + '<div class="resource_exponent">*</div>'
            + '</div>';
    };
    CustomRenders.customcard_vp_81 = function () {
        return '<div class="vp_qty">1/</div>' + this.parseSingleItemToHTML(this.getParse('tagJovian', 0), 1);
    };
    CustomRenders.customcard_vp_85 = function () {
        return '<div class="vp_qty">1/</div><div class="outer_redborder redborder_hex"><div class="cnt_media tracker tracker_city depth_2"></div></div>' + '<div class="vp_qty">*</div>';
    };
    CustomRenders.customcard_rules_86 = function () {
        return '<div class="groupline">' + _('COPY A %i').replace('%i', '<div class="card_icono icono_prod"><div class="outer_production"><div class="production_line cnt_gains"><div class="outer_production"><div class="badge tag_Building"></div></div></div></div></div>')
            + '</div>';
    };
    CustomRenders.customcard_vp_92 = function () {
        return '<div class="vp_qty">1/</div>' + this.parseSingleItemToHTML(this.getParse('tagJovian', 0), 1);
    };
    CustomRenders.customcard_vp_95 = function () {
        return '<div class="vp_qty">2/</div>' + this.parseSingleItemToHTML(this.getParse('res_Science', 0), 1);
    };
    CustomRenders.customcard_rules_102 = function () {
        return '<div class="groupline"><div class="card_icono icono_prod"><div class="outer_production"><div class="production_line cnt_gains"><div class="outer_production">' + this.parseSingleItemToHTML(this.getParse('e', 0), 1) + '&nbsp;/&nbsp;' + this.parseSingleItemToHTML(this.getParse('tagEnergy', 0), 1) + '</div></div></div></div></div>';
    };
    CustomRenders.customcard_action_110 = function () {
        return '<div class="action_arrow"></div><div class="outer_gains">' +
            _('ACTION : LOOK AT THE TOP CARD AND EITHER BUY IT OR DISCARD IT') +
            '</div>';
    };
    CustomRenders.customcard_rules_121 = function () {
        return '<div class="card_icono icono_losses cnt_losses"><div class="outer_gains"><div class="plusminus">-</div>3<div class="outer_redborder redborder_resource">' + this.parseSingleItemToHTML(this.getParse('u', 0), 1) + '</div>&nbsp;OR&nbsp;4&nbsp;<div class="outer_redborder redborder_resource">' + this.parseSingleItemToHTML(this.getParse('s', 0), 1) + '</div>OR&nbsp;<div class="plusminus">-</div><div class="outer_redborder redborder_resource">' + this.parseSingleItemToHTML(this.getParse('m', 0), 7) + '</div></div></div><div class="card_icono icono_gains cnt_gains"></div>';
    };
    CustomRenders.customcard_rules_124 = function () {
        return '<div class="card_icono icono_losses cnt_losses"><div class="outer_gains">' + _('STEAL') + '&nbsp;2&nbsp;<div class="outer_redborder redborder_resource">' + this.parseSingleItemToHTML(this.getParse('s', 0), 1) + '</div></div><div class="outer_gains">' + _('OR STEAL ') + '&nbsp;<div class="outer_redborder redborder_resource">' + this.parseSingleItemToHTML(this.getParse('m', 0), 3) + '</div></div></div>';
    };
    CustomRenders.customcard_effect_128 = function () {
        return '<div class="groupline">'
            + this.parseSingleItemToHTML(this.getParse('tagPlant', 0), 1) + '&nbsp;/&nbsp;' + this.parseSingleItemToHTML(this.getParse('tagAnimal', 0), 1)
            + '&nbsp;:&nbsp;'
            + this.parseSingleItemToHTML(this.getParse('res_Animal', 0), 1)
            + '</div>';
    };
    CustomRenders.customcard_vp_128 = function () {
        return '<div class="vp_qty">1/2</div>' + this.parseSingleItemToHTML(this.getParse('res_Animal', 0), 1);
    };
    CustomRenders.customcard_effect_131 = function () {
        return '<div class="groupline">'
            + this.parseSingleItemToHTML(this.getParse('tagPlant', 0), 1) + '&nbsp;/&nbsp;' + this.parseSingleItemToHTML(this.getParse('tagAnimal', 0), 1) + '&nbsp;/&nbsp;' + this.parseSingleItemToHTML(this.getParse('tagMicrobe', 0), 1)
            + '&nbsp;:&nbsp;'
            + this.parseSingleItemToHTML(this.getParse('res_Microbe', 0), 1)
            + '</div>';
    };
    CustomRenders.customcard_vp_131 = function () {
        return '<div class="vp_qty">1/3</div>' + this.parseSingleItemToHTML(this.getParse('res_Microbe', 0), 1);
    };
    CustomRenders.customcard_rules_143 = function () {
        return '<div class="card_icono icono_gains cnt_gains">'
            + this.parseSingleItemToHTML(this.getParse('w'), 1)
            + this.parseSingleItemToHTML(this.getParse('draw'), 2)
            + '&nbsp;&nbsp;'
            + this.parseSingleItemToHTML(this.getParse('p', 0), 5) + '&nbsp;/&nbsp;' + this.parseSingleItemToHTML(this.getParse('res_Animal', 0), 4) + '*'
            + '</div>';
    };
    CustomRenders.customcard_vp_147 = function () {
        return '<div class="vp_qty">1/2</div>' + this.parseSingleItemToHTML(this.getParse('res_Animal', 0), 1);
    };
    CustomRenders.customcard_rules_152 = function () {
        return '<div class="card_icono icono_prod"><div class="outer_production"><div class="production_line cnt_losses"><div class="plusminus">-</div>X&nbsp;<div class="outer_production">' + this.parseSingleItemToHTML(this.getParse('h', 0), 1) + '</div><div class="plusminus">+</div><div class="outer_production"><div class="cnt_media token_img tracker_m depth_2">X</div></div></div></div></div>';
    };
    CustomRenders.customcard_rules_153 = function () {
        return '<div class="groupline">'
            + '<div class="prereq_content mode_min">'
            + this.parseSingleItemToHTML(this.getParse('o', 0), 1) + '&nbsp;/&nbsp;' + this.parseSingleItemToHTML(this.getParse('w', 0), 1) + '&nbsp;/&nbsp;' + this.parseSingleItemToHTML(this.getParse('t', 0), 1)
            + '</div>'
            + '&nbsp;:&nbsp;'
            + '+/-2'
            + '</div>';
    };
    CustomRenders.customcard_action_157 = function () {
        return '<div class="groupline">' + this.parseSingleItemToHTML(this.getParse(':', 0), 1) + this.parseSingleItemToHTML(this.getParse('res_Microbe', 0), 1) + '</div>'
            + '<div class="groupline">OR&nbsp;3&nbsp;' + this.parseSingleItemToHTML(this.getParse('res_Microbe', 1), 1) + this.parseSingleItemToHTML(this.getParse(':', 0), 1) + this.parseSingleItemToHTML(this.getParse('tr', 0), 1) + '</div>';
    };
    CustomRenders.customcard_vp_172 = function () {
        return '<div class="vp_qty">1/2</div>' + this.parseSingleItemToHTML(this.getParse('res_Animal', 0), 1);
    };
    CustomRenders.customcard_effect_173 = function () {
        return '<div class="groupline">' + _('OPPONENTS MAT NOT REMOVE YOUR') + '</div>'
            + '<div class="groupline">' + this.parseSingleItemToHTML(this.getParse('p', 0), 1) + this.parseSingleItemToHTML(this.getParse('res_Animal', 0), 1) + this.parseSingleItemToHTML(this.getParse('res_Microbe', 0), 1) + '</div>';
    };
    CustomRenders.customcard_vp_184 = function () {
        return '<div class="vp_qty">1/</div>' + this.parseSingleItemToHTML(this.getParse('res_Animal', 0), 1);
    };
    CustomRenders.customcard_effect_185 = function () {
        return '<div class="card_action_line card_action_icono"><div class="card_icono icono_losses cnt_losses"><div class="outer_gains">' + this.parseSingleItemToHTML(this.getParse('tagScience', 0), 1) + '</div></div><div class="effect_separator">:</div><div class="card_icono icono_gains cnt_gains"><div class="outer_gains">' + this.parseSingleItemToHTML(this.getParse('res_Science', 0), 1) + ('OR') + '-' + this.parseSingleItemToHTML(this.getParse('res_Science', 0), 1) + '&nbsp;+<div class=" cnt_media token_img cardback depth_3"></div></div></div></div>';
    };
    CustomRenders.customcard_vp_198 = function () {
        return '<div class="vp_qty">1/3</div><div class="outer_redborder redborder_hex"><div class="cnt_media tracker tracker_city depth_2"></div></div>';
    };
    CustomRenders.customcard_action_194 = function () {
        return '<div class="card_action_line card_action_icono"><div class="card_icono icono_losses cnt_losses"><div class="outer_gains">X<div class="cnt_media token_img tracker_e depth_2"></div></div></div><div class="action_arrow"></div><div class="card_icono icono_gains cnt_gains"><div class="outer_gains"><div class="cnt_media token_img tracker_m depth_2">X</div></div></div></div>';
    };
    CustomRenders.customcard_effect_206 = function () {
        return '<div class="groupline">'
            + '<div class="prereq_content mode_min">'
            + this.parseSingleItemToHTML(this.getParse('o', 0), 1) + '&nbsp;/&nbsp;' + this.parseSingleItemToHTML(this.getParse('w', 0), 1) + '&nbsp;/&nbsp;' + this.parseSingleItemToHTML(this.getParse('t', 0), 1)
            + '</div>'
            + '&nbsp;:&nbsp;'
            + '+/-2'
            + '</div>';
    };
    CustomRenders.customcard_rules_207 = function () {
        return '<div class="card_icono icono_prod"><div class="outer_production"><div class="production_line cnt_gains"><div class="outer_production"><div class="cnt_media token_img tracker_m depth_1">1</div></div>&nbsp;/&nbsp;<div class="outer_production">2' + this.parseSingleItemToHTML(this.getParse('tagBuilding', 0), 1) + '</div></div></div></div>';
    };
    CustomRenders.parses = {
        forest: { classes: "tracker tracker_forest" },
        all_city: { classes: "tracker tracker_city", redborder: 'hex' },
        all_tagEvent: { classes: "tracker badge tracker_tagEvent", after: '*' },
        play_cardEvent: { classes: "tracker badge tracker_tagEvent" },
        city: { classes: "tracker micon tracker_city" },
        ocean: { classes: "token_img tracker_w" },
        discard: { classes: "token_img cardback", before: '-' },
        draw: { classes: "token_img cardback", before: '+' },
        tile: { classes: "tracker micon tile_%card_number%" },
        tagScience: { classes: "tracker badge tracker_tagScience" },
        tagEnergy: { classes: "tracker badge tracker_tagEnergy" },
        tagMicrobe: { classes: "tracker badge tracker_tagMicrobe" },
        tagPlant: { classes: "tracker badge tracker_tagPlant" },
        tagAnimal: { classes: "tracker badge tracker_tagAnimal" },
        tagJovian: { classes: "tracker badge tracker_tagJovian" },
        tagBuilding: { classes: "tracker badge tracker_tagBuilding" },
        opp_tagSpace: { classes: "tracker badge tracker_tagSpace", redborder: 'resource' },
        tagSpace: { classes: "tracker badge tracker_tagSpace" },
        tagEvent: { classes: "tracker badge tracker_tagEvent" },
        onPay_tagEarth: { classes: "tracker badge tracker_tagEarth" },
        tagEarth: { classes: "tracker badge tracker_tagEarth" },
        "[1,](sell)": { classes: "" },
        onPay_cardSpace: { classes: "tracker badge tracker_tagSpace" },
        onPay_card: { classes: "empty" },
        twopoints: { classes: "txtcontent", content: ':' },
        play_stan: { classes: "txtcontent", content: 'Standard projects' },
        star: { classes: "txtcontent", content: '*' },
        res_Science: { classes: "token_img tracker_resScience" },
        res_Animal: { classes: "token_img tracker_resAnimal" },
        res_Microbe: { classes: "token_img tracker_resMicrobe" },
        nores_Animal: { classes: "token_img tracker_resAnimal", redborder: 'resource', norepeat: true },
        nores_Microbe: { classes: "token_img tracker_resMicrobe", redborder: 'resource', norepeat: true },
        ores_Microbe: { classes: "token_img tracker_resMicrobe", after: '*', norepeat: true },
        ores_Animal: { classes: "token_img tracker_resAnimal", after: '*', norepeat: true },
        special_tagmicrobe_half: { classes: "tracker badge tracker_tagMicrobe", content: "2", norepeat: true },
        res: { classes: "token_img tracker_res%res%", norepeat: true },
        nres: { classes: "token_img tracker_res%res%", norepeat: true },
        nmu: { classes: "token_img tracker_m nmu", negative: true, content: "1", exp: "token_img tracker_u" },
        nms: { classes: "token_img tracker_m nms", negative: true, content: "1", exp: "token_img tracker_s" },
        npe: { classes: "token_img tracker_e", negative: true, production: true },
        npm: { classes: "token_img tracker_m", negative: true, production: true, content: "1" },
        npu: { classes: "token_img tracker_u", negative: true, production: true },
        nps: { classes: "token_img tracker_s", negative: true, production: true },
        npp: { classes: "token_img tracker_p", negative: true, production: true },
        nph: { classes: "token_img tracker_h", negative: true, production: true },
        ne: { classes: "token_img tracker_e", negative: true },
        nm: { classes: "token_img tracker_m", negative: true, content: "1" },
        nu: { classes: "token_img tracker_u", negative: true },
        ns: { classes: "token_img tracker_s", negative: true },
        np: { classes: "token_img tracker_p", negative: true },
        nh: { classes: "token_img tracker_h", negative: true },
        pe: { classes: "token_img tracker_e", production: true },
        pm: { classes: "token_img tracker_m", production: true, content: "1" },
        pu: { classes: "token_img tracker_u", production: true },
        ps: { classes: "token_img tracker_s", production: true },
        pp: { classes: "token_img tracker_p", production: true },
        ph: { classes: "token_img tracker_h", production: true },
        tr: { classes: "token_img tracker_tr" },
        e: { classes: "token_img tracker_e" },
        m: { classes: "token_img tracker_m", content: "1" },
        u: { classes: "token_img tracker_u" },
        s: { classes: "token_img tracker_s" },
        p: { classes: "token_img tracker_p" },
        h: { classes: "token_img tracker_h" },
        t: { classes: "token_img temperature_icon" },
        w: { classes: "token_img tracker_w" },
        o: { classes: "token_img oxygen_icon" },
        ":": { classes: "action_arrow" },
    };
    return CustomRenders;
}());
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
        var _a, _b;
        var tokenId = placeInfo.key;
        var info = this.getTokenDisplayInfo(tokenId);
        var place = (_b = (_a = placeInfo.from) !== null && _a !== void 0 ? _a : placeInfo.location) !== null && _b !== void 0 ? _b : this.getRulesFor(tokenId, "location");
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
        var _a, _b;
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
            var placeInfo = (_a = args.placeInfo) !== null && _a !== void 0 ? _a : this.getPlaceRedirect(tokenInfo);
            var location_1 = placeInfo.location;
            // console.log(token + ": " + " -place-> " + place + " " + tokenInfo.state);
            this.saveRestore(token);
            if (tokenNode == null) {
                //debugger;
                if (!placeInfo.from && args.place_from)
                    placeInfo.from = args.place_from;
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
                return;
            }
            if (!$(location_1)) {
                if (location_1)
                    console.error("Unknown place '" + location_1 + "' for '" + tokenInfo.key + "' " + token);
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
            var animtime = (_b = placeInfo.animtime) !== null && _b !== void 0 ? _b : this.defaultAnimationDuration;
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
            this.handleStackedTooltips(attachNode);
        }
        else {
            attachNode.classList.remove("withtooltip");
        }
    };
    GameTokens.prototype.handleStackedTooltips = function (attachNode) {
    };
    GameTokens.prototype.removeTooltip = function (nodeId) {
        // if (this.tooltips[nodeId]) 
        //     console.log('removing tooltip for ',nodeId);
        this.inherited(arguments);
        this.tooltips[nodeId] = null;
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
        if (tokenInfo.create == 3 || tokenInfo.create == 4) {
            tokenInfo.color = getPart(tokenId, 1);
        }
        if (!tokenInfo.key) {
            tokenInfo.key = tokenId;
        }
        tokenInfo.tokenId = tokenId;
        this.updateTokenDisplayInfo(tokenInfo);
        return tokenInfo;
    };
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
        this.subscribeNotification("tokenMoved");
        this.subscribeNotification("tokenMovedAsync", 1, "tokenMoved"); // same as conter but no delay
        /*
        dojo.subscribe("tokenMoved", this, "notif_tokenMoved");
        this.notifqueue.setSynchronous("tokenMoved", 500);
        dojo.subscribe("tokenMovedAsync", this, "notif_tokenMoved"); // same as tokenMoved but no delay
    
         */
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
    // private parses:any;
    function GameXBody() {
        var _this = _super.call(this) || this;
        _this.CON = {};
        return _this;
    }
    GameXBody.prototype.setup = function (gamedatas) {
        var _this = this;
        try {
            this.isDoingSetup = true;
            this.CON = gamedatas.CON; // PHP contants for game
            this.defaultTooltipDelay = 800;
            this.vlayout = new VLayout(this);
            this.custom_pay = undefined;
            this.local_counters = [];
            this.clearReverseIdMap();
            this.customAnimation = new CustomAnimation(this);
            //layout
            this.previousLayout = "desktop";
            this.zoneWidth = 0;
            this.zoneHeight = 0;
            this.local_counters["game"] = { cities: 0 };
            this.setupLocalSettings();
            _super.prototype.setup.call(this, gamedatas);
            // hex tooltips
            document.querySelectorAll(".hex").forEach(function (node) {
                _this.updateTooltip(node.id);
            });
            // hexes are not moved so manually connect
            this.connectClass("hex", "onclick", "onToken");
            //player controls
            this.connectClass("viewcards_button", "onclick", "onShowTableauCardsOfColor");
            //Give tooltips to alt trackers in player boards
            document.querySelectorAll(".player_controls .viewcards_button").forEach(function (node) {
                _this.addTooltipHtml(node.id, _this.getTooptipHtmlForToken(node.id), _this.defaultTooltipDelay);
            });
            //view discard content
            this.setupDiscard();
            //floating hand stuff
            this.connect($("hand_area_button_pop"), "onclick", function () {
                $("hand_area").dataset.open = $("hand_area").dataset.open == "1" ? "0" : "1";
            });
            // fixed for undo in fake player panel
            document.querySelectorAll("#player_config > #player_board_params").forEach(function (node) {
                dojo.destroy(node); // on undo this remains but another one generated
            });
            dojo.place("player_board_params", "player_config", "last");
            //give tooltips to params
            document.querySelectorAll("#player_config .params_line").forEach(function (node) {
                _this.updateTooltip(node.id, node);
            });
            //Give tooltips to trackers in mini boards
            document.querySelectorAll(".mini_counter").forEach(function (node) {
                var id = node.id;
                if (id.startsWith("alt_")) {
                    _this.updateTooltip(id.substring(4), node);
                }
            });
            //Give tooltips to alt trackers in player boards
            document.querySelectorAll(".player_counters .tracker").forEach(function (node) {
                var id = node.id;
                if (id.startsWith("alt_")) {
                    _this.updateTooltip(id.substring(4), node);
                }
            });
            //update prereq on cards
            this.updateHandPrereqs();
            // card reference
            this.setupHelpSheets();
            // Panel ZOOM
            if (this.isLayoutFull()) {
                //this.setZoom(undefined);
            }
            this.connect($("zoom-out"), "onclick", function () {
                var ms = _this.localSettings.getLocalSettingById("mapsize");
                _this.localSettings.doAction(ms, "minus");
                var cs = _this.localSettings.getLocalSettingById("cardsize");
                _this.localSettings.doAction(cs, "minus");
            });
            this.connect($("zoom-in"), "onclick", function () {
                var ms = _this.localSettings.getLocalSettingById("mapsize");
                _this.localSettings.doAction(ms, "plus");
                var cs = _this.localSettings.getLocalSettingById("cardsize");
                _this.localSettings.doAction(cs, "plus");
            });
            this.isDoingSetup = false;
        }
        catch (e) {
            console.error(e);
            console.log("Ending game setup");
            this.isDoingSetup = false;
            this.showError("Error during game setup: " + e);
        }
    };
    GameXBody.prototype.setupPlayer = function (playerInfo) {
        _super.prototype.setupPlayer.call(this, playerInfo);
        this.local_counters[playerInfo.color] = {
            cards_1: 0,
            cards_2: 0,
            cards_3: 0
        };
        this.vlayout.setupPlayer(playerInfo);
        //move own player board in main zone
        if (playerInfo.id == this.player_id || (!this.isLayoutFull() && this.isSpectator && !document.querySelector(".thisplayer_zone"))) {
            var board = $("player_area_".concat(playerInfo.color));
            dojo.place(board, "main_board", "after");
            dojo.addClass(board, "thisplayer_zone");
        }
    };
    GameXBody.prototype.setupLocalSettings = function () {
        var _a;
        //local settings, include user id into setting string so it different per local player
        var theme = (_a = this.prefs[100].value) !== null && _a !== void 0 ? _a : 1;
        this.localSettings = new LocalSettings("mars-" + theme + "-" + this.player_id, [
            { key: "handplace", label: _("Floating Hand"), choice: { floating: true }, default: false, ui: "checkbox" },
            { key: "cardsize", label: _("Card size"), range: { min: 15, max: 200, inc: 5 }, default: 100, ui: "slider" },
            { key: "mapsize", label: _("Map size"), range: { min: 15, max: 200, inc: 5 }, default: 100, ui: "slider" },
            {
                key: "playerarea",
                label: _("Map placement"),
                choice: { after: _("First"), before: _("Second") },
                default: "after"
            },
            {
                key: "hidebadges",
                label: _("Hide Badges on minipanel"),
                choice: { hide: true },
                default: false,
                ui: "checkbox"
            }
        ]);
        this.localSettings.setup();
        //this.localSettings.renderButton('player_config_row');
        this.localSettings.renderContents("settings-controls-container");
    };
    GameXBody.prototype.refaceUserPreference = function (pref_id, node, prefDivId) {
        var _this = this;
        var _a;
        // can override to change apperance
        var pref = this.prefs[pref_id];
        console.log("PREF", pref);
        if (pref_id == 100 || pref_id == 101) {
            var pp = $(prefDivId).parentElement;
            pp.removeChild($(prefDivId));
            var pc_1 = this.createDivNode(prefDivId, "custom_pref " + prefDivId, pp);
            for (var v in pref.values) {
                var optionValue = pref.values[v];
                var option = this.createDivNode("".concat(prefDivId, "_v").concat(v), "custom_pref_option pref_".concat((_a = optionValue.cssPref) !== null && _a !== void 0 ? _a : ""), pc_1);
                option.setAttribute("value", v);
                option.innerHTML = optionValue.name;
                if (pref.value == v) {
                    option.setAttribute("selected", "selected");
                }
                dojo.connect(option, "onclick", function (e) {
                    pc_1.querySelectorAll(".custom_pref_option").forEach(function (node) { return node.removeAttribute("selected"); });
                    e.target.setAttribute("selected", "selected");
                    _this.onChangePreferenceCustom(e);
                });
            }
            return true;
        }
        return false; // return false to hook defaut listener, other return true and you have to hook listener yourself
    };
    GameXBody.prototype.setupHelpSheets = function () {
        var _this = this;
        var cc = { main: 0, corp: 0 };
        for (var key in this.gamedatas.token_types) {
            var info = this.gamedatas.token_types[key];
            if (key.startsWith("card")) {
                var num = getPart(key, 2);
                var type = getPart(key, 1);
                var helpnode = document.querySelector("#allcards_".concat(type, " .expandablecontent"));
                if (!helpnode)
                    continue;
                // XXX hook proper rendering
                //const div = dojo.place(`<div id='card_${type}_${num}_help' class='card token card_${type} card_${type}_${num}'></div>`, helpnode);
                var token = {
                    key: "card_".concat(type, "_").concat(num, "_help"),
                    location: helpnode.id,
                    state: 0
                };
                var tokenNode = this.createToken(token);
                this.syncTokenDisplayInfo(tokenNode);
                this.updateTooltip("card_".concat(type, "_").concat(num), tokenNode);
                cc[type]++;
            }
        }
        var ccmain = cc["main"];
        var cccorp = cc["corp"];
        $("allcards_main_title").innerHTML = _("All Project Cards (".concat(ccmain, ")"));
        $("allcards_corp_title").innerHTML = _("All Corporate Cards (".concat(cccorp, ")"));
        // clicks
        dojo.query(".expandablecontent > *").connect("onclick", this, function (event) {
            var id = event.currentTarget.id;
            _this.showHelp(id, true);
        });
        dojo.query("#allcards .expandabletoggle").connect("onclick", this, "onToggleAllCards");
    };
    GameXBody.prototype.setupDiscard = function () {
        var _this = this;
        this.connect($("discard_title"), "onclick", function () {
            _this.showHiddenContent("discard_main", _("Discard pile contents"));
        });
    };
    GameXBody.prototype.showHiddenContent = function (id, title) {
        var _this = this;
        var dlg = new ebg.popindialog();
        dlg.create("cards_dlg");
        dlg.setTitle(title);
        var cards_htm = this.cloneAndFixIds(id, "_tt", true).innerHTML;
        var html = '<div id="card_dlg_content">' + cards_htm + "</div>";
        dlg.setContent(html);
        $("card_dlg_content")
            .querySelectorAll(".token")
            .forEach(function (node) {
            _this.updateTooltip(node.id, node);
        });
        dlg.show();
    };
    GameXBody.prototype.onScreenWidthChange = function () {
        if (this.isLayoutFull()) {
            _super.prototype.onScreenWidthChange.call(this);
        }
        else {
            var width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
            var height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
            dojo.style("page-content", "zoom", "");
            if (this.zoneWidth != width || this.zoneHeight != height) {
                //   console.log("changed res w,h", width, height);
                this.zoneWidth = width;
                this.zoneHeight = height;
                if (dojo.hasClass("ebd-body", "mobile_version") && this.previousLayout == "desktop" && width < height) {
                    this.previousLayout = "mobile";
                    dojo.addClass("ebd-body", "mobile_portrait");
                }
                else if (!dojo.hasClass("ebd-body", "mobile_version") && this.previousLayout == "mobile" && width > height) {
                    this.previousLayout = "desktop";
                    dojo.removeClass("ebd-body", "mobile_portrait");
                }
            }
        }
    };
    GameXBody.prototype.onToggleAllCards = function (event) {
        dojo.stopEvent(event);
        var node = event.currentTarget;
        var parent = node.parentNode.parentNode;
        var content = parent.querySelector(".expandablecontent");
        var toExpand = dojo.style(content, "display") == "none";
        var arrow = parent.querySelector(".expandablearrow " + "div");
        if (toExpand) {
            dojo.style(content, "display", "block");
            dojo.removeClass(arrow, "icon20_expand");
            dojo.addClass(arrow, "icon20_collapse");
        }
        else {
            dojo.style(content, "display", "none");
            dojo.removeClass(arrow, "icon20_collapse");
            dojo.addClass(arrow, "icon20_expand");
        }
    };
    GameXBody.prototype.onNotif = function (notif) {
        _super.prototype.onNotif.call(this, notif);
        this.darhflog("playing notif " + notif.type + " with args ", notif.args);
        //Displays message in header while the notif is playing
        if (!this.instantaneousMode && notif.log) {
            if ($("gameaction_status_wrap").style.display != "none") {
                var msg = this.format_string_recursive(notif.log, notif.args);
                if (msg != "") {
                    $("gameaction_status").innerHTML = msg;
                }
            }
            else {
                // XXX this is very bad in multiple player all yout buttons dissapear
                // currently gameaction_status should be visible
                this.setDescriptionOnMyTurn(notif.log, notif.args);
            }
        }
    };
    //make custom animations depending on situation
    GameXBody.prototype.notif_tokenMoved = function (notif) {
        _super.prototype.notif_tokenMoved.call(this, notif);
        //pop animation on Tiles
        if (notif.args.token_id && notif.args.token_id.startsWith("tile_")) {
            return this.customAnimation.animateTilePop(notif.args.token_id);
        }
        else if (notif.args.token_id && notif.args.token_id.startsWith("resource_") && notif.args.place_id.startsWith("card_main_")) {
            return this.customAnimation.animatePlaceResourceOnCard(notif.args.token_id, notif.args.place_id);
        }
        else if (notif.args.token_id && notif.args.token_id.startsWith("resource_") && notif.args.place_id.startsWith("tableau_")) {
            return this.customAnimation.animateRemoveResourceFromCard(notif.args.token_id);
        }
    };
    GameXBody.prototype.notif_counter = function (notif) {
        _super.prototype.notif_counter.call(this, notif);
        //move animation on main player board counters
        /*
        const counter_move=["m","pm","s","ps","u","pu","p","pp","e","pe","h","ph"].map((item)=>{
          return "tracker_"+item+"_";
        });*/
        var counter_move = ["m", "s", "u", "p", "e", "h", "tr"].map(function (item) {
            return "tracker_" + item + "_";
        });
        if (notif.args.inc && counter_move.some(function (trk) { return notif.args.counter_name.startsWith(trk); })) {
            this.customAnimation.animatetingle(notif.args.counter_name);
            return this.customAnimation.moveResources(notif.args.counter_name, notif.args.inc);
        }
        else {
            if ($(notif.args.counter_name)) {
                return this.customAnimation.animatetingle(notif.args.counter_name);
            }
            else {
                return this.customAnimation.wait(200);
            }
        }
    };
    GameXBody.prototype.getCardTypeById = function (type) {
        switch (type) {
            case 0:
                return _("Standard Project");
            case 1:
                return _("Project Card - Green");
            case 3:
                return _("Project Card - Event");
            case 2:
                return _("Project Card - Blue");
            case 4:
                return _("Corporation");
            case 5:
                return _("Prelude");
            case 7:
                return _("Milestone");
            case 8:
                return _("Award");
            default:
                return "?";
        }
    };
    GameXBody.prototype.generateTooltipSection = function (label, body, optional, additional_class) {
        if (optional === void 0) { optional = true; }
        if (additional_class === void 0) { additional_class = ""; }
        if (optional && !body)
            return "";
        return "<div class=\"tt_section ".concat(additional_class, "\"><div class=\"tt_intertitle\">").concat(label, "</div><div class='card_tt_effect'>").concat(body, "</div></div>");
    };
    GameXBody.prototype.generateCardTooltip_Compact = function (displayInfo) {
        var type = displayInfo.t;
        var htm = '<div class="compact_card_tt %adcl"><div class="card_tooltipimagecontainer">%c</div><div class="card_tooltipcontainer" data-card-type="' +
            type +
            '">%t</div></div>';
        var fullitemhtm = "";
        var fulltxt = "";
        var adClass = "";
        var elemId = displayInfo.key;
        // XXX this function not suppose to look for js element in the DOM because it may not be there
        if (!$(elemId) && $("".concat(elemId, "_help"))) {
            elemId = "".concat(elemId, "_help");
        }
        if (type !== undefined) {
            fulltxt = this.generateCardTooltip(displayInfo);
            if (type >= 1 && type <= 3) {
                //main cards
                var div = this.cloneAndFixIds(elemId, "_tt", true);
                fullitemhtm = div.outerHTML;
                if (div.getAttribute("data-invalid_prereq") == "1") {
                    adClass += "invalid_prereq";
                }
            }
            else if (type == this.CON.MA_CARD_TYPE_CORP) {
                fullitemhtm = this.cloneAndFixIds(elemId, "_tt", true).outerHTML;
            }
            else if (type == this.CON.MA_CARD_TYPE_MILESTONE || type == this.CON.MA_CARD_TYPE_AWARD) {
                fullitemhtm = this.cloneAndFixIds(elemId, "_tt", true).outerHTML;
            }
            else if (type == this.CON.MA_CARD_TYPE_STAN) {
                adClass += "standard_project";
            }
        }
        else {
            if ($(displayInfo.key)) {
                if (displayInfo.key.startsWith("tracker_tr_")) {
                    fullitemhtm = this.cloneAndFixIds(displayInfo.key, "_tt", true).outerHTML;
                }
                /*
                  if (displayInfo.key.startsWith('tracker_m_') ||displayInfo.key.startsWith('tracker_s_') ||displayInfo.key.startsWith('tracker_u_')
                    ||displayInfo.key.startsWith('tracker_p_') ||displayInfo.key.startsWith('tracker_e_')||displayInfo.key.startsWith('tracker_h')) {
                        fullitemhtm="";
                  }*/
            }
            fulltxt = this.generateItemTooltip(displayInfo);
        }
        return htm.replace("%adcl", adClass).replace("%c", fullitemhtm).replace("%t", fulltxt);
    };
    GameXBody.prototype.generateItemTooltip = function (displayInfo) {
        if (!displayInfo)
            return "?";
        var txt = "";
        var key = displayInfo.typeKey;
        var tokenId = displayInfo.tokenId;
        switch (key) {
            case "tracker_tr":
                return this.generateTooltipSection(_("Terraform Rating"), _("Terraform Rating (TR) is the measure of how much you have contributed to the terraforming process. Each time you raise the oxygen level, the temperature, or place an ocean tile, your TR increases as well. Each step of TR is worth 1 VP at the end of the game, and the Terraforming Committee awards you income according to your TR. You start at 20."));
            case "tracker_m":
                return this.generateTooltipSection(_("MegaCredit"), _("The MegaCredit (M€) is the general currency used for buying and playing cards and using standard projects, milestones, and awards."));
            case "tracker_s":
                return this.generateTooltipSection(_(displayInfo.name), _("Steel represents building material on Mars. Usually this means some kind of magnesium alloy. Steel is used to pay for building cards, being worth 2 M€ per steel."));
            case "tracker_u":
                return this.generateTooltipSection(_(displayInfo.name), _("Titanium represents resources in space or for the space industry. Titanium is used to pay for space cards, being worth 3 M€ per titanium."));
            case "tracker_p":
                return this.generateTooltipSection(_(displayInfo.name), _("Plants use photosynthesis. As an action, 8 plant resources can be converted into a greenery tile that you place on the board. This increases the oxygen level (and your TR) 1 step. Each greenery is worth 1 VP and generates 1 VP to each adjacent city tile."));
            case "tracker_e":
                return this.generateTooltipSection(_(displayInfo.name), _("Energy is used by many cities and industries. This usage may either be via an action on a blue card, or via a decrease in energy production. Leftover energy is converted into heat"));
            case "tracker_h":
                return this.generateTooltipSection(_(displayInfo.name), _("Heat warms up the Martian atmosphere. As an action, 8 heat resources may be spent to increase temperature (and therefore your TR) 1 step."));
            case "tracker_passed":
                return this.generateTooltipSection(_("Player passed"), _("If you take no action at all (pass), you are out of the round and may not take any anymore actions this generation. When everyone has passed, the action phase ends."));
            case "tracker_gen":
                return this.generateTooltipSection(_("Generations"), _("Because of the long time spans needed for the projects, this game is played in a series of generations. A generation is a game round."));
            case "tracker_w":
                return this.generateTooltipSection(_(displayInfo.name), _("This global parameter starts with 9 Ocean tiles in a stack, to be placed on the board during the game."));
            case "tracker_o":
                return this.generateTooltipSection(_(displayInfo.name), _("This global parameter starts with 0% and ends with 14% (This percentage compares to Earth's 21% oxygen)"));
            case "tracker_t":
                return this.generateTooltipSection(_(displayInfo.name), _("This global parameter (mean temperature at the equator) starts at -30 ˚C."));
            case "starting_player":
                return this.generateTooltipSection(_(displayInfo.name), _("Shifts clockwise each generation."));
            case "tracker_tagEvent":
                return this.generateTooltipSection(_("Events"), _("Number of event cards played by the player. Unlike other tags, this is not a number of visible event tags, it a number of cards in event pile."));
        }
        if (key.startsWith("hex")) {
            txt += this.generateTooltipSection(_("Coordinates"), "".concat(displayInfo.x, ",").concat(displayInfo.y));
            if (displayInfo.ocean == 1)
                txt += this.generateTooltipSection(_("Reserved For"), _("Ocean"));
            else if (displayInfo.reserved == 1)
                txt += this.generateTooltipSection(_("Reserved For"), _(displayInfo.name));
            if (displayInfo.expr.r) {
                txt += this.generateTooltipSection(_("Bonus"), CustomRenders.parseExprToHtml(displayInfo.expr.r));
            }
            return txt;
        }
        if (key.startsWith("tracker_tag")) {
            txt += this.generateTooltipSection(_("Tags"), _("Number of tags played by the player. A tag places the card in certain categories, which can affect or be affected by other cards, or by the player board (e.g. you can pay with steel when playing a building tag)."));
        }
        else if (key.startsWith("tracker_city") || key.startsWith("tracker_forest") || key.startsWith("tracker_land")) {
            txt += this.generateTooltipSection(_("Tiles on Mars"), _("Number of corresponding tiles played on Mars."));
        }
        else if (key.startsWith("tracker_p")) {
            txt += this.generateTooltipSection(_("Resource Production"), _("Resource icons inside brown boxes refer to production of that resource. During the production phase you add resources equal to your production."));
        }
        else if (tokenId.startsWith("player_viewcards_")) {
            txt += this.generateTooltipSection(_("Cards visibility toggle"), _("Shows or hides cards of the corresponding color."));
        }
        else if (tokenId.startsWith("counter_hand_")) {
            txt += this.generateTooltipSection(_("Hand count"), _("Amount of cards in player's hand."));
        }
        else if (key.startsWith("tile_")) {
            if (displayInfo.tt == 3) {
                txt += this.generateTooltipSection(_("Ocean"), _("Ocean tiles may only be placed on areas reserved for ocean (see map). Placing an ocean tile increases your TR 1 step. Ocean tiles are not owned by any player. Each ocean tile on the board provides a 2 M€ placement bonus for any player later placing a tile, even another ocean, next to it."));
            }
            else if (displayInfo.tt == 2) {
                txt += this.generateTooltipSection(_("City"), _("May not be placed next to another city. Each city tile is worth 1 VP for each adjacent greenery tile (regardless of owner) at the end of the game."));
            }
            else if (displayInfo.tt == 1) {
                txt += this.generateTooltipSection(_("Greenery"), _("If possible, greenery tiles must be placed next to another tile that you own. If you have no available area next to your tiles, or if you have no tile at all, you may place the greenery tile on any available area. When placing a greenery tile, you increase the oxygen level, if possible, and also your TR. If you can’t raise the oxygen level you don’t get the increase in TR either. Greenery tiles are worth 1 VP at the end of the game, and also provide 1 VP to any adjacent city."));
            }
            else {
                txt += this.generateTooltipSection(_("Special Tile"), _("Some cards allow you to place special tiles. Any function or placement restriction is described on the card. Place the tile, and place a player marker on it."));
            }
        }
        if (!txt && displayInfo.tooltip)
            return displayInfo.tooltip;
        return txt;
    };
    GameXBody.prototype.generateTokenTooltip = function (displayInfo) {
        if (!displayInfo)
            return "?";
        if (displayInfo.t === undefined) {
            return this.generateItemTooltip(displayInfo);
        }
        return this.generateCardTooltip(displayInfo);
    };
    GameXBody.prototype.generateCardTooltip = function (displayInfo) {
        var _a;
        if (!displayInfo)
            return "?";
        if (displayInfo.t === undefined) {
            return this.generateItemTooltip(displayInfo);
        }
        var type = displayInfo.t;
        var type_name = this.getCardTypeById(type);
        var card_id = "";
        if (type > 0 && type < 7)
            card_id += (_a = " " + _(displayInfo.deck) + " #" + displayInfo.num) !== null && _a !== void 0 ? _a : "";
        var res = "";
        var tags = "";
        if (displayInfo.tags) {
            for (var _i = 0, _b = displayInfo.tags.split(" "); _i < _b.length; _i++) {
                var tag = _b[_i];
                tags += _(tag) + " ";
            }
        }
        var vp = displayInfo.text_vp;
        if (!vp)
            vp = displayInfo.vp;
        res += this.generateTooltipSection(type_name, card_id);
        if (type != this.CON.MA_CARD_TYPE_CORP)
            res += this.generateTooltipSection(_("Cost"), displayInfo.cost);
        res += this.generateTooltipSection(_("Tags"), tags);
        var prereqText = displayInfo.pre && displayInfo.expr ? CustomRenders.parsePrereqToText(displayInfo.expr.pre, this) : "";
        if (prereqText != "")
            prereqText += '<div class="prereq_notmet">' + _("(You cannot play this card now because pre-requisites are not met.)") + "</div>";
        //special case
        if (card_id == " Basic #135")
            prereqText = _("Requires 1 plant tag, 1 microbe tag and 1 animal tag.");
        res += this.generateTooltipSection(_("Requirement"), prereqText, true, "tt_prereq");
        if (type == this.CON.MA_CARD_TYPE_MILESTONE) {
            var text = _("If you meet the criteria of a milestone, you may\nclaim it by paying 8 M\u20AC and placing your player marker on\nit. A milestone may only be claimed by one player, and only\n3 of the 5 milestones may be claimed in total, so there is a\nrace for these! Each claimed milestone is worth 5 VPs at the\nend of the game.");
            res += this.generateTooltipSection(_("Criteria"), displayInfo.text);
            res += this.generateTooltipSection(_("Victory Points"), vp);
            res += this.generateTooltipSection(_("Info"), text);
        }
        else if (type == this.CON.MA_CARD_TYPE_AWARD) {
            res += this.generateTooltipSection(_("Condition"), displayInfo.text);
            var text = _("The first player to fund an award pays 8 M\u20AC and\nplaces a player marker on it. The next player to fund an\naward pays 14 M\u20AC, the last pays 20 M\u20AC. Only three awards\nmay be funded. Each award can only be funded once. <p>\nIn the final scoring, each award is checked, and 5\nVPs are awarded to the player who wins that category - it\ndoes not matter who funded the award! The second place\ngets 2 VPs (except in a 2-player game where second place\ndoes not give any VPs). Ties are friendly: more than one\nplayer may get the first or second place bonus.\nIf more than one player gets 1st place bonus, no 2nd place is\nawarded.");
            res += this.generateTooltipSection(_("Info"), text);
        }
        else {
            res += this.generateTooltipSection(_("Immediate Effect"), displayInfo.text);
            res += this.generateTooltipSection(_("Effect"), displayInfo.text_effect);
            res += this.generateTooltipSection(_("Action"), displayInfo.text_action);
            res += this.generateTooltipSection(_("Holds"), _(displayInfo.holds));
            res += this.generateTooltipSection(_("Victory Points"), vp);
        }
        return res;
    };
    GameXBody.prototype.createHtmlForToken = function (tokenNode, displayInfo) {
        var _a, _b, _c;
        // use this to generate some fake parts of card, remove this when use images
        if (displayInfo.mainType == "card") {
            var tagshtm = "";
            //removed custom tt
            /*    const ttdiv = this.createDivNode(null, "card_hovertt", tokenNode.id);
        
                ttdiv.innerHTML = `<div class='token_title'>${displayInfo.name}</div>`;
                ttdiv.innerHTML+=this.generateCardTooltip(displayInfo);
                */
            if (tokenNode.id.startsWith("card_corp_")) {
                //Corp formatting
                var decor = this.createDivNode(null, "card_decor", tokenNode.id);
                // const texts = displayInfo.text.split(';');
                var card_initial = displayInfo.text || "";
                var card_effect = displayInfo.text_effect || "";
                var card_title = displayInfo.name || "";
                //   if (texts.length>0) card_initial = texts[0];
                //  if (texts.length>1) card_effect= texts[1];
                decor.innerHTML = "\n                  <div class=\"card_bg\"></div>\n                  <div class=\"card_title\">".concat(card_title, "</div>\n                  <div class=\"card_initial\">").concat(card_initial, "</div>\n                  <div class=\"card_effect\">").concat(card_effect, "</div>\n            ");
            }
            else if (tokenNode.id.startsWith("card_stanproj")) {
                //standard project formatting:
                //cost -> action title
                //except for sell patents
                var decor = this.createDivNode(null, "stanp_decor", tokenNode.id);
                var parsedActions = CustomRenders.parseActionsToHTML(displayInfo.r);
                //const costhtm='<div class="stanp_cost">'+displayInfo.cost+'</div>';
                decor.innerHTML = "\n               <div class='stanp_cost'>".concat(displayInfo.cost != 0 ? displayInfo.cost : "X", "</div>\n               <div class='standard_projects_title'>").concat(displayInfo.name, "</div>  \n            ");
            }
            else {
                //tags
                var firsttag = "";
                if (displayInfo.tags && displayInfo.tags != "") {
                    for (var _i = 0, _d = displayInfo.tags.split(" "); _i < _d.length; _i++) {
                        var tag = _d[_i];
                        tagshtm += '<div class="badge tag_' + tag + '"></div>';
                        if (firsttag == "")
                            firsttag = tag;
                    }
                }
                // const parsedActions = CustomRenders.parseActionsToHTML(displayInfo.a ?? displayInfo.e ?? "");
                var parsedPre = displayInfo.pre ? CustomRenders.parsePrereqToHTML(displayInfo.expr.pre) : "";
                //specific card rendering
                if (displayInfo.num == 2) {
                    parsedPre = '<div class="prereq_content mode_min">' + CustomRenders.parseActionsToHTML("pu") + "</div></div>";
                }
                if (displayInfo.num == 61) {
                    parsedPre = '<div class="prereq_content mode_min">' + CustomRenders.parseActionsToHTML("ps") + "</div></div>";
                }
                if (displayInfo.num == 135) {
                    parsedPre =
                        '<div class="prereq_content mode_min">' + CustomRenders.parseActionsToHTML("tagPlant tagMicrobe tagAnimal") + "</div></div>";
                }
                var decor = this.createDivNode(null, "card_decor", tokenNode.id);
                var vp = "";
                if (displayInfo.vp) {
                    if (CustomRenders["customcard_vp_" + displayInfo.num]) {
                        vp = '<div class="card_vp vp_custom">' + CustomRenders["customcard_vp_" + displayInfo.num]() + "</div></div>";
                    }
                    else {
                        vp = parseInt(displayInfo.vp)
                            ? '<div class="card_vp"><div class="number_inside">' + displayInfo.vp + "</div></div>"
                            : '<div class="card_vp"><div class="number_inside">*</div></div>';
                    }
                }
                else {
                    vp = "";
                }
                var cn_binary = displayInfo.num ? parseInt(displayInfo.num).toString(2).padStart(8, "0") : "";
                //rules+rules styling
                //let card_r = this.parseRulesToHtml(displayInfo.r, displayInfo.num || null );
                var card_r = "";
                var addeffclass = "";
                if (displayInfo.r) {
                    card_r = CustomRenders.parseExprToHtml(displayInfo.expr.r, displayInfo.num || null);
                    addeffclass = card_r.includes("icono_prod") ? "cols" : "rows";
                    var blocks = (card_r.match(/card_icono/g) || []).length;
                    addeffclass += " blocks_" + blocks;
                    var cntLosses = (card_r.match(/cnt_losses/g) || []).length;
                    var cntGains = (card_r.match(/cnt_gains/g) || []).length;
                    var cntProds = (card_r.match(/cnt_media/g) || []).length;
                    if (((cntLosses > 0 && cntGains == 0) || (cntGains > 0 && cntLosses == 0)) &&
                        (cntLosses + cntGains > 1 || (cntLosses + cntGains == 1 && cntProds > 3))) {
                        //exceptions
                        if (displayInfo.num && displayInfo.num != 19) {
                            card_r = '<div class="groupline">' + card_r + "</div>";
                            addeffclass += " oneline";
                        }
                    }
                    if (vp != "")
                        addeffclass += " hasvp";
                    //replaces some stuff in parsed rules
                    card_r = card_r.replace("%card_number%", displayInfo.num);
                    //special for "res"
                    card_r = card_r.replaceAll("%res%", displayInfo.holds);
                }
                //card actions
                var card_a = "";
                if (displayInfo.a) {
                    card_a = CustomRenders.parseExprToHtml(displayInfo.expr.a, displayInfo.num || null, true);
                }
                else if (displayInfo.e) {
                    card_a = CustomRenders.parseExprToHtml(displayInfo.expr.e, displayInfo.num || null, false, true);
                }
                //card 71 has effect in rules
                if (displayInfo.num == 71) {
                    card_a = CustomRenders.customcard_action_71();
                }
                //same for 153
                if (displayInfo.num == 153) {
                    card_a = card_r;
                    card_r = "";
                }
                //card 206 hads rules in action part
                if (displayInfo.num == 206) {
                    card_r = card_a;
                    card_a = "";
                }
                //special for "res"
                card_a = card_a.replaceAll("%res%", displayInfo.holds);
                var card_action_text = "";
                if (displayInfo.text_action || displayInfo.text_effect) {
                    card_action_text = "<div class=\"card_action_line card_action_text\">".concat(displayInfo.text_action || displayInfo.text_effect, "</div>");
                }
                var holds = (_a = displayInfo.holds) !== null && _a !== void 0 ? _a : "Generic";
                var htm_holds = '<div class="card_line_holder"><div class="cnt_media token_img tracker_res' +
                    holds +
                    '"></div><div class="counter_sep">:</div><div id="resource_holder_counter_' +
                    tokenNode.id.replace("card_main_", "") +
                    '" class="resource_counter"  data-resource_counter="0"></div></div>';
                decor.innerHTML = "\n                  <div class=\"card_illustration cardnum_".concat(displayInfo.num, "\"></div>\n                  <div class=\"card_bg\"></div>\n                  <div class='card_badges'>").concat(tagshtm, "</div>\n                  <div class='card_title'><div class='card_title_inner'>").concat(displayInfo.name, "</div></div>\n                  <div id='cost_").concat(tokenNode.id, "' class='card_cost'><div class=\"number_inside\">").concat(displayInfo.cost, "</div></div> \n                  <div class=\"card_outer_action\"><div class=\"card_action\"><div class=\"card_action_line card_action_icono\">").concat(card_a, "</div>").concat(card_action_text, "</div><div class=\"card_action_bottomdecor\"></div></div>\n                  <div class=\"card_effect ").concat(addeffclass, "\">").concat(card_r, "<div class=\"card_tt\">").concat(displayInfo.text || "", "</div></div>           \n                  <div class=\"card_prereq\">").concat(parsedPre !== "" ? parsedPre : "", "</div>\n                  <div class=\"card_number\">").concat((_b = displayInfo.num) !== null && _b !== void 0 ? _b : "", "</div>\n                  <div class=\"card_number_binary\">").concat(cn_binary, "</div>\n                  <div id=\"resource_holder_").concat(tokenNode.id.replace("card_main_", ""), "\" class=\"card_resource_holder ").concat((_c = displayInfo.holds) !== null && _c !== void 0 ? _c : "", "\" data-resource_counter=\"0\">").concat(htm_holds, "</div>\n                  ").concat(vp, "\n            ");
            }
            var div = this.createDivNode(null, "card_info_box", tokenNode.id);
            div.innerHTML = "\n          <div class='token_title'>".concat(displayInfo.name, "</div>\n          <div class='token_cost'>").concat(displayInfo.cost, "</div> \n          <div class='token_rules'>").concat(displayInfo.r, "</div>\n          <div class='token_descr'>").concat(displayInfo.text, "</div>\n          ");
            tokenNode.appendChild(div);
            //card tooltip
            //tokenNode.appendChild(ttdiv);
            tokenNode.setAttribute("data-card-type", displayInfo.t);
        }
        if (displayInfo.mainType == "award" || displayInfo.mainType == "milestone") {
            //custom tooltip on awards and milestones
            var dest = tokenNode.id.replace(displayInfo.mainType + "_", displayInfo.mainType + "_label_");
            $(dest).innerHTML = _(displayInfo.name);
            /* Disabled custom tt
                const ttdiv = this.createDivNode(null, "card_hovertt", tokenNode.id);
                ttdiv.innerHTML = `
                    <div class='token_title'>${displayInfo.name}</div>
                    <div class='card_effect'>${displayInfo.text}</div>
                `;
                tokenNode.appendChild(ttdiv);
                */
        }
    };
    GameXBody.prototype.syncTokenDisplayInfo = function (tokenNode) {
        var _a;
        if (!tokenNode.getAttribute("data-info")) {
            var displayInfo = this.getTokenDisplayInfo(tokenNode.id);
            var classes = displayInfo.imageTypes.split(/  */);
            (_a = tokenNode.classList).add.apply(_a, classes);
            tokenNode.setAttribute("data-info", "1");
            this.connect(tokenNode, "onclick", "onToken");
            if (!this.isLayoutFull()) {
                this.createHtmlForToken(tokenNode, displayInfo);
            }
            else {
                this.vlayout.createHtmlForToken(tokenNode, displayInfo);
            }
        }
    };
    GameXBody.prototype.setDomTokenState = function (tokenId, newState) {
        _super.prototype.setDomTokenState.call(this, tokenId, newState);
        var node = $(tokenId);
        if (!node)
            return;
        if (!node.id)
            return;
        // to show + signs in some cases
        if (node.id.startsWith("tracker_")) {
            if (newState > 0) {
                node.setAttribute("data-sign", "+");
            }
            else {
                node.removeAttribute("data-sign");
            }
        }
        //intercept player passed state
        if (node.id.startsWith("tracker_passed_")) {
            var plColor = node.id.replace("tracker_passed_", "");
            var plId = this.getPlayerIdByColor(plColor);
            if (newState == 1) {
                this.disablePlayerPanel(plId);
            }
            else {
                this.enablePlayerPanel(plId);
            }
        }
        //local : number of cities on mars
        if (node.id.startsWith("tracker_city_")) {
            this.local_counters["game"].cities = 0;
            for (var plid in this.gamedatas.players) {
                this.local_counters["game"].cities =
                    this.local_counters["game"].cities + parseInt($("tracker_city_" + this.gamedatas.players[plid].color).dataset.state);
            }
        }
        this.vlayout.renderSpecificToken(node);
        //handle copies of trackers
        var trackerCopy = "alt_" + node.id;
        var nodeCopy = $(trackerCopy);
        if (nodeCopy) {
            _super.prototype.setDomTokenState.call(this, trackerCopy, newState);
            //alt_tracker_w (on the map)
            if (node.id.startsWith("tracker_w")) {
                $(nodeCopy.id).dataset.calc = (9 - parseInt(newState)).toString();
            }
        }
    };
    //finer control on how to place things
    GameXBody.prototype.createDivNode = function (id, classes, location) {
        var div = _super.prototype.createDivNode.call(this, id, classes, location);
        return div;
    };
    GameXBody.prototype.updateTokenDisplayInfo = function (tokenDisplayInfo) {
        // override to generate dynamic tooltips and such
        if (this.isLayoutFull()) {
            tokenDisplayInfo.tooltip = this.generateTokenTooltip(tokenDisplayInfo);
        }
        else {
            tokenDisplayInfo.tooltip = this.generateCardTooltip_Compact(tokenDisplayInfo);
        }
        // if (this.isLocationByType(tokenDisplayInfo.key)) {
        //   tokenDisplayInfo.imageTypes += " infonode";
        // }
    };
    GameXBody.prototype.updateHandPrereqs = function () {
        if (!this.player_id)
            return;
        var nodes = dojo.query("#hand_area .card");
        for (var _i = 0, nodes_1 = nodes; _i < nodes_1.length; _i++) {
            var node = nodes_1[_i];
            // const card_id = node.id.replace('card_main_','');
            var displayInfo = this.getTokenDisplayInfo(node.id);
            if (!displayInfo)
                continue;
            if (!displayInfo.expr.pre)
                continue;
            var op = "";
            var what = "";
            var qty = 0;
            if (typeof displayInfo.expr.pre === "string") {
                op = ">=";
                what = displayInfo.expr.pre;
                qty = 1;
            }
            else {
                if (displayInfo.expr.pre.length < 3) {
                    continue;
                }
                else {
                    op = displayInfo.expr.pre[0];
                    what = displayInfo.expr.pre[1];
                    qty = displayInfo.expr.pre[2];
                }
            }
            var tracker = "";
            switch (what) {
                case "o":
                    tracker = "tracker_o";
                    break;
                case "t":
                    tracker = "tracker_t";
                    break;
                case "tagScience":
                    tracker = "tracker_tagScience_" + this.getPlayerColor(this.player_id);
                    break;
                case "tagEnergy":
                    tracker = "tracker_tagEnergy_" + this.getPlayerColor(this.player_id);
                    break;
                case "tagJovian":
                    tracker = "tracker_tagJovian_" + this.getPlayerColor(this.player_id);
                    break;
                case "forest":
                    tracker = "tracker_tagForest_" + this.getPlayerColor(this.player_id);
                    break;
                case "w":
                    tracker = "tracker_w";
                    break;
                case "ps":
                    tracker = "tracker_ps_" + this.getPlayerColor(this.player_id);
                    break;
                case "all_city":
                    tracker = "cities";
                    break;
            }
            //special
            if (node.id == "card_main_135") {
                tracker = "card_main_135";
            }
            if (tracker == "") {
                continue;
            }
            var valid = false;
            var actual = 0;
            // const actual = this.getTokenInfoState(tracker);
            if (this.local_counters["game"][tracker] != undefined) {
                actual = this.local_counters["game"][tracker];
            }
            else {
                if (!$(tracker)) {
                    continue;
                }
                if (!$(tracker).dataset.state) {
                    continue;
                }
                actual = parseInt($(tracker).dataset.state);
            }
            if (op == "<=") {
                if (actual <= qty)
                    valid = true;
            }
            else if (op == "<") {
                if (actual < qty)
                    valid = true;
            }
            else if (op == ">") {
                if (actual > qty)
                    valid = true;
            }
            else if (op == ">=") {
                if (actual >= qty)
                    valid = true;
            }
            //Special cases
            if (node.id == "card_main_135") {
                if (parseInt($("tracker_tagAnimal_" + this.getPlayerColor(this.player_id)).dataset.state) > 0 &&
                    parseInt($("tracker_tagMicrobe_" + this.getPlayerColor(this.player_id)).dataset.state) > 0 &&
                    parseInt($("tracker_tagPlant_" + this.getPlayerColor(this.player_id)).dataset.state) > 0) {
                    valid = true;
                }
            }
            if (!valid) {
                node.dataset.invalid_prereq = 1;
            }
            else {
                node.dataset.invalid_prereq = 0;
            }
            //update TT too
            this.updateTooltip(node.id);
        }
    };
    GameXBody.prototype.updateVisualsFromOp = function (opInfo, opId) {
        var _a, _b, _c;
        var opargs = opInfo.args;
        var paramargs = (_a = opargs.target) !== null && _a !== void 0 ? _a : [];
        var ttype = (_b = opargs.ttype) !== null && _b !== void 0 ? _b : "none";
        var type = (_c = opInfo.type) !== null && _c !== void 0 ? _c : "none";
        var from = opInfo.mcount;
        var count = opInfo.count;
        if (type == "card") {
            var card_info = opInfo.args.info;
            for (var card_id in card_info) {
                //handle card discounts
                var displayInfo = this.getTokenDisplayInfo(card_id);
                var original_cost = parseInt(displayInfo.cost);
                var payop = card_info[card_id].payop;
                var discount_cost = parseInt(payop.replace("nm", "").replace("nop", 0)) || 0;
                if (discount_cost != original_cost && $("cost_" + card_id)) {
                    $("cost_" + card_id).innerHTML = discount_cost.toString();
                    $("cost_" + card_id).classList.add("discounted");
                }
            }
        }
    };
    GameXBody.prototype.updatePlayerLocalCounters = function (plColor) {
        for (var _i = 0, _a = Object.keys(this.local_counters[plColor]); _i < _a.length; _i++) {
            var key = _a[_i];
            $("local_counter_" + plColor + "_" + key).innerHTML = this.local_counters[plColor][key];
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
        else if (tokenInfo.key == "starting_player") {
            result.location = tokenInfo.location.replace("tableau_", "fpholder_");
        }
        else if (tokenInfo.key.startsWith("resource_")) {
            if (this.isLayoutFull()) {
            }
            else {
                if (tokenInfo.location.startsWith("card_main_")) {
                    //resource added to card
                    result.location = tokenInfo.location.replace("card_main_", "resource_holder_");
                    var dest_holder = tokenInfo.location.replace("card_main_", "resource_holder_");
                    var dest_counter = tokenInfo.location.replace("card_main_", "resource_holder_counter_");
                    $(dest_holder).dataset.resource_counter = (parseInt($(dest_holder).dataset.resource_counter) + 1).toString();
                    $(dest_counter).dataset.resource_counter = (parseInt($(dest_counter).dataset.resource_counter) + 1).toString();
                }
                else if (tokenInfo.location.startsWith("tableau_")) {
                    //resource moved from card
                    //which card ?
                    var dest_holder = $(tokenInfo.key) ? $(tokenInfo.key).parentElement.id : "";
                    if (dest_holder.includes("holder_")) {
                        var dest_counter = dest_holder.replace("holder_", "holder_counter_");
                        if (dojo.byId(dest_holder)) {
                            $(dest_holder).dataset.resource_counter = (parseInt($(dest_holder).dataset.resource_counter) - 1).toString();
                            $(dest_counter).dataset.resource_counter = (parseInt($(dest_counter).dataset.resource_counter) - 1).toString();
                        }
                    }
                }
            }
        }
        else if (tokenInfo.key.startsWith("marker_")) {
            if (tokenInfo.location.startsWith("award")) {
                this.strikeNextAwardMilestoneCost("award");
            }
            else if (tokenInfo.location.startsWith("milestone")) {
                this.strikeNextAwardMilestoneCost("milestone");
            }
        }
        else if (tokenInfo.key.startsWith("card_corp") && tokenInfo.location.startsWith("tableau")) {
            result.location = tokenInfo.location + "_corp_effect";
            //also set property to corp logo div
            $(tokenInfo.location + "_corp_logo").dataset.corp = tokenInfo.key;
        }
        else if (tokenInfo.key.startsWith("card_main") && tokenInfo.location.startsWith("tableau")) {
            var t = this.getRulesFor(tokenInfo.key, "t");
            result.location = tokenInfo.location + "_cards_" + t;
            if (this.getRulesFor(tokenInfo.key, "a")) {
                result.location = tokenInfo.location + "_cards_2a";
            }
            var plcolor = tokenInfo.location.replace("tableau_", "");
            this.local_counters[plcolor]["cards_" + t]++;
            this.updatePlayerLocalCounters(plcolor);
            if (!this.isLayoutFull()) {
                if (t == 1 || t == 3) {
                    if (this.getRulesFor(tokenInfo.key, "vp", "0") != "0") {
                        result.location = tokenInfo.location + "_cards_" + t + "vp";
                    }
                }
                //auto switch tabs here
                // this.darhflog("isdoingsetup", this.isDoingSetup);
                if (!this.isDoingSetup) {
                    if ($(tokenInfo.location).dataset["visibility_" + t] == "0") {
                        var original = 0;
                        for (var i = 0; i <= 3; i++) {
                            if ($(tokenInfo.location).dataset["visibility_" + i] == "1")
                                original = i;
                        }
                        if (original != 0) {
                            for (var i = 1; i <= 3; i++) {
                                var btn = "player_viewcards_" + i + "_" + tokenInfo.location.replace("tableau_", "");
                                if (i == t) {
                                    $(tokenInfo.location).dataset["visibility_" + i] = "1";
                                    $(btn).dataset.selected = "1";
                                }
                                else {
                                    $(btn).dataset.selected = "0";
                                    $(tokenInfo.location).dataset["visibility_" + i] = "0";
                                }
                            }
                            this.customAnimation.setOriginalFilter(tokenInfo.location, original, t);
                        }
                    }
                }
            }
        }
        if (!result.location)
            // if failed to find revert to server one
            result.location = tokenInfo.location;
        return result;
    };
    GameXBody.prototype.strikeNextAwardMilestoneCost = function (kind) {
        for (var idx = 1; idx <= 3; idx++) {
            if ($(kind + "_cost_" + idx).dataset.striked != "1") {
                $(kind + "_cost_" + idx).dataset.striked = "1";
                break;
            }
        }
    };
    GameXBody.prototype.isLayoutVariant = function (num) {
        return this.prefs[100].value == num;
    };
    GameXBody.prototype.isLayoutFull = function () {
        return this.isLayoutVariant(2);
    };
    GameXBody.prototype.darhflog = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (!this.isLayoutFull()) {
            console.log.apply(console, args);
        }
    };
    GameXBody.prototype.sendActionResolve = function (op, args) {
        if (!args)
            args = {};
        this.ajaxuseraction("resolve", {
            ops: [__assign({ op: op }, args)]
        });
    };
    GameXBody.prototype.sendActionDecline = function (op) {
        this.ajaxuseraction("decline", {
            ops: [{ op: op }]
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
    GameXBody.prototype.getDivForTracker = function (id, value) {
        if (value === void 0) { value = ""; }
        var res = getPart(id, 1);
        var icon = "<div class=\"token_img tracker_".concat(res, "\">").concat(value, "</div>");
        return icon;
    };
    GameXBody.prototype.getButtonColorForOperation = function (op) {
        if (op.type == "pass")
            return "red";
        if (op.type == "skipsec")
            return "orange";
        return "blue";
    };
    GameXBody.prototype.getTokenPresentaton = function (type, tokenKey) {
        var isstr = typeof tokenKey == "string";
        if (isstr && tokenKey.startsWith("tracker"))
            return this.getDivForTracker(tokenKey);
        if (type == "token_div_count" && !isstr) {
            var id = tokenKey.args["token_name"];
            var mod = tokenKey.args["mod"];
            if (id.startsWith("tracker_m_")) {
                // just m
                return this.getDivForTracker(id, mod);
            }
            return undefined; // process by parent
        }
        if (isstr) {
            return this.getTokenName(tokenKey); // just a name for now
        }
        return undefined; // process by parent
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
            target: target
        });
        return;
    };
    GameXBody.prototype.sendActionResolveWithTargetAndPayment = function (opId, target, payment) {
        this.sendActionResolve(opId, { target: target, payment: payment });
    };
    GameXBody.prototype.activateSlots = function (opInfo, opId, single) {
        var _this = this;
        var _a, _b, _c, _d;
        var opargs = opInfo.args;
        var paramargs = (_a = opargs.target) !== null && _a !== void 0 ? _a : [];
        var ttype = (_b = opargs.ttype) !== null && _b !== void 0 ? _b : "none";
        var from = opInfo.mcount;
        var count = opInfo.count;
        if (single) {
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
                                count: from
                            });
                        });
                    if (from == 0 && count > 1) {
                        this.addActionButton("button_" + opId + "_1", "1", function () {
                            _this.sendActionResolve(opId, {
                                count: 1
                            });
                        });
                    }
                    if (count >= 1)
                        this.addActionButton("button_" + opId + "_max", count + " (max)", function () {
                            // XXX
                            _this.sendActionResolve(opId, {
                                count: count
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
                    var divId = _this.getActiveSlotRedirect(tid);
                    _this.setActiveSlot(divId);
                    _this.setReverseIdMap(divId, opId, tid);
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
                    }, undefined, false, "gray");
                    if (name_2)
                        $(buttonId).style.color = "#" + tid;
                }
                _this.setReverseIdMap(divId, opId, tid);
            });
        }
        else if (ttype == "enum") {
            var args = (_c = this.gamedatas.gamestate.args) !== null && _c !== void 0 ? _c : this.gamedatas.gamestate.private_state.args;
            var operations_1 = (_d = args.operations) !== null && _d !== void 0 ? _d : args.player_operations[this.player_id].operations;
            paramargs.forEach(function (tid, i) {
                var _a, _b, _c;
                if (single) {
                    var detailsInfo = (_b = (_a = operations_1[opId].args) === null || _a === void 0 ? void 0 : _a.info) === null || _b === void 0 ? void 0 : _b[tid];
                    var sign = detailsInfo.sign; // 0 complete payment, -1 incomplete, +1 overpay
                    //console.log("enum details "+tid,detailsInfo);
                    var buttonColor = undefined;
                    if (sign < 0)
                        buttonColor = "gray";
                    if (sign > 0)
                        buttonColor = "red";
                    var divId = "button_" + i;
                    var title = '<div class="custom_paiement_inner">' + _this.resourcesToHtml(detailsInfo.resources) + "</div>";
                    if (tid == "payment") {
                        //show only if options
                        var opts = (_c = operations_1[opId].args.info) === null || _c === void 0 ? void 0 : _c[tid];
                        if (Object.entries(opts.resources).reduce(function (sum, _a) {
                            var key = _a[0], val = _a[1];
                            return sum + (key !== "m" && typeof val === "number" && Number.isInteger(val) ? val : 0);
                        }, 0) > 0) {
                            _this.createCustomPayment(opId, opts);
                        }
                    }
                    else {
                        //  title = this.parseActionsToHTML(tid);
                        _this.addActionButton(divId, title, function () {
                            if (tid == "payment") {
                                // stub
                                /*
                                const first = paramargs[0]; // send same data as 1st option as stub
                                this.sendActionResolveWithTargetAndPayment(opId, tid, operations[opId].args.info?.[first]?.resources);
              
                                 */
                            }
                            else
                                _this.onSelectTarget(opId, tid);
                        }, undefined, false, buttonColor);
                    }
                }
            });
        }
        //custom
        /*
        if (opInfo.type=="convp") {
          //convert plants
          let btnid='playerboard_group_plants';
          this.connect($(btnid),'onclick',()=>{
            this.sendActionResolve(opId);
          })
    
        }*/
    };
    /** When server wants to activate some element, ui may adjust it */
    GameXBody.prototype.getActiveSlotRedirect = function (_node) {
        var node = $(_node);
        if (!node) {
            this.showError("Not found " + _node);
            return _node;
        }
        var id = node.id;
        if (!id)
            return _node;
        var target = id;
        if (id.startsWith("tracker_p_")) {
            target = id.replace("tracker_p_", "playergroup_plants_");
        }
        if (id.startsWith("tracker_h_")) {
            target = id.replace("tracker_h_", "playergroup_heat_");
        }
        return target;
    };
    //Adds the payment picker according to available alternative payment options
    GameXBody.prototype.createCustomPayment = function (opId, info) {
        var _this = this;
        this.custom_pay = {
            needed: info.count,
            selected: {},
            available: [],
            rate: []
        };
        var items_htm = "";
        for (var res in info.resources) {
            this.custom_pay.selected[res] = 0;
            this.custom_pay.available[res] = info.resources[res];
            this.custom_pay.rate[res] = info.rate[res];
            //megacredits are spent automatically
            if (res == "m") {
                this.custom_pay.selected[res] = this.custom_pay.available[res];
                continue;
            }
            if (this.custom_pay.available[res] <= 0)
                continue;
            //add paiments buttons
            items_htm += "\n        <div class=\"payment_group\">\n           <div class=\"token_img tracker_".concat(res, "\"></div>\n           <div class=\"item_worth\">\n               <div class=\"token_img tracker_m payment_item\">").concat(this.custom_pay.rate[res], "</div>\n          </div>\n          <div id=\"payment_item_minus_").concat(res, "\" class=\"btn_payment_item btn_item_minus\" data-resource=\"").concat(res, "\" data-direction=\"minus\">-</div>\n          <div id=\"payment_item_").concat(res, "\" class=\"payment_item_value item_value_").concat(res, "\">0</div>\n          <div id=\"payment_item_plus_").concat(res, "\" class=\"btn_payment_item btn_item_plus\" data-resource=\"").concat(res, "\" data-direction=\"plus\">+</div>                \n        </div>\n      ");
        }
        /*
          <div class="token_img tracker_m payment_item">
              <div id="custompay_amount_m">${this.custom_pay.needed}</div>
          </div>
         */
        //add confirmation button
        var txt = _("Custom:");
        var button_htm = this.resourcesToHtml(this.custom_pay.selected, true);
        var button_whole = "Pay %s".replace("%s", button_htm);
        var paiement_htm = "\n      <div class=\"custom_paiement_inner\">\n        ".concat(txt, "\n        ").concat(items_htm, "\n        <div id=\"btn_custompay_send\" class=\"action-button bgabutton bgabutton_blue\">").concat(button_whole, "</div>\n      </div>\n    ");
        var node = this.createDivNode("custom_paiement", "", "generalactions");
        node.innerHTML = paiement_htm;
        //adds actions to button payments
        this.connectClass("btn_payment_item", "onclick", function (event) {
            var id = event.currentTarget.id;
            var direction = $(id).dataset.direction;
            var res = $(id).dataset.resource;
            dojo.stopEvent(event);
            if (direction == "minus") {
                if (_this.custom_pay.selected[res] > 0) {
                    _this.custom_pay.selected[res]--;
                }
            }
            if (direction == "plus") {
                if (_this.custom_pay.selected[res] < _this.custom_pay.available[res]) {
                    _this.custom_pay.selected[res]++;
                }
            }
            $("payment_item_" + res).innerHTML = _this.custom_pay.selected[res];
            var total_res = 0;
            // let values_htm='';
            for (var res_1 in _this.custom_pay.rate) {
                if (res_1 != "m") {
                    total_res = total_res + _this.custom_pay.rate[res_1] * _this.custom_pay.selected[res_1];
                    //  values_htm+=`<div class="token_img tracker_${res}">${this.custom_pay.selected[res]}</div>`;
                }
            }
            var mc = _this.custom_pay.needed - total_res;
            if (mc < 0) {
                mc = 0;
                $("btn_custompay_send").classList.add("overpay");
            }
            else {
                $("btn_custompay_send").classList.remove("overpay");
            }
            _this.custom_pay.selected["m"] = mc;
            //   values_htm+=` <div class="token_img tracker_m payment_item">${mc}</div>`;
            var values_htm = _this.resourcesToHtml(_this.custom_pay.selected, true);
            $("btn_custompay_send").innerHTML = "Pay %s".replace("%s", values_htm);
        });
        //adds action to final payment button
        this.connect($("btn_custompay_send"), "onclick", function () {
            var pays = {};
            //backend doesn't accept 0 as paiment
            for (var _i = 0, _a = Object.keys(_this.custom_pay.selected); _i < _a.length; _i++) {
                var res = _a[_i];
                if (_this.custom_pay.selected[res] > 0)
                    pays[res] = parseInt(_this.custom_pay.selected[res]);
            }
            _this.sendActionResolveWithTargetAndPayment(opId, "payment", pays);
        });
    };
    GameXBody.prototype.resourcesToHtml = function (resources, show_zeroes) {
        if (show_zeroes === void 0) { show_zeroes = false; }
        var htm = "";
        var allResources = ["m", "s", "u", "h"];
        allResources.forEach(function (item) {
            if (resources[item] != undefined && (resources[item] > 0 || show_zeroes === true)) {
                htm += "<div class=\"token_img tracker_".concat(item, " payment_item\">").concat(resources[item], "</div>");
            }
        });
        return htm;
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
            target: target !== null && target !== void 0 ? target : divId
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
        if (xop == "+" && !single)
            this.setDescriptionOnMyTurn("${you} must choose order of operations");
        var i = 0;
        var _loop_2 = function (opIdS) {
            var opId = parseInt(opIdS);
            var opInfo = operations[opId];
            var opargs = opInfo.args;
            var name_3 = "";
            var contains_gfx = false;
            //if (opInfo.typeexpr && opInfo.data && opInfo.data!="" && !this.isLayoutFull()) {
            //  name= '<div class="innerbutton">'+CustomRenders.parseExprToHtml(opInfo.typeexpr)+'</div>';
            //  contains_gfx=true;
            // } else {
            name_3 = this_2.getButtonNameForOperation(opInfo);
            //  }
            var color = this_2.getButtonColorForOperation(opInfo);
            var paramargs = (_a = opargs.target) !== null && _a !== void 0 ? _a : [];
            var singleOrFirst = single || (ordered && i == 0);
            this_2.updateVisualsFromOp(opInfo, opId);
            this_2.activateSlots(opInfo, opId, singleOrFirst);
            if (!single && !ordered) {
                // xxx add something for remaining ops in ordered case?
                if (paramargs.length > 0) {
                    this_2.addActionButton("button_" + opId, name_3, function () {
                        _this.setClientStateUpdOn("client_collect", function (args) {
                            // on update action buttons
                            _this.clearReverseIdMap();
                            _this.activateSlots(opInfo, opId, true);
                        }, function (id) {
                            // onToken
                            _this.onSelectTarget(opId, id);
                        });
                    }, null, null, color);
                }
                else {
                    this_2.addActionButton("button_" + opId, name_3, function () {
                        _this.sendActionResolve(opId);
                    }, null, null, color);
                }
                if (color != "blue" && color != "red") {
                    $("button_" + opId).classList.remove("bgabutton_blue");
                    $("button_" + opId).classList.add("bgabutton_" + color);
                }
                if (contains_gfx) {
                    $("button_" + opId).classList.add("gfx");
                    $("button_" + opId).setAttribute("title", this_2.getButtonNameForOperation(opInfo));
                }
                if (opargs.void) {
                    dojo.addClass("button_" + opId, "disabled");
                }
            }
            // add done (skip) when optional
            if (singleOrFirst) {
                if (opInfo.mcount <= 0) {
                    this_2.addActionButton("button_skip", _("Done"), function () {
                        _this.sendActionSkip();
                    });
                    $("button_skip").classList.remove("bgabutton_blue");
                    $("button_skip").classList.add("bgabutton_orange");
                }
            }
            i = i + 1;
        };
        var this_2 = this;
        for (var opIdS in operations) {
            _loop_2(opIdS);
        }
        //refresh prereqs rendering on hand cards
        //TODO : check if this place is pertinent
        this.updateHandPrereqs();
    };
    GameXBody.prototype.addUndoButton = function () {
        var _this = this;
        if (!$("button_undo")) {
            this.addActionButton("button_undo", _("Undo"), function () { return _this.ajaxcallwrapper_unchecked("undo"); }, undefined, undefined, "red");
        }
    };
    GameXBody.prototype.onUpdateActionButtons_multiplayerChoice = function (args) {
        var _a;
        var operations = (_a = args.player_operations[this.player_id]) !== null && _a !== void 0 ? _a : undefined;
        if (!operations) {
            this.addUndoButton();
            return;
        }
        this.onUpdateActionButtons_playerTurnChoice(operations);
    };
    GameXBody.prototype.onEnteringState_multiplayerDispatch = function (args) {
        if (!this.isCurrentPlayerActive()) {
            this.addUndoButton();
        }
    };
    GameXBody.prototype.onUpdateActionButtons_multiplayerDispatch = function (args) {
        this.addUndoButton();
    };
    GameXBody.prototype.onUpdateActionButtons_after = function (stateName, args) {
        if (this.isCurrentPlayerActive()) {
            // add undo on every state
            if (this.on_client_state)
                this.addCancelButton();
            else
                this.addUndoButton();
        }
        var parent = document.querySelector(".debug_section"); // studio only
        if (parent)
            this.addActionButton("button_rcss", "Reload CSS", function () { return reloadCss(); });
    };
    GameXBody.prototype.onSelectTarget = function (opId, target) {
        // can add prompt
        return this.sendActionResolveWithTarget(opId, target);
    };
    // on click hooks
    GameXBody.prototype.onToken_playerTurnChoice = function (tid) {
        var _a;
        //debugger;
        var info = this.reverseIdLookup.get(tid);
        if (info && info !== "0") {
            var opId = info.op;
            if (info.param_name == "target")
                this.onSelectTarget(opId, (_a = info.target) !== null && _a !== void 0 ? _a : tid);
            else
                this.showError("Not implemented");
        }
        else if (tid.endsWith("discard_main") || tid.endsWith("deck_main")) {
            this.showHiddenContent("discard_main", _("Discard pile contents"));
        }
        else if (tid.startsWith("card_")) {
            if ($(tid).parentElement.childElementCount >= 2)
                this.showHiddenContent($(tid).parentElement.id, _("Pile contents"));
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
        var tblitem = "visibility" + btncolor;
        $("tableau_" + plcolor).dataset[tblitem] = $("tableau_" + plcolor).dataset[tblitem] == "1" ? "0" : "1";
        $(id).dataset.enabled = $(id).dataset.enabled == "1" ? "0" : "1";
        return true;
    };
    GameXBody.prototype.onShowTableauCardsOfColor = function (event) {
        var id = event.currentTarget.id;
        // Stop this event propagation
        dojo.stopEvent(event); // XXX
        var node = $(id);
        var plcolor = node.dataset.player;
        var btncolor = node.dataset.cardtype;
        var tblitem = "visibility_" + btncolor;
        if (this.isLayoutFull()) {
            var selected = node.dataset.selected == "1";
            var value = !selected ? "1" : "0";
            $("tableau_" + plcolor).dataset[tblitem] = value;
            node.dataset.selected = value;
        }
        else {
            var value = "1";
            for (var i = 0; i <= 3; i++) {
                $("tableau_" + plcolor).dataset["visibility_" + i] = "0";
                $("player_viewcards_" + i + "_" + plcolor).dataset.selected = "0";
            }
            $("tableau_" + plcolor).dataset[tblitem] = value;
            node.dataset.selected = value;
        }
        return true;
    };
    GameXBody.prototype.handleStackedTooltips = function (attachNode) {
        if (attachNode.childElementCount > 0) {
            if (attachNode.id.startsWith("hex")) {
                this.removeTooltip(attachNode.id);
                return;
            }
        }
        var parentId = attachNode.parentElement.id;
        if (parentId) {
            if (parentId.startsWith("hex")) {
                // remove tooltip from parent, it will likely just collide
                this.removeTooltip(parentId);
            }
        }
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
var LocalSettings = /** @class */ (function () {
    function LocalSettings(gameName, props) {
        this.gameName = gameName;
        this.props = props;
    }
    //loads setttings, apply data values to main body
    LocalSettings.prototype.setup = function () {
        //this.load();
        for (var _i = 0, _a = this.props; _i < _a.length; _i++) {
            var prop = _a[_i];
            var stored = this.readProp(prop.key);
            this.applyChanges(prop, stored, false);
        }
    };
    LocalSettings.prototype.getLocalSettingById = function (key) {
        for (var _i = 0, _a = this.props; _i < _a.length; _i++) {
            var prop = _a[_i];
            if (key == prop.key)
                return prop;
        }
        return null;
    };
    LocalSettings.prototype.renderButton = function (parentId) {
        if (!document.getElementById(parentId))
            return false;
        if (document.getElementById(this.gameName + "_btn_localsettings"))
            return false;
        var htm = '<div id="' + this.gameName + '_btn_localsettings"></div>';
        document.getElementById(parentId).insertAdjacentHTML("beforeend", htm);
        return true;
    };
    LocalSettings.prototype.renderContents = function (parentId) {
        if (!document.getElementById(parentId))
            return false;
        $(parentId)
            .querySelectorAll(".localsettings_window")
            .forEach(function (node) {
            dojo.destroy(node); // on undo this remains but another one generated
        });
        var htm = '<div id="' +
            this.gameName +
            '_localsettings_window" class="localsettings_window">' +
            '<div class="localsettings_header">' +
            _("Local Settings") +
            "</div>" +
            "%contents%" +
            "</div>";
        var htmcontents = "";
        for (var _i = 0, _a = this.props; _i < _a.length; _i++) {
            var prop = _a[_i];
            if (prop.ui !== false)
                htmcontents = htmcontents + '<div class="localsettings_group">' + this.renderProp(prop) + "</div>";
        }
        htm = htm.replace("%contents%", htmcontents);
        document.getElementById(parentId).insertAdjacentHTML("beforeend", htm);
        //add interactivity
        for (var _b = 0, _c = this.props; _b < _c.length; _b++) {
            var prop = _c[_b];
            if (prop.ui !== false)
                this.actionProp(prop);
        }
    };
    LocalSettings.prototype.renderProp = function (prop) {
        if (prop.range)
            return this.renderPropRange(prop);
        else
            return this.renderPropChoice(prop);
    };
    LocalSettings.prototype.renderPropRange = function (prop) {
        if (!prop.range)
            return;
        var range = prop.range;
        var inputid = "localsettings_prop_".concat(prop.key);
        var valuecontrol = "";
        if (prop.ui == "slider") {
            valuecontrol = "<input type=\"range\" id=\"".concat(inputid, "\" name=\"").concat(inputid, "\" min=\"").concat(range.min, "\" max=\"").concat(range.max, "\" step=\"").concat(range.inc, "\" value=\"").concat(prop.value, "\">");
        }
        else {
            valuecontrol = "<div id=\"".concat(inputid, "\" class=\"localsettings_prop_rangevalue\">").concat(prop.value, "</div>");
        }
        return "\n      <label for=\"".concat(inputid, "\" class=\"localsettings_prop_label prop_range\">").concat(prop.label, "</label>\n      <div class=\"localsettings_prop_range\">\n          <div id=\"localsettings_prop_button_minus_").concat(prop.key, "\" class=\"localsettings_prop_button\"><i class=\"fa fa-minus\" aria-hidden=\"true\"></i></div>\n          ").concat(valuecontrol, "\n          <div id=\"localsettings_prop_button_plus_").concat(prop.key, "\" class=\"localsettings_prop_button\"><i class=\"fa fa-plus\" aria-hidden=\"true\"></i></div>\n      </div>");
    };
    LocalSettings.prototype.renderPropChoice = function (prop) {
        if (prop.ui == "checkbox") {
            var inputid = "localsettings_prop_".concat(prop.key);
            var checked = prop.value === "false" || !prop.value ? "" : "checked";
            return "\n      <input type=\"checkbox\" id=\"".concat(inputid, "\" name=\"").concat(inputid, "\" ").concat(checked, ">\n      <label for=\"").concat(inputid, "\" class=\"localsettings_prop_label\">").concat(prop.label, "</label>\n      ");
        }
        var htm = '<div class="localsettings_prop_control prop_choice">' + prop.label + "</div>";
        htm = htm + '<select id="localsettings_prop_' + prop.key + '" class="">';
        for (var idx in prop.choice) {
            var selected = idx == prop.value ? 'selected="selected"' : "";
            htm = htm + '<option value="' + idx + '" ' + selected + ">" + prop.choice[idx] + "</option>";
        }
        htm = htm + " </select>";
        return htm;
    };
    LocalSettings.prototype.actionProp = function (prop) {
        if (prop.range)
            this.actionPropRange(prop);
        else
            this.actionPropChoice(prop);
    };
    LocalSettings.prototype.actionPropRange = function (prop) {
        var _this = this;
        if (!prop.range)
            return;
        if (prop.ui == "slider") {
            $("localsettings_prop_".concat(prop.key)).addEventListener("change", function (event) {
                _this.doAction(prop, "change", event.target.value);
            });
        }
        $("localsettings_prop_button_minus_" + prop.key).addEventListener("click", function () {
            _this.doAction(prop, "minus");
        });
        $("localsettings_prop_button_plus_" + prop.key).addEventListener("click", function () {
            _this.doAction(prop, "plus");
        });
    };
    LocalSettings.prototype.actionPropChoice = function (prop) {
        var _this = this;
        $("localsettings_prop_".concat(prop.key)).addEventListener("click", function (event) {
            var target = event.target;
            _this.applyChanges(prop, prop.ui == "checkbox" ? target.checked : target.value);
        });
        return;
    };
    LocalSettings.prototype.doAction = function (prop, action, value) {
        switch (action) {
            case "change":
                this.applyChanges(prop, value);
                break;
            case "plus":
                this.applyChanges(prop, parseFloat(prop.value) + prop.range.inc);
                break;
            case "minus":
                this.applyChanges(prop, parseFloat(prop.value) - prop.range.inc);
                break;
        }
    };
    LocalSettings.prototype.setSanitizedValue = function (prop, newvalue) {
        var _a;
        if (prop.range) {
            var value = parseFloat(newvalue);
            if (isNaN(value) || !value)
                value = prop.default;
            if (value > prop.range.max)
                value = prop.range.max;
            if (value < prop.range.min)
                value = prop.range.min;
            prop.value = String(value);
        }
        else if (prop.ui == "checkbox") {
            if (newvalue) {
                var key = Object.keys(prop.choice)[0];
                prop.value = key !== null && key !== void 0 ? key : String(newvalue);
            }
            else if (newvalue === undefined) {
                prop.value = String(prop.default);
            }
            else {
                var key = (_a = Object.keys(prop.choice)[1]) !== null && _a !== void 0 ? _a : "";
                prop.value = key;
            }
        }
        else if (prop.choice) {
            if (newvalue === undefined || !prop.choice[newvalue]) {
                prop.value = String(prop.default);
            }
            else {
                prop.value = String(newvalue);
            }
        }
        else {
            if (!newvalue) {
                prop.value = String(prop.default);
            }
            else {
                prop.value = String(newvalue);
            }
        }
        return prop.value;
    };
    LocalSettings.prototype.applyChanges = function (prop, newvalue, write) {
        if (write === void 0) { write = true; }
        // sanitize value so bad value is never stored
        var value = this.setSanitizedValue(prop, newvalue);
        if (prop.range) {
            var node = $("localsettings_prop_".concat(prop.key));
            if (node) {
                node.innerHTML = value;
                if (node.value != value)
                    node.value = value;
            }
        }
        $("ebd-body").dataset["localsetting_" + prop.key] = value;
        $("ebd-body").style.setProperty("--localsetting_" + prop.key, value);
        if (write)
            this.writeProp(prop.key, value);
    };
    LocalSettings.prototype.load = function () {
        if (!this.readProp("init"))
            return false;
        return true;
    };
    LocalSettings.prototype.readProp = function (key) {
        return localStorage.getItem(this.gameName + "." + key);
    };
    LocalSettings.prototype.writeProp = function (key, val) {
        try {
            localStorage.setItem(this.gameName + "." + key, val);
            return true;
        }
        catch (e) {
            console.error(e);
            return false;
        }
    };
    return LocalSettings;
}());
/**
 * This represents ui zone that containers resource token usually randomly scattered
 * This normally can be represented by resouce count alone but doing the visual effect for shits and giggles
 */
var ScatteredResourceZone = /** @class */ (function () {
    function ScatteredResourceZone(game, zoneId, resclass) {
        if (resclass === void 0) { resclass = "res"; }
        this.game = game;
        this.resclass = resclass;
        this.zoneId = zoneId;
    }
    ScatteredResourceZone.prototype.setValue = function (value, redraw) {
        if (redraw === void 0) { redraw = true; }
        this.value = value;
        if (redraw)
            this.redraw();
    };
    ScatteredResourceZone.prototype.redraw = function () {
        if (!$(this.zoneId))
            return;
        var nom = 1;
        var divs = $(this.zoneId).querySelectorAll(".".concat(this.resclass, "_n").concat(nom));
        var curvalue = divs.length;
        while (curvalue < this.value) {
            this.addResource(nom);
            curvalue++;
        }
    };
    ScatteredResourceZone.prototype.addResource = function (nom) {
        if (nom === void 0) { nom = 1; }
        var all = document.querySelectorAll(".".concat(this.resclass, "_n").concat(nom));
        var num = all.length + 1;
        var id = "".concat(this.resclass, "_n").concat(nom, "_").concat(num);
        var parent = $(this.zoneId);
        var size = 20; // XXX
        var w = parent.offsetWidth;
        if (!w)
            w = 100; // XXX why its not working?
        var h = parent.offsetHeight;
        if (!h)
            h = 100;
        var x = Math.floor((Math.random() * (w - size))) + size / 2;
        var y = Math.floor((Math.random() * (h - size))) + size / 2;
        var pi = {
            location: this.zoneId,
            key: id,
            state: nom,
            x: x,
            y: y,
            position: 'absolute',
            from: 'main_board'
        };
        //console.log("adding res "+id+" on "+this.zoneId);
        this.game.placeTokenLocal(id, this.zoneId, nom, { placeInfo: pi });
        $(id).classList.add(this.resclass);
        $(id).classList.add("".concat(this.resclass, "_n").concat(nom));
    };
    return ScatteredResourceZone;
}());
var VLayout = /** @class */ (function () {
    function VLayout(game) {
        this.game = game;
    }
    VLayout.prototype.setupPlayer = function (playerInfo) {
        if (!this.game.isLayoutFull())
            return;
        var color = playerInfo.color;
        var name = playerInfo.name;
        var div = $("main_area");
        var board = $("player_area_".concat(color));
        div.appendChild(board);
        $("tableau_".concat(color)).setAttribute("data-visibility_3", "1");
        $("tableau_".concat(color)).setAttribute("data-visibility_1", "1");
        dojo.destroy("tableau_".concat(color, "_cards_3vp"));
        dojo.destroy("tableau_".concat(color, "_cards_1vp"));
        dojo.place("tableau_".concat(color, "_corp"), "pboard_".concat(color), "after");
        dojo.place("player_controls_".concat(color), "tableau_".concat(color, "_corp"));
        dojo.removeClass("tableau_".concat(color, "_corp_effect"), "corp_effect");
        //dojo.place(`player_area_name_${color}`, `tableau_${color}_corp`, "first");
        var headerNode = $("player_board_header_".concat(color));
        dojo.place("tableau_".concat(color, "_corp_logo"), headerNode, "first");
        dojo.place("player_area_name_".concat(color), headerNode, "first");
        dojo.removeClass(headerNode, 'playerboard_header');
        dojo.addClass(headerNode, 'playerboard_header_v');
        $("player_area_name_".concat(color)).setAttribute('data-player-name', name);
        $("player_area_name_".concat(color)).innerHTML = '';
        var places = ["tracker_city", "tracker_forest", "tracker_land"];
        for (var _i = 0, places_1 = places; _i < places_1.length; _i++) {
            var key = places_1[_i];
            //alt_tracker_city_ff0000
            dojo.place($("alt_".concat(key, "_").concat(color)), "miniboardentry_".concat(color));
        }
        // dojo.place(`player_viewcards_2_${color}`, `miniboardentry_${color}`);
        // dojo.place(`player_viewcards_1_${color}`, `miniboardentry_${color}`);
        // dojo.place(`player_viewcards_3_${color}`, `miniboardentry_${color}`);
        dojo.place("alt_tracker_gen", "map_left");
        dojo.destroy("outer_generation");
        dojo.place("deck_main", "decks_area");
        dojo.place("discard_main", "decks_area");
        dojo.place("oceans_pile", "map_middle");
        dojo.destroy("deck_holder");
        dojo.destroy("discard_holder");
        // dojo.place(`player_controls_${color}`,`miniboardentry_${color}`);
        dojo.place("fpholder_".concat(color), "miniboardentry_".concat(color));
        dojo.place("counter_draw_".concat(color), "limbo");
        for (var i = 1; i <= 3; i++) {
            $("tableau_" + color).dataset["visibility_" + i] = "1";
            $("player_viewcards_" + i + "_" + color).dataset.selected = "1";
        }
        var parent = document.querySelector(".debug_section"); // studio only
        if (!parent)
            $("pboard_".concat(color)).style.display = 'none'; // disable for now
    };
    VLayout.prototype.renderSpecificToken = function (tokenNode) {
        if (!this.game.isLayoutFull())
            return;
        if (tokenNode.id.startsWith("tracker_tr")) {
            // debugger;
            var marker = "marker_" + tokenNode.id;
            var markerNode = $(marker);
            var color = getPart(tokenNode.id, 2);
            if (!markerNode) {
                markerNode = this.game.createDivNode(marker, "marker marker_tr marker_" + color, "main_board");
                this.convertInto3DCube(markerNode, color);
            }
            var state = parseInt(tokenNode.getAttribute("data-state"));
            //this.game.setDomTokenState(markerNode, state);
            var bp = 0;
            var lp = 0;
            state = state % 100;
            var off = state % 25;
            var mul = 100 / 25;
            if (state <= 25) {
                lp = 0;
                bp = mul * off;
            }
            else if (state < 50) {
                lp = mul * off;
                bp = 100;
            }
            else if (state <= 75) {
                lp = 100;
                bp = 100 - mul * off;
            }
            else if (state < 50) {
                lp = 100 - mul * off;
                bp = 0;
            }
            markerNode.style.left = "calc(10px + ".concat(lp, "% * 0.95)");
            markerNode.style.bottom = "calc(10px + ".concat(bp, "% * 0.95)");
            return;
        }
        var ptrackers = ["pm", "ps", "pu", "pp", "pe", "ph"];
        var rtrackers = ["m", "s", "u", "p", "e", "h"];
        if (tokenNode.id.startsWith("tracker_")) {
            var type = getPart(tokenNode.id, 1);
            if (ptrackers.includes(type)) {
                var color = getPart(tokenNode.id, 2);
                var marker = "marker_" + tokenNode.id;
                var markerNode = $(marker);
                if (!markerNode) {
                    markerNode = this.game.createDivNode(marker, "marker marker_".concat(type, " marker_").concat(color), "pboard_".concat(color));
                    this.convertInto3DCube(markerNode, color);
                }
                var state = parseInt(tokenNode.getAttribute("data-state"));
                var rem = state % 10;
                var x = rem;
                var y = 0;
                if (rem > 5) {
                    x = rem - 5;
                    y = 1;
                }
                else if (state < 0) {
                    x = state + 6;
                    y = -1;
                }
                var xp = x * 3.7;
                var yp = y * 4;
                markerNode.style.marginLeft = "".concat(xp, "%");
                markerNode.style.marginTop = "".concat(yp, "%");
            }
            else if (rtrackers.includes(type)) {
                var color = getPart(tokenNode.id, 2);
                var state = parseInt(tokenNode.getAttribute("data-state"));
                new ScatteredResourceZone(this.game, "resarea_".concat(type, "_").concat(color)).setValue(state);
            }
        }
    };
    VLayout.prototype.convertInto3DCube = function (tokenNode, color) {
        dojo.addClass(tokenNode, "mcube");
        if (color)
            dojo.addClass(tokenNode, "mcube-" + color);
        for (var i = 0; i <= 5; i++) {
            dojo.place("<div class=\"mcube-face  mcube-face-".concat(i, "\"></div>"), tokenNode);
        }
    };
    VLayout.prototype.createHtmlForToken = function (tokenNode, displayInfo) {
        if (displayInfo.mainType == "marker") {
            this.convertInto3DCube(tokenNode, displayInfo.color);
        }
    };
    return VLayout;
}());
define([
    "dojo",
    "dojo/_base/declare",
    "ebg/core/gamegui",
    "ebg/counter"
], function (dojo, declare) {
    declare("bgagame.mars", ebg.core.gamegui, new GameXBody());
});
