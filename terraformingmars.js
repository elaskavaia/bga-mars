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
        _this.classButtonDisabled = "disabled";
        _this.defaultTooltipDelay = 800;
        _this.defaultAnimationDuration = 500;
        _this._helpMode = false; // help mode where tooltip shown instead of click action
        _this._displayedTooltip = null; // used in help mode
        _this._notif_uid_to_log_id = {};
        _this._notif_uid_to_mobile_log_id = {};
        _this._last_notif = null;
        _this.zoom = 1.0;
        _this.helpModeHandler = _this.onClickForHelp.bind(_this);
        _this.closeHelpHandler = _this.closeCurrentTooltip.bind(_this);
        console.log("game constructor");
        _this.laststate = null;
        _this.pendingUpdate = false;
        _this._notif_uid_to_log_id = {};
        _this._notif_uid_to_mobile_log_id = {};
        _this._last_notif = null;
        return _this;
    }
    GameBasics.prototype.setup = function (gamedatas) {
        console.log("Starting game setup", gamedatas);
        //dojo.destroy("debug_output"); // its too slow and useless
        this.gamedatas_server = dojo.clone(this.gamedatas);
        this.setupInfoPanel();
        this.setupNotifications();
        this.upldateColorMapping(".player-name *");
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
    GameBasics.prototype.remoteCallWrapperUnchecked = function (action, args, handler) {
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
    GameBasics.prototype.remoteCallWrapper = function (action, args, handler) {
        if (this.checkAction(action)) {
            this.remoteCallWrapperUnchecked(action, args, handler);
        }
    };
    /**
     * This execute a specific action called userAction via ajax and passes json as arguments
     * However php action check will be on "action" and corresponding php method will be called from game.php side
     * @param action
     * @param args
     * @param handler
     */
    GameBasics.prototype.remoteUserAction = function (action, args, handler) {
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
        console.log(this.last_server_state);
        this.disconnectAllTemp();
        //this.restoreServerData();
        //this.updateCountersSafe(this.gamedatas.counters);
        if (this.on_client_state)
            this.restoreServerGameState();
        if (this.isCurrentPlayerActive()) {
            if (this.gamedatas.gamestate.private_state != null) {
                var gamestate = this.gamedatas.gamestate.private_state;
                this.updatePageTitle(gamestate);
                this.onEnteringState(gamestate.name, gamestate);
                this.onUpdateActionButtons(gamestate.name, gamestate.args);
            }
            else {
                this.updatePageTitle(this.gamedatas.gamestate);
            }
        }
    };
    GameBasics.prototype.updatePageTitle = function (state) {
        if (state === void 0) { state = null; }
        //debugger;
        console.log("updatePageTitle", state);
        if (state === null || state === void 0 ? void 0 : state.private_state)
            this.inherited(state.private_state);
        return this.inherited(arguments);
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
        var _a;
        if (!$(token))
            console.error("token not found for ".concat(token));
        if (((_a = $(token)) === null || _a === void 0 ? void 0 : _a.parentNode) == $(finalPlace))
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
        clone.style.transitionDuration = "0ms"; // disable animation during projection
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
        clone.style.transitionDuration = undefined;
        return clone;
    };
    GameBasics.prototype.phantomMove = function (mobileId, newparentId, duration, mobileStyle, onEnd) {
        var _a, _b, _c;
        var mobileNode = $(mobileId);
        if (!mobileNode)
            throw new Error("Does not exists ".concat(mobileId));
        var newparent = $(newparentId);
        if (!newparent)
            throw new Error("Does not exists ".concat(newparentId));
        if (duration === undefined)
            duration = this.defaultAnimationDuration;
        if (!duration || duration < 0)
            duration = 0;
        var noanimation = duration <= 0 || !mobileNode.parentNode;
        var oldParent = mobileNode.parentElement;
        var clone = null;
        if (!noanimation) {
            // do animation
            clone = this.projectOnto(mobileNode, "_temp");
            mobileNode.style.opacity = "0"; // hide original
        }
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
        newparent.classList.add("move_target");
        oldParent === null || oldParent === void 0 ? void 0 : oldParent.classList.add("move_source");
        mobileNode.offsetHeight; // recalc
        if (noanimation) {
            setTimeout(function () {
                newparent.offsetHeight;
                newparent.classList.remove("move_target");
                oldParent === null || oldParent === void 0 ? void 0 : oldParent.classList.remove("move_source");
                if (onEnd)
                    onEnd(mobileNode);
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
            (_a = desti.parentNode) === null || _a === void 0 ? void 0 : _a.removeChild(desti);
            setTimeout(function () {
                var _a;
                newparent.classList.remove("move_target");
                oldParent === null || oldParent === void 0 ? void 0 : oldParent.classList.remove("move_source");
                mobileNode.style.removeProperty("opacity"); // restore visibility of original
                (_a = clone.parentNode) === null || _a === void 0 ? void 0 : _a.removeChild(clone); // destroy clone
                if (onEnd)
                    onEnd(mobileNode);
            }, duration);
        }
        catch (e) {
            // if bad thing happen we have to clean up clones
            console.error("ERR:C01:animation error", e);
            (_b = desti.parentNode) === null || _b === void 0 ? void 0 : _b.removeChild(desti);
            (_c = clone.parentNode) === null || _c === void 0 ? void 0 : _c.removeChild(clone); // destroy clone
            //if (onEnd) onEnd(mobileNode);
        }
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
    GameBasics.prototype.getTooltipHtml = function (name, message, imgTypes, action) {
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
        var actionLine = action ? this.getActionLine(action) : "";
        var body = "";
        if (imgTypes.includes("_override")) {
            body = message;
        }
        else {
            var message_tr = this.getTr(message);
            body = "\n          ".concat(divImg, "\n           <div class='tooltipmessage tooltiptext'>").concat(message_tr, "</div>\n    ");
        }
        return "<div class='".concat(containerType, "'>\n        <div class='tooltiptitle'>").concat(name_tr, "</div>\n        <div class='tooltip-body-separator'></div>\n        <div class='tooltip-body'>").concat(body, "</div>\n        ").concat(actionLine, "\n    </div>");
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
    GameBasics.prototype.setSubTitle = function (log, args) {
        if (args === void 0) { args = []; }
        var msg = this.format_string_recursive(log, args);
        if (msg != "") {
            $("gameaction_status").innerHTML = msg;
        }
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
    GameBasics.prototype.setMainTitle = function (text, append) {
        if (append === void 0) { append = false; }
        var main = $("pagemaintitletext");
        if (append)
            main.innerHTML += text;
        else
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
    GameBasics.prototype.divColoredPlayer = function (player_id) {
        var color = this.gamedatas.players[player_id].color || "black";
        var color_bg = "";
        if (this.gamedatas.players[player_id].color_back) {
            color_bg = "background-color:#" + this.gamedatas.players[player_id].color_back + ";";
        }
        var div = '<span style="color:#' + color + ";" + color_bg + '">' + this.gamedatas.players[player_id].name + "</span>";
        return div;
    };
    // INPUT CONNECTORS
    GameBasics.prototype.setActiveSlot = function (node) {
        if (!$(node)) {
            this.showError("Not found " + node);
            return;
        }
        $(node).classList.add(this.classActiveSlot);
    };
    GameBasics.prototype.setActiveSlots = function (slots) {
        for (var index = 0; index < slots.length; index++) {
            var element = slots[index];
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
     * Return array of node id, carefull - not all nodes have ids, it could be undefines there
     * @param query
     * @returns array of ids
     */
    GameBasics.prototype.queryIds = function (query) {
        var ids = [];
        document.querySelectorAll(query).forEach(function (node) { return ids.push(node.id); });
        return ids;
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
        var target = event.target;
        if (id == "thething") {
            var node = this.findActiveParent(target);
            id = node === null || node === void 0 ? void 0 : node.id;
        }
        console.log("on slot " + id, (target === null || target === void 0 ? void 0 : target.id) || target);
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
            console.error(new Error("unauth"), id);
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
        var _a, _b;
        return (_b = (_a = this.gamedatas.players[playerId]) === null || _a === void 0 ? void 0 : _a.color) !== null && _b !== void 0 ? _b : "ffffff";
    };
    GameBasics.prototype.getPlayerName = function (playerId) {
        var _a, _b;
        return (_b = (_a = this.gamedatas.players[playerId]) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : _("Not a Player");
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
    GameBasics.prototype.getPlayerIdByNo = function (no) {
        for (var playerId in this.gamedatas.players) {
            var playerInfo = this.gamedatas.players[playerId];
            if (no == playerInfo.no) {
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
    GameBasics.prototype.addActionButton = function (id, label, method, destination, blinking, color) {
        if ($(id))
            dojo.destroy(id);
        this.inherited(arguments);
        return $(id);
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
        this.destroyDivOtherCopies("player_board_config");
        dojo.place("player_board_config", "player_boards", "first");
        // move preference in gear tab
        var userPrefContainerId = "settings-controls-container-prefs";
        $(userPrefContainerId).setAttribute("data-name", _("Preferences"));
        for (var index = 100; index <= 199; index++) {
            var prefDivId = "preference_control_" + index;
            var element = this.destroyDivOtherCopies(prefDivId);
            if (element) {
                var parent_1 = element.parentElement.parentElement;
                if (parent_1.parentElement.id != userPrefContainerId) {
                    dojo.place(parent_1, userPrefContainerId);
                    if (this.refaceUserPreference(index, parent_1, prefDivId) == false) {
                        // remove the class because otherwise framework will hook its own listener there
                        parent_1.querySelectorAll(".game_preference_control").forEach(function (node) { return dojo.removeClass(node, "game_preference_control"); });
                        dojo.connect(parent_1, "onchange", function (e) { return _this.onChangePreferenceCustom(e); });
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
        var copylog = $("button_copylog");
        if (!copylog) {
            copylog = this.addActionButton("button_copylog", _("Copy LOG"), function () { return _this.copyLogToClipBoard(); }, "settings-controls-container", false, "gray");
            copylog.dataset.lines = "100";
        }
        dojo.place(copylog, "settings-controls-container", "first");
        dojo.place(bug, "settings-controls-container", "first");
    };
    GameBasics.prototype.extractTextFromLogItem = function (node) {
        var _this = this;
        var _a;
        if (node.title)
            return node.title;
        if (((_a = node.children) === null || _a === void 0 ? void 0 : _a.length) > 0) {
            var array = Array.from(node.childNodes);
            var sep = node.classList.contains("log") ? "\n" : "";
            return array.map(function (x) { return _this.extractTextFromLogItem(x); }).join(sep);
        }
        if (node.nodeType == Node.TEXT_NODE)
            return node.nodeValue;
        return node.innerText;
    };
    GameBasics.prototype.extractTextGameInfo = function () {
        var text = "";
        text += "Current player ".concat(this.getPlayerName(this.player_id), " ").concat(this.getPlayerColor(this.player_id), "\n");
        return text;
    };
    GameBasics.prototype.copyLogToClipBoard = function () {
        var _this = this;
        var _a, _b;
        var linesMax = parseInt((_b = (_a = $("button_copylog")) === null || _a === void 0 ? void 0 : _a.dataset.lines) !== null && _b !== void 0 ? _b : "100");
        var text = "LOGS (".concat(linesMax, " last lines)\n");
        var lines = 0;
        document.querySelectorAll("#logs > *").forEach(function (lognode) {
            lines++;
            if (lines > linesMax)
                return;
            text += _this.extractTextFromLogItem(lognode) + "\n";
        });
        var text2 = "GAME situation\n";
        text2 += this.extractTextGameInfo();
        navigator.clipboard.writeText(text + text2);
        var html = "\n    Text was copied to clipboard, you can just paste it in the bug report<br>\n    NOTE: this may reveal private info about your hand card, please remove this info manually if you care\n    <br>\n    <pre class='mr_scrollable'>\n    ".concat(text, "\n    </pre>\n    <br>\n    <pre class='mr_scrollable'>\n    ").concat(text2, "\n    </pre>\n    ");
        this.showPopin(html, "log_info", "Game Info for bug report");
    };
    /** Show pop in dialog. If you need div id of dialog its `popin_${id}` where id is second parameter here */
    GameBasics.prototype.showPopin = function (html, id, title, refresh) {
        if (id === void 0) { id = "mr_dialog"; }
        if (title === void 0) { title = undefined; }
        if (refresh === void 0) { refresh = false; }
        var content_id = "popin_".concat(id, "_contents");
        if (refresh && $(content_id)) {
            $(content_id).innerHTML = html;
            return undefined;
        }
        var dialog = new ebg.popindialog();
        dialog.create(id);
        if (title)
            dialog.setTitle(title);
        dialog.setContent(html);
        dialog.show();
        return dialog;
    };
    GameBasics.prototype.refaceUserPreference = function (pref_id, node, prefDivId) {
        // can override to change apperance
        return false; // return false to hook defaut listener, other return true and you have to hook listener yourself
    };
    /**
     * Control where click is registered has to have matching id (where part will be the pref_id) or have attribute data-pref_id set
     * @param e Event
     */
    GameBasics.prototype.onChangePreferenceCustom = function (e) {
        var _a;
        var target = e.target;
        if (!target.id)
            return;
        var match = target.id.match(/^preference_[cf]ontrol_(\d+).*$/);
        var prefId;
        if (match) {
            // Extract the ID and value from the UI control
            prefId = +match[1];
        }
        else {
            prefId = target.getAttribute("data-pref-id");
        }
        if (!prefId)
            return; // error?
        var prefValue = +((_a = target.value) !== null && _a !== void 0 ? _a : target.getAttribute("value"));
        this.remoteCallChangePreferenceCustom(prefId, prefValue);
    };
    GameBasics.prototype.remoteCallChangePreferenceCustom = function (pref_id, value) {
        console.log("ajaxCallChangePreference", pref_id, value);
        value = parseInt(value);
        this.prefs[pref_id].value = value;
        // send to mainsite to update
        this.ajaxcall("/table/table/changePreference.html", {
            id: pref_id,
            value: value,
            lock: true,
            game: this.game_name
        }, this, function (result) {
            var _this = this;
            console.log("=> back", result);
            // send to our game to update per game table
            this.gamedatas.server_prefs[pref_id] = value;
            if (pref_id >= 100 && pref_id < 200) {
                var args = { pref_id: pref_id, pref_value: value, player_id: this.player_id, lock: true };
                this.remoteCallWrapperUnchecked("changePreference", args, function (err, res) {
                    if (err)
                        console.error("changePreference callback failed " + res);
                    else {
                        console.log("changePreference sent " + pref_id + "=" + value);
                        var opname = _this.getTr(_this.prefs[pref_id].name);
                        var opvalue = _this.getTr(_this.prefs[pref_id].values[value].name);
                        _this.showMessage(_("Done, preference changed:") + " " + opname + " => " + opvalue, "info");
                    }
                });
            }
            // this is async to other server send, its ok
            if (result.status == "reload") {
                this.showMessage(_("Done, reload in progress..."), "info");
                window.location.hash = "";
                window.location.reload();
            }
            else {
                if (result.pref_id == this.GAMEPREFERENCE_DISPLAYTOOLTIPS) {
                    this.switchDisplayTooltips(result.value);
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
        document.body.addEventListener("click", this.closeHelpHandler);
        this.setDescriptionOnMyTurn(_("HELP MODE Activated. Click on game elements to get tooltips"));
        dojo.empty("generalactions");
        this.addCancelButton(undefined, function () { return _this.deactivateHelpMode(); });
        document.querySelectorAll(".withtooltip").forEach(function (node) {
            node.addEventListener("click", _this.helpModeHandler, false);
        });
    };
    GameBasics.prototype.deactivateHelpMode = function () {
        var _this = this;
        var chk = $("help-mode-switch");
        dojo.setAttr(chk, "bchecked", false);
        this.closeCurrentTooltip();
        this._helpMode = false;
        dojo.removeClass("ebd-body", "help-mode");
        document.body.removeEventListener("click", this.closeHelpHandler);
        document.querySelectorAll(".withtooltip").forEach(function (node) {
            node.removeEventListener("click", _this.helpModeHandler, false);
        });
        this.on_client_state = true;
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
            var html = this.tooltips[id].getContent($(id));
            this._displayedTooltip = this.showPopin(html, "current_tooltip");
        }
        return true;
    };
    GameBasics.prototype.onScreenWidthChange = function () {
        // override
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
        dojo.subscribe("score", this, "notif_score");
        this.notifqueue.setSynchronous("score", 5000); // reset in notif handler
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
        if (funcName === undefined)
            funcName = notifName;
        if (!(typeof this["notif_" + funcName] === "function")) {
            this.showError("ERR:C02:Notification notif_" + funcName + " isn't set !");
            return;
        }
        dojo.subscribe(notifName, this, function (notif) { return _this.playnotif(funcName, notif, duration); });
        if (!duration) {
            //variable duration
            //don't forget to call this.notifqueue.setSynchronousDuration(duration);
            this.notifqueue.setSynchronous(notifName);
        }
        else if (duration === 1) {
            //Notif has no animation, thus no delay
            //this.notifqueue.setSynchronous(notifName, duration);
        }
        else {
            this.notifqueue.setSynchronous(notifName, duration);
        }
    };
    GameBasics.prototype.playnotif = function (notifname, notif, setDelay) {
        //console.log("playing notif " + notifname + " with args ", notif.args);
        var _this = this;
        var notiffunc = "notif_" + notifname;
        if (!this[notiffunc]) {
            this.showMessage("Notif: " + notiffunc + " not implemented yet", "error");
        }
        else {
            var startTime_1 = Date.now();
            console.log("".concat(notiffunc, ": ").concat(setDelay, " notif received"), notif);
            //  this.onNotif(notif);//should be moved here
            var p = this[notiffunc](notif);
            if (setDelay > 0)
                return; //nothing to do here
            if (!(p instanceof Promise)) {
                //no promise returned: no animation played
                console.log(notiffunc + " :not a promise");
                //this.notifqueue.setSynchronousDuration(1);
            }
            else {
                //  this.animated=true;
                p.finally(function () {
                    _this.notifqueue.setSynchronousDuration(10);
                    var executionTime = Date.now() - startTime_1;
                    console.log("".concat(notiffunc, ": ").concat(setDelay, " sync has been set to dynamic after ").concat(executionTime, "ms elapsed"));
                    //    this.animated=false;
                });
            }
        }
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
    GameBasics.prototype.rgbToHex = function (arr) {
        try {
            return ("#" +
                arr
                    .map(function (x) {
                    if (typeof x === "string") {
                        x = parseInt(x.trim());
                    }
                    var hex = x.toString(16);
                    return hex.length === 1 ? "0" + hex : hex;
                })
                    .join(""));
        }
        catch (e) {
            return undefined;
        }
    };
    GameBasics.prototype.getColorMappingVar = function (color) {
        if (!color)
            return undefined;
        if (color.startsWith("rgb(")) {
            var rgb = color.substring(4, color.length - 1);
            color = this.rgbToHex(rgb.split(","));
        }
        if (color.startsWith("#"))
            color = color.substring(1);
        for (var player_id in this.gamedatas.players) {
            if (this.gamedatas.players[player_id].color == color) {
                return "var(--color-mapping_".concat(color, ")");
            }
        }
        return undefined;
    };
    GameBasics.prototype.upldateColorMapping = function (query) {
        var _this = this;
        document.querySelectorAll(query).forEach(function (node) {
            var _a;
            var color = (_a = node.style) === null || _a === void 0 ? void 0 : _a.color;
            if (!color)
                return;
            var cvar = _this.getColorMappingVar(color);
            if (cvar) {
                node.style.color = cvar;
            }
        });
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
        // update hardcoded colors to variable
        this.upldateColorMapping("#page-title *");
    };
    GameBasics.prototype.onNotif = function (notif) {
        this.restoreMainBar();
        //console.log("notif", notif);
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
    GameBasics.prototype.notif_score = function (notif) {
        var _a;
        this.onNotif(notif);
        console.log(notif);
        try {
            this.updatePlayerScoreWithAnim(notif.args);
        }
        finally {
            this.notifqueue.setSynchronousDuration((_a = notif.args.duration) !== null && _a !== void 0 ? _a : 1000);
        }
    };
    GameBasics.prototype.updatePlayerScoreWithAnim = function (args) {
        var _a, _b;
        if (this.scoreCtrl[args.player_id]) {
            if (args.noa)
                this.scoreCtrl[args.player_id].setValue(args.player_score);
            else
                this.scoreCtrl[args.player_id].toValue(args.player_score);
        }
        var prev = this.gamedatas.players[args.player_id].score;
        var inc = args.player_score - prev;
        this.gamedatas.players[args.player_id].score = args.player_score;
        if (args.target && !args.noa && inc != 0) {
            var duration = (_a = args.duration) !== null && _a !== void 0 ? _a : 1000;
            var color = (_b = args.color) !== null && _b !== void 0 ? _b : this.getPlayerColor(args.player_id);
            this.displayScoring(args.target, color, inc, args.duration);
            args.duration = duration;
        }
        else {
            args.duration = 0;
        }
    };
    /*
     * [Undocumented] Called by BGA framework on any notification message
     * Handle cancelling log messages for restart turn
     */
    GameBasics.prototype.onPlaceLogOnChannel = function (msg) {
        var currentLogId = this.notifqueue.next_log_id;
        var currentMobileLogId = this.next_log_id;
        var res = this.inherited(arguments);
        this._notif_uid_to_log_id[msg.uid] = currentLogId;
        this._notif_uid_to_mobile_log_id[msg.uid] = currentMobileLogId;
        this._last_notif = {
            logId: currentLogId,
            mobileLogId: currentMobileLogId,
            msg: msg
        };
        return res;
    };
    /*
     * cancelLogs:
     *   strikes all log messages related to the given array of notif ids
     */
    GameBasics.prototype.checkLogCancel = function (notifId) {
        if (this.gamedatas.canceledNotifIds != null && this.gamedatas.canceledNotifIds.includes(notifId)) {
            this.cancelLogs([notifId]);
        }
    };
    GameBasics.prototype.cancelLogs = function (notifIds) {
        var _this = this;
        if (!notifIds)
            return;
        notifIds.forEach(function (uid) {
            if (_this._notif_uid_to_log_id.hasOwnProperty(uid)) {
                var logId = _this._notif_uid_to_log_id[uid];
                if ($("log_" + logId))
                    dojo.addClass("log_" + logId, "cancel");
            }
            if (_this._notif_uid_to_mobile_log_id.hasOwnProperty(uid)) {
                var mobileLogId = _this._notif_uid_to_mobile_log_id[uid];
                if ($("dockedlog_" + mobileLogId))
                    dojo.addClass("dockedlog_" + mobileLogId, "cancel");
            }
        });
    };
    /*
              * [Undocumented] Override BGA framework functions to call onLoadingLogsComplete when loading is done
                          @Override
              */
    GameBasics.prototype.setLoader = function (image_progress, logs_progress) {
        if (typeof g_replayFrom != "undefined" && image_progress >= 8) {
            dojo.style("loader_mask", "display", "none");
        }
        this.inherited(arguments); // required, this is "super()" call, do not remove
        //console.log("loader", image_progress, logs_progress)
        if (!this.isLoadingLogsComplete && logs_progress >= 100) {
            this.isLoadingLogsComplete = true; // this is to prevent from calling this more then once
            this.onLoadingLogsComplete();
        }
    };
    GameBasics.prototype.onLoadingLogsComplete = function () {
        console.log("Loading logs complete");
        // do something here
        this.upldateColorMapping(".playername");
        this.upldateColorMapping(".player-name *");
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
    if (arr.length <= i)
        return "";
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
/** This is essentically dojo.place but without dojo */
function placeHtml(html, parent, how) {
    if (how === void 0) { how = "beforeend"; }
    return $(parent).insertAdjacentHTML(how, html);
}
var ALL_SORT_TYPES = ["none", "playable", "cost", "vp", "manual"];
/** Hand of cards (also Draw, Draft, etc) */
var CardHand = /** @class */ (function () {
    function CardHand(game // game reference
    ) {
        this.game = game;
    }
    CardHand.prototype.hookSort = function () {
        var _this = this;
        try {
            //generate buttons
            //I wanted first to attach them to every handy area, but it prevents areas to hide (there is no way in css to evaluate the number of children of a node)
            //So I attached it to the hand area block.
            document.querySelectorAll(".tm_sortable").forEach(function (node) { return _this.addSortButtonsToHandy(node); });
            this.enableManualReorder("hand_area");
            this.game.connectClass("hs_button", "onclick", function (event) { return _this.onClickHandSort(event); });
        }
        catch (e) {
            this.game.showError("error during sorting setup, card sorting is disabled");
        }
    };
    CardHand.prototype.saveSort = function () {
        document.querySelectorAll(".tm_sortable").forEach(function (node) { return saveLocalManualOrder(node); });
    };
    CardHand.prototype.onClickHandSort = function (event) {
        dojo.stopEvent(event);
        if (this.game._helpMode)
            return;
        var btn = event.currentTarget;
        var prevType = btn.dataset.type;
        var newtype;
        switch (prevType) {
            case "none":
                newtype = "playable";
                break;
            case "playable":
                newtype = "cost";
                break;
            case "cost":
                newtype = "vp";
                break;
            case "vp":
                newtype = "manual";
                break;
            case "manual":
                newtype = "none";
                break;
        }
        this.switchHandSort(btn, newtype);
    };
    CardHand.prototype.switchHandSort = function (button, newtype) {
        var sortInfo = this.game.getRulesFor("sort_".concat(newtype), "*", undefined);
        if (!sortInfo) {
            return;
        }
        button.dataset.type = newtype;
        button.querySelector("i").removeAttribute("class");
        button.querySelector("i").classList.add("fa", sortInfo.icon);
        var handId = button.dataset.target;
        $(handId).dataset.sort_type = newtype;
        this.updateButtonTooltip(button, sortInfo);
        var localColorSetting = new LocalSettings(this.game.getLocalSettingNamespace("card_sort_".concat(handId)));
        localColorSetting.writeProp("sort_type", newtype);
        this.applySortOrder($(handId));
    };
    CardHand.prototype.updateButtonTooltip = function (button, sortInfo) {
        var fullmsg = _("Click to select next sorting mode");
        fullmsg += ".<br>";
        fullmsg += _("The selected sort mode is stored in local browser storage, not in the game database.");
        for (var _i = 0, ALL_SORT_TYPES_1 = ALL_SORT_TYPES; _i < ALL_SORT_TYPES_1.length; _i++) {
            var otherSort = ALL_SORT_TYPES_1[_i];
            var oInfo = this.game.getRulesFor("sort_".concat(otherSort), "*", undefined);
            var name_1 = this.game.getTokenName(otherSort);
            fullmsg += this.game.generateTooltipSection(name_1, "<i class=\"fa ".concat(oInfo.icon, "\"></i> ") + _(oInfo.tooltip));
        }
        var title = _("Sort Order: ") + "<i class=\"fa ".concat(sortInfo.icon, "\"></i> ") + _(sortInfo.name);
        var html = this.game.getTooltipHtml(title, fullmsg, "");
        this.game.addTooltipHtml(button.id, html);
        button.classList.add("withtooltip");
    };
    CardHand.prototype.addSortButtonsToHandy = function (attachNode) {
        var id = attachNode.id;
        var buttonId = "hs_button_" + id + "_switch";
        var htm = "<div id=\"".concat(buttonId, "\" class=\"hs_button\" data-target=\"").concat(id, "\" data-type=\"none\"><div class=\"hs_picto hs_cost\"><i id=\"hs_button_").concat(id, "_picto\" class=\"fa fa-times\" aria-hidden=\"true\"></i></div></div>       ");
        var node = this.game.createDivNode("", "hand_sorter", attachNode.id);
        node.innerHTML = htm;
        var localColorSetting = new LocalSettings(this.game.getLocalSettingNamespace("card_sort_".concat(id)));
        var sortType = localColorSetting.readProp("sort_type", "manual");
        this.switchHandSort($(buttonId), sortType);
    };
    /* Manual reordering of cards via drag'n'drop */
    CardHand.prototype.enableManualReorder = function (idContainer) {
        $(idContainer).addEventListener("drop", namedEventPreventDefaultAndStopHandler);
        $(idContainer).addEventListener("dragover", namedEventPreventDefaultHandler);
        $(idContainer).addEventListener("dragenter", namedEventPreventDefaultHandler);
    };
    CardHand.prototype.enableDragOnCard = function (node) {
        if (node.draggable)
            return;
        //disable on mobile for now
        if ($("ebd-body").classList.contains("mobile_version"))
            return;
        //console.log("enable drag on ", node.id);
        node.querySelectorAll("*").forEach(function (sub) {
            sub.draggable = false;
        });
        node.draggable = true;
        node.addEventListener("dragstart", onDragStart);
        node.addEventListener("dragend", onDragEnd);
    };
    CardHand.prototype.disableDragOnCard = function (node) {
        if (!node.draggable)
            return;
        //console.log("disable drag on ", node.id);
        node.draggable = false;
        node.removeEventListener("dragstart", onDragStart);
        node.removeEventListener("dragend", onDragEnd);
    };
    CardHand.prototype.maybeEnabledDragOnCard = function (tokenNode) {
        if (dojo.hasClass(tokenNode.parentElement, "tm_sortable")) {
            if (isManualSortOrderEnabled(tokenNode.parentElement)) {
                this.enableDragOnCard(tokenNode);
                return;
            }
        }
        this.disableDragOnCard(tokenNode);
    };
    CardHand.prototype.applySortOrder = function (node) {
        var _this = this;
        if (node === undefined) {
            document.querySelectorAll(".tm_sortable").forEach(function (node) { return _this.applySortOrder(node); });
            return;
        }
        var containerNode = node;
        if (isManualSortOrderEnabled(containerNode)) {
            this.loadLocalManualOrder(containerNode);
            containerNode.querySelectorAll(".card").forEach(function (card) {
                _this.enableDragOnCard(card);
                card.style.removeProperty("--sort-order");
            });
        }
        else {
            // disable on all cards in case it was moved
            document.querySelectorAll(".card").forEach(function (card) {
                if (!isManualSortOrderEnabled(card.parentElement))
                    _this.disableDragOnCard(card);
            });
            containerNode.querySelectorAll(".card").forEach(function (card) { return _this.updateSortOrderOnCard(card); });
        }
    };
    CardHand.prototype.updateSortOrderOnCard = function (card) {
        var _a, _b;
        this.maybeEnabledDragOnCard(card);
        var sortType = card.parentElement.dataset.sort_type;
        var weight = 0;
        switch (sortType) {
            case "cost":
                weight = parseInt((_b = (_a = card.dataset.discount_cost) !== null && _a !== void 0 ? _a : card.dataset.cost) !== null && _b !== void 0 ? _b : "0");
                break;
            case "playable":
                weight = this.getSortWeightPlayability(card);
                break;
            case "vp":
                weight = this.getSortWeightVp(card);
                break;
            default:
                card.style.removeProperty("--sort-order");
                return;
        }
        // card num is last sort disambiguator
        var num = parseInt(getPart(card.id, 2));
        card.style.setProperty("--sort-order", String(weight * 1000 + num));
    };
    CardHand.prototype.getSortWeightVp = function (card) {
        var vpattr = this.game.getRulesFor(card.id, "vp", undefined);
        var vp = 0;
        if (vpattr) {
            vp = Number(vpattr);
            if (isNaN(vp)) {
                var sp = vpattr.split("/");
                if (sp.length == 2)
                    vp = 5 - parseInt(sp[1]);
                else
                    vp = 5;
            }
        }
        return vp;
    };
    CardHand.prototype.getSortWeightPlayability = function (card) {
        var _a;
        var cost = parseInt((_a = card.dataset.discount_cost) !== null && _a !== void 0 ? _a : card.dataset.cost);
        var sort_playable = 0;
        if (card.dataset.invalid_prereq != "0")
            sort_playable += 1;
        sort_playable = sort_playable * 2;
        if (card.dataset.cannot_resolve != "0")
            sort_playable += 1;
        sort_playable = sort_playable * 2;
        if (card.dataset.cannot_pay != "0")
            sort_playable += 1;
        return sort_playable * 50 + cost;
    };
    CardHand.prototype.loadLocalManualOrder = function (containerNode) {
        if (!containerNode)
            return;
        var sortOrder = getDivLocalSetting(containerNode.id).readProp("custom_order", "");
        if (!sortOrder)
            return;
        var cards = sortOrder.split(",");
        cards.reverse().forEach(function (card_id) {
            var node = $(card_id);
            if ((node === null || node === void 0 ? void 0 : node.parentElement) === containerNode) {
                containerNode.prepend(node);
            }
        });
    };
    return CardHand;
}());
function getDivLocalSetting(divId) {
    var game = gameui;
    var localOrderSetting = new LocalSettings(getGamePlayerNamespace(game.table_id, divId));
    return localOrderSetting;
}
function getGamePlayerNamespace(a, b) {
    if (a === void 0) { a = ""; }
    if (b === void 0) { b = ""; }
    var game = gameui;
    if (b)
        return "".concat(game.game_name, "-").concat(game.player_id, "-").concat(a, "_").concat(b);
    return "".concat(game.game_name, "-").concat(game.player_id, "-").concat(a);
}
function isManualSortOrderEnabled(tokenNode) {
    var _a;
    if (((_a = tokenNode === null || tokenNode === void 0 ? void 0 : tokenNode.dataset) === null || _a === void 0 ? void 0 : _a.sort_type) == "manual") {
        return true;
    }
    else {
        return false;
    }
}
function saveLocalManualOrder(containerNode) {
    if (!isManualSortOrderEnabled(containerNode))
        return;
    var game = gameui;
    var sortOrder = "";
    //query should return in the same order as the DOM
    dojo.query("#" + containerNode.id + " .card").forEach(function (card) {
        sortOrder += "".concat(card.id, ",");
    });
    sortOrder = sortOrder.substring(0, sortOrder.length - 1);
    getDivLocalSetting(containerNode.id).writeProp("custom_order", sortOrder);
}
function onDragEnd(event) {
    // no prevent defaults
    var selectedItem = event.target;
    console.log("onDragEnd", selectedItem === null || selectedItem === void 0 ? void 0 : selectedItem.id);
    var x = event.clientX;
    var y = event.clientY;
    var containerNode = selectedItem.parentElement;
    var pointsTo = document.elementFromPoint(x, y);
    if (pointsTo === selectedItem || pointsTo === null) {
        // do nothing
    }
    else if (containerNode === pointsTo) {
        //dropped in empty space on container
        containerNode.append(selectedItem);
    }
    else if (pointsTo.parentElement !== undefined &&
        pointsTo.parentElement.parentElement !== undefined &&
        pointsTo.parentElement.parentElement == selectedItem.parentElement &&
        pointsTo.classList.contains("dragzone_inside")) {
        containerNode.insertBefore(selectedItem, pointsTo.parentElement);
    }
    else if (containerNode === pointsTo.parentNode) {
        containerNode.insertBefore(pointsTo, selectedItem);
    }
    else {
        console.error("Cannot determine target for drop", pointsTo.id);
    }
    selectedItem.classList.remove("drag-active");
    $("ebd-body").classList.remove("drag_inpg");
    containerNode.style.removeProperty("width");
    containerNode.style.removeProperty("height");
    document.querySelectorAll(".dragzone").forEach(dojo.destroy);
    console.log("onDragEnd commit");
    try {
        saveLocalManualOrder(containerNode);
    }
    catch (e) {
        console.error(e);
    }
}
function onDragStart(event) {
    var selectedItem = event.currentTarget;
    console.log("onDragStart", selectedItem === null || selectedItem === void 0 ? void 0 : selectedItem.id);
    var cardParent = selectedItem.parentElement;
    // no prevent defaults
    if (!cardParent.classList.contains("handy") || !selectedItem.id) {
        event.preventDefault();
        event.stopPropagation();
        console.log("onDragStart - no");
        return;
    }
    // no checks, handler should not be installed if on mobile and such
    //prevent container from changing size
    var rect = cardParent.getBoundingClientRect();
    cardParent.style.setProperty("width", String(rect.width) + "px");
    cardParent.style.setProperty("height", String(rect.height) + "px");
    $("ebd-body").classList.add("drag_inpg");
    selectedItem.classList.add("drag-active");
    selectedItem.style.setProperty("user-select", "none");
    // event.dataTransfer.setData("text/plain", "card"); // not sure if needed
    // event.dataTransfer.effectAllowed = "move";
    // event.dataTransfer.dropEffect = "move";
    // selectedItem.classList.add("hide"); not in css?
    // without timeout the dom changes cancel the start drag in a lot of cases because the new element under the mouse
    setTimeout(function () {
        cardParent.querySelectorAll(".dragzone").forEach(dojo.destroy);
        cardParent.querySelectorAll(".card").forEach(function (card) {
            //prevent
            if (card.id == selectedItem.id)
                return;
            if (card.nextElementSibling == null) {
                var dragNodeId = "dragright_" + card.id;
                var righthtm = "<div class=\"dragzone outsideright\"><div id=\"".concat(dragNodeId, "\" class=\"dragzone_inside dragright\"></div></div>");
                card.insertAdjacentHTML("afterend", righthtm);
                var dragNode = $(dragNodeId);
                dragNode.parentElement.addEventListener("dragover", dragOverHandler);
                dragNode.parentElement.addEventListener("dragleave", dragLeaveHandler);
            }
            if ((card.previousElementSibling != null && card.previousElementSibling.id != selectedItem.id) ||
                card.previousElementSibling == null) {
                var dragNodeId = "dragleft_" + card.id;
                var lefthtm = "<div class=\"dragzone\"><div id=\"".concat(dragNodeId, "\" class=\"dragzone_inside dragleft\"></div></div>");
                card.insertAdjacentHTML("beforebegin", lefthtm);
                var dragNode = $(dragNodeId);
                dragNode.parentElement.addEventListener("dragover", dragOverHandler);
                dragNode.parentElement.addEventListener("dragleave", dragLeaveHandler);
            }
        });
    }, 1);
    console.log("onDragStart commit");
}
function namedEventPreventDefaultHandler(event) {
    event.preventDefault();
}
function namedEventPreventDefaultAndStopHandler(event) {
    event.preventDefault();
    event.stopPropagation();
}
function dragOverHandler(event) {
    event.preventDefault();
    event.currentTarget.classList.add("over");
}
function dragLeaveHandler(event) {
    event.preventDefault();
    event.currentTarget.classList.remove("over");
}
var View;
(function (View) {
    View[View["Hidden"] = 0] = "Hidden";
    View[View["Synthetic"] = 1] = "Synthetic";
    View[View["Stacked"] = 2] = "Stacked";
    View[View["Full"] = 3] = "Full";
})(View || (View = {}));
var CardStack = /** @class */ (function () {
    function CardStack(game, // game reference
    localsettings, // settngs reference
    bin_type, label, //label (translated) of card stack
    player_color, //color owner of stack
    card_color_class, default_view, // default layout number
    view_list) {
        if (view_list === void 0) { view_list = []; }
        this.game = game;
        this.localsettings = localsettings;
        this.bin_type = bin_type;
        this.label = label;
        this.player_color = player_color;
        this.card_color_class = card_color_class;
        this.default_view = default_view;
        this.view_list = view_list;
        this.columns_synth = 1;
        this.div_id = "stack_" + player_color + "_" + bin_type;
        this.tableau_id = "tableau_" + player_color + "_" + bin_type;
        this.current_view = parseInt(this.localsettings.readProp(this.div_id, String(default_view)));
        if (view_list.length == 0) {
            view_list.push(View.Hidden, View.Synthetic, View.Stacked, View.Full);
        }
    }
    CardStack.prototype.render = function (parent) {
        var _this = this;
        var header = _("Card Layouts");
        var htm = "\n    <div id=\"".concat(this.div_id, "\" class=\"cardstack cardstack_").concat(this.bin_type, " ").concat(this.card_color_class, "\" \n      data-currentview=\"").concat(this.current_view, "\">\n      <div class=\"stack_header\">\n        <div class=\"stack_header_left\">\n             <div id=\"cnt_cards_").concat(this.div_id, "\" class=\"stack_sum cards\"></div>\n        </div>\n        <div class=\"stack_header_middle\">\n          <div class=\"topline\">\n            <div class=\"stack_label\">").concat(this.label, "</div>\n          </div>\n          <div class=\"bottomline\">\n            <div id=\"detail_label_").concat(this.div_id, "\" class=\"stack_detail_txt actual_view\">N/A</div>\n          </div>\n        </div>\n        <div class=\"stack_header_right\">\n           <div id=\"btn_sv_").concat(this.div_id, "\" class=\"stack_btn switchview\"></div>\n        </div>\n        <div id=\"stack_dd_buttons_").concat(this.div_id, "\" class=\"stack_dd_buttons\">\n          <div id=\"stack_dd_buttons_").concat(this.div_id, "_close\" class=\"stack_dd_buttons_close\">\n            <span>").concat(header, "</span>\n            <i class=\"fa fa-close\"></i>\n          </div>\n        </div>\n      </div>          \n      <div id=\"additional_text_").concat(this.div_id, "\" class=\"stack_content_txt\"></div>\n      <div id=\"").concat(this.tableau_id, "\" class=\"stack_content cards_bin ").concat(this.bin_type, "\" style=\"--columns-synth=").concat(this.columns_synth, ";\">\n      </div>\n    </div>");
        $(parent).insertAdjacentHTML("afterbegin", htm);
        var switchButton = $("btn_sv_" + this.div_id);
        switchButton.classList.add("fa", "fa-align-justify");
        this.game.addTooltip(switchButton.id, _("Card Layouts Menu"), _("Click to select layout"));
        var cardNumButton = "cnt_cards_" + this.div_id;
        this.game.addTooltip(cardNumButton, _("Number of cards in this pile"), "");
        $(cardNumButton).addEventListener("click", function (event) {
            var parentNode = $(_this.div_id);
            var bin = parentNode.querySelector('.cards_bin');
            if (bin)
                _this.game.showHiddenContent(bin.id, _("Pile contents"));
        });
        var _loop_1 = function (i) {
            var layout = this_1.view_list[i];
            var buttonstr = "<div id=\"btn_switch_".concat(this_1.div_id, "_").concat(layout, "\" class=\"stack_btn switch_").concat(layout, "\">\n      <div id=\"ddl_icon_").concat(this_1.div_id, "_").concat(layout, "\" class=\"stack_ddl_icon\"></div><div class=\"stack_ddl_label\">").concat(this_1.getViewLabel(layout), "</div></div>");
            var laButton = dojo.place(buttonstr, "stack_dd_buttons_".concat(this_1.div_id));
            $("ddl_icon_".concat(this_1.div_id, "_").concat(layout)).classList.add("fa", this_1.getIconClass(layout));
            laButton.addEventListener("click", function () {
                _this.onSwitchView(layout);
            });
        };
        var this_1 = this;
        for (var i = 0; i < this.view_list.length; i++) {
            _loop_1(i);
        }
        $("stack_dd_buttons_".concat(this.div_id, "_close")).addEventListener("click", function (evt) {
            evt.stopPropagation();
            evt.preventDefault();
            $("stack_dd_buttons_" + _this.div_id).classList.remove("open");
        });
        switchButton.addEventListener("click", function (evt) {
            evt.stopPropagation();
            evt.preventDefault();
            _this.onViewMenu();
        });
        // this is already set during notif
        //triggered when a card is added
        //or a resource (may expand card in synth view)
        // const callback = (mutationList, observer) => {
        //   for (const mutation of mutationList) {
        //     if (mutation.type === "childList") {
        //       this.recalSynthColumns();
        //     }
        //   }
        // };
        // const observer = new MutationObserver(callback);
        // // note this currently does not fire on added resources
        // observer.observe( $(this.tableau_id), { subtree: false, childList: true });
        this.adjustFromView();
    };
    CardStack.prototype.getIconClass = function (layout) {
        switch (layout) {
            case View.Hidden:
                return "fa-window-close";
            //   case View.Summary: return  "fa fa-align-justify";
            case View.Synthetic:
                return "fa-tablet";
            case View.Stacked:
                return "fa-window-minimize";
            case View.Full:
                return "fa-window-restore";
        }
    };
    CardStack.prototype.onSwitchView = function (next) {
        var str_next = String(next);
        this.current_view = next;
        $(this.div_id).dataset.currentview = str_next;
        this.localsettings.writeProp(this.div_id, str_next);
        this.onViewMenu(true); // close menu
        this.adjustFromView();
    };
    CardStack.prototype.onViewMenu = function (close) {
        var self = $("stack_dd_buttons_" + this.div_id);
        var was_open = close;
        if (was_open === undefined) {
            was_open = false;
            if (self.classList.contains("open")) {
                was_open = true;
            }
        }
        // remove all open menus
        document.querySelectorAll(".stack_dd_buttons").forEach(function (node) {
            node.classList.remove("open");
        });
        if (!was_open)
            self.classList.add("open");
        var layout = parseInt($(this.div_id).dataset.currentview);
        var submenu = $("btn_switch_".concat(this.div_id, "_").concat(layout));
        document.querySelectorAll(".stack_btn").forEach(function (node) { return node.classList.remove("ma_selected_menu"); });
        if (submenu)
            submenu.classList.add("ma_selected_menu");
    };
    CardStack.prototype.getNextView = function (from_view) {
        for (var i = 0; i < this.view_list.length - 1; i++) {
            if (this.view_list[i] == from_view) {
                return this.view_list[i + 1];
            }
        }
        return this.view_list[0];
    };
    CardStack.prototype.reset = function () {
        this.onSwitchView(this.default_view);
    };
    CardStack.prototype.adjustFromView = function () {
        var label = "?";
        var additional_txt = "";
        label = this.getViewLabel(this.current_view);
        var toprow = "tableau_toprow_" + this.player_color;
        switch (this.current_view) {
            case View.Hidden:
                additional_txt = _("cards are hidden");
                if (!this.game.isLayoutFull()) {
                    if ($(this.div_id).parentElement.id != toprow && $(toprow)) {
                        $(toprow).appendChild($(this.div_id));
                    }
                }
                break;
            default:
                if (!this.game.isLayoutFull()) {
                    if ($(this.div_id).parentElement.id == toprow) {
                        $("tableau_" + this.player_color).appendChild($(this.div_id));
                    }
                }
                break;
        }
        if (this.card_color_class == "red" && (this.current_view == View.Full || this.current_view == View.Stacked)) {
            additional_txt = _("⚠️Events are played face down, tags are not counted.");
        }
        $("detail_label_" + this.div_id).innerHTML = label;
        $("additional_text_" + this.div_id).innerHTML = additional_txt;
        $(this.tableau_id).offsetHeight; // reflow
        if (this.current_view == View.Synthetic) {
            this.recalSynthColumns();
        }
    };
    CardStack.prototype.getViewLabel = function (view) {
        switch (view) {
            case View.Hidden:
                return _("Hidden");
            case View.Synthetic:
                if (!this.game.isLayoutFull()) {
                    return _("Synthetic");
                }
                else {
                    return _("Single");
                }
            case View.Stacked:
                return _("Stack");
            case View.Full:
                return _("Grid");
        }
        return "?";
    };
    CardStack.prototype.updateCounts = function () {
        var count = $(this.tableau_id).querySelectorAll(".card").length;
        $("cnt_cards_" + this.div_id).innerHTML = String(count);
        if (this.current_view == View.Hidden)
            $("additional_text_" + this.div_id).innerHTML = _("%n card(s) hidden").replace("%n", String(count));
        return count;
    };
    CardStack.prototype.recalSynthColumns = function () {
        //get last element of list
        if ($(this.tableau_id).children.length == 0)
            return;
        var last = $(this.tableau_id).lastElementChild;
        var lastrect = last.getBoundingClientRect();
        var tableaurect = $(this.tableau_id).getBoundingClientRect();
        var limit = 15; //in case something bad happens, limit to 15 attempts
        while (lastrect.right > tableaurect.right && limit > 0) {
            console.log("adding a new col on ".concat(this.tableau_id));
            //add one column
            this.columns_synth++;
            $(this.tableau_id).style.setProperty("--columns-synth", String(this.columns_synth));
            lastrect = last.getBoundingClientRect();
            tableaurect = $(this.tableau_id).getBoundingClientRect();
            limit--;
        }
    };
    CardStack.prototype.getDestinationDiv = function () {
        return this.tableau_id;
    };
    return CardStack;
}());
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var BIG_ANIMATION = 3;
var SMALL_ANIMATION = 2;
var NO_ANIMATION = 1;
var CustomAnimation = /** @class */ (function () {
    function CustomAnimation(game) {
        this.game = game;
        this.animations = {};
        this.slide_duration = 800;
        this.animations["grow_appear"] = {
            name: "grow_appear",
            duration: 500,
            easing: "ease-in",
            keyframes: "   \n                         0% {\n                               transform:scale(0);\n                            }\n                         80% {\n                               transform:scale(1.1);\n                            }\n                         100% {\n                               transform:scale(1);\n\n                            }\n                    "
        };
        this.animations["small_tingle"] = {
            name: "small_tingle",
            duration: 500,
            easing: "ease-in",
            keyframes: "   \n                         0% {\n                               color:white;            \n                               transform:scale(1);\n                            }\n                         80% {\n                               color:red;\n                               transform:scale(1.1);\n                            }\n                         100% {\n                               color:white;\n                               transform:scale(1);\n\n                            }\n                    "
        };
        this.animations["great_tingle"] = {
            name: "great_tingle",
            duration: 500,
            easing: "ease-in",
            keyframes: "   \n                         0% {\n                               transform:scale(1);\n                               color:white;\n                            }\n                         80% {\n                               color:red;\n                               transform:scale(2);\n                            }\n                         100% {\n                              color:white;\n                               transform:scale(1);\n\n                            }\n                    "
        };
        this.animations["pop"] = {
            name: "pop",
            duration: 250,
            easing: "ease-in",
            keyframes: "   \n                         0% {\n                               transform:scale(1);\n                            }\n                         100% {\n                               transform:scale(1.2);\n                               \n                            }\n                    "
        };
        this.animations["depop"] = {
            name: "depop",
            duration: 250,
            easing: "ease-in",
            keyframes: "   \n                         0% {\n                               transform:scale(1.2);\n                            }\n                         100% {\n                               transform:scale(1);\n                               \n                            }\n                    "
        };
        this.animations["fadein_and_drop"] = {
            name: "fadein_and_drop",
            duration: 800,
            easing: "ease-out",
            keyframes: "   \n                         0% {\n                                 transform: translateY(-1000%);\n                                 opacity:0;\n                            }\n                        50% {\n                                 opacity:1;\n                            }\n                         100% {\n                                 transform: translateY(0);\n                                 opacity:1;\n                            }\n                    "
        };
        this.animations["award_pop"] = {
            name: "award_pop",
            duration: 800,
            easing: "ease-in",
            keyframes: "   \n                         0% {\n                                transform: translateY(0) scale(1) rotateY(360deg);\n                            }\n                        100% {\n                                transform: translateY(-200%) scale(1.2) rotateY(0deg);\n                            }\n                    "
        };
        this.animations["award_depop"] = {
            name: "award_depop",
            duration: 800,
            easing: "ease-in",
            keyframes: "   \n                        0% {\n                                transform: translateY(-200%) scale(1.2)  rotateY(0deg);\n                            }\n                        100% {\n                                transform: translateY(0) scale(1) rotateY(360deg);\n                            }\n                    "
        };
        this.addAnimationsToDocument(this.animations);
    }
    CustomAnimation.prototype.getSlideDuration = function () {
        if (!this.areAnimationsPlayed())
            return 0;
        var ret = (this.slide_duration * parseInt(this.game.getSetting("animationspeed"))) / 100;
        console.log("anim is ", ret);
    };
    CustomAnimation.prototype.getWaitDuration = function (wait) {
        var ret = 0;
        if (!this.areAnimationsPlayed())
            return 0;
        ret = (wait * parseInt(this.game.getSetting("animationspeed"))) / 100;
        return ret;
    };
    CustomAnimation.prototype.getAnimationAmount = function () {
        return parseInt(this.game.getSetting("animationamount"));
    };
    CustomAnimation.prototype.setOriginalStackView = function (tableau_elem, value) {
        if (this.areAnimationsPlayed()) {
            this.waitAdjusted(1000).then(function () {
                tableau_elem.dataset.currentview = value;
            });
        }
        else {
            tableau_elem.dataset.currentview = value;
        }
    };
    CustomAnimation.prototype.animateTilePop = function (token_id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.playCssAnimation(token_id, "grow_appear", null, null, BIG_ANIMATION)];
            });
        });
    };
    CustomAnimation.prototype.animateTingle = function (counter_id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                void this.playCssAnimation("alt_" + counter_id, "small_tingle", null, null, SMALL_ANIMATION);
                return [2 /*return*/, this.playCssAnimation(counter_id, "small_tingle", null, null, SMALL_ANIMATION)];
            });
        });
    };
    CustomAnimation.prototype.animatePlaceResourceOnCard = function (resource_id, place_id) {
        return __awaiter(this, void 0, void 0, function () {
            var animate_token, div, divToken;
            var _this = this;
            return __generator(this, function (_a) {
                if (!this.areAnimationsPlayed())
                    return [2 /*return*/];
                animate_token = resource_id;
                if (!this.game.isLayoutFull())
                    animate_token = "resource_holder_".concat(place_id);
                div = $(place_id);
                divToken = $(place_id);
                return [2 /*return*/, Promise.allSettled([
                        // first animation
                        this.playCssAnimation(place_id, "pop", function () {
                            div.style.setProperty("filter", "grayscale(0)");
                        }, function () {
                            div.style.setProperty("transform", "scale(1.2)");
                        }, BIG_ANIMATION).finally(function () {
                            return _this.playCssAnimation(place_id, "depop", function () {
                                div.style.setProperty("transform", "scale(1.2)");
                            }, function () {
                                div.style.removeProperty("filter");
                                div.style.removeProperty("transform");
                            }, BIG_ANIMATION);
                        }),
                        // second animation
                        this.playCssAnimation(animate_token, "great_tingle", function () {
                            divToken.style.setProperty("z-index", "1000");
                        }, function () {
                            divToken.style.removeProperty("z-index");
                        }, SMALL_ANIMATION)
                    ])];
            });
        });
    };
    CustomAnimation.prototype.animateRemoveResourceFromCard = function (resource_id, card_id) {
        return __awaiter(this, void 0, void 0, function () {
            var animate_token;
            return __generator(this, function (_a) {
                if (!this.areAnimationsPlayed())
                    return [2 /*return*/];
                animate_token = card_id !== null && card_id !== void 0 ? card_id : $(resource_id).parentElement.id;
                if (animate_token.includes("tableau")) {
                    //too late, resource is not on card anymore
                    return [2 /*return*/];
                }
                return [2 /*return*/];
            });
        });
    };
    CustomAnimation.prototype.animatePlaceMarker = function (marker_id, place_id) {
        return __awaiter(this, void 0, void 0, function () {
            var unclip, p_start, p_mid;
            var _this = this;
            return __generator(this, function (_a) {
                if (!this.areAnimationsPlayed())
                    return [2 /*return*/];
                unclip = [];
                if (place_id.startsWith("tile")) {
                    unclip.push(place_id);
                    unclip.push($(place_id).parentElement.id);
                }
                if ((place_id.startsWith("award_") || place_id.startsWith("milestone")) && !this.game.isLayoutFull()) {
                    p_start = this.playCssAnimation(place_id, "award_pop", function () {
                        dojo.style(marker_id, "opacity", "0");
                        $(place_id).setAttribute("style", "box-shadow: none !important;");
                    }, function () {
                        $(place_id).setAttribute("style", "transform: translateY(-200%) scale(1.2); box-shadow: none !important;");
                    }, BIG_ANIMATION);
                }
                else {
                    p_start = this.getImmediatePromise();
                }
                p_mid = p_start.then(function () {
                    return _this.playCssAnimation(marker_id, "fadein_and_drop", function () {
                        dojo.style(marker_id, "z-index", "10");
                        dojo.style(marker_id, "opacity", "");
                        for (var _i = 0, unclip_1 = unclip; _i < unclip_1.length; _i++) {
                            var item = unclip_1[_i];
                            $(item).setAttribute("style", "clip-path: none; outline: none; box-shadow: none !important; background-color: revert;");
                        }
                    }, function () {
                        dojo.style(marker_id, "z-index", "");
                        for (var _i = 0, unclip_2 = unclip; _i < unclip_2.length; _i++) {
                            var item = unclip_2[_i];
                            $(item).setAttribute("style", "");
                        }
                    }, SMALL_ANIMATION);
                });
                if ((place_id.startsWith("award_") || place_id.startsWith("milestone")) && !this.game.isLayoutFull()) {
                    return [2 /*return*/, p_mid.then(function () {
                            return _this.playCssAnimation(place_id, "award_depop", function () {
                                $(place_id).setAttribute("style", "box-shadow: none !important;");
                            }, function () {
                                $(place_id).setAttribute("style", "");
                            }, BIG_ANIMATION);
                        })];
                }
                return [2 /*return*/];
            });
        });
    };
    CustomAnimation.prototype.animateMapItemAwareness = function (item_id) {
        return __awaiter(this, void 0, void 0, function () {
            var div;
            var _this = this;
            return __generator(this, function (_a) {
                div = $(item_id);
                return [2 /*return*/, this.playCssAnimation(item_id, "pop", function () {
                        div.style.setProperty("z-index", "1000");
                    }, function () {
                        div.style.setProperty("transform", "scale(1.2)");
                    }, BIG_ANIMATION).finally(function () {
                        return _this.playCssAnimation(item_id, "depop", function () {
                            div.style.setProperty("transform", "scale(1.2)");
                        }, function () {
                            div.style.removeProperty("z-index");
                            div.style.removeProperty("transform");
                        }, BIG_ANIMATION);
                    })];
            });
        });
    };
    CustomAnimation.prototype.moveResources = function (tracker, qty) {
        return __awaiter(this, void 0, void 0, function () {
            var trk_item, delay, mark, htm, singleDur, sequenceDur, _loop_2, this_2, i;
            var _this = this;
            return __generator(this, function (_a) {
                if (!this.areAnimationsPlayed())
                    return [2 /*return*/];
                if (qty == undefined || qty == 0)
                    return [2 /*return*/];
                trk_item = tracker.replace("tracker_", "").split("_")[0];
                delay = 0;
                mark = "";
                if (Math.abs(qty) > 3) {
                    mark = String(Math.abs(qty));
                    qty = -1;
                }
                htm = '<div id="%t" class="resmover">' + CustomRenders.parseActionsToHTML(trk_item, mark) + "</div>";
                singleDur = this.getWaitDuration(500);
                sequenceDur = this.getWaitDuration(200);
                _loop_2 = function (i) {
                    var tmpid = "tmp_" + String(Math.random() * 1000000000);
                    var visiblenode = "";
                    if (dojo.style("gameaction_status_wrap", "display") != "none") {
                        visiblenode = "gameaction_status";
                    }
                    else if (dojo.style("pagemaintitle_wrap", "display") != "none") {
                        visiblenode = "pagemaintitletext";
                    }
                    var fnode = visiblenode != "" ? $(visiblenode).querySelector(".token_img.tracker_" + trk_item) : null;
                    if (fnode) {
                        dojo.place('<div id="move_from_' + tmpid + '" class="topbar_movefrom"></div>', fnode);
                    }
                    else {
                        dojo.place('<div id="move_from_' + tmpid + '" class="topbar_movefrom"></div>', "thething");
                    }
                    var origin_1 = qty > 0 ? "move_from_" + tmpid : tracker.replace("tracker_", "alt_tracker_");
                    var destination = qty > 0 ? tracker.replace("tracker_", "alt_tracker_") : "move_from_" + tmpid;
                    if (!$(origin_1) && origin_1.startsWith("alt_"))
                        origin_1 = tracker;
                    if (!$(destination) && destination.startsWith("alt_"))
                        destination = tracker;
                    dojo.place(htm.replace("%t", tmpid), origin_1);
                    this_2.wait(delay).then(function () {
                        var tempNode = $(tmpid);
                        if (tempNode) {
                            if (destination.startsWith("move_from_") && !dojo.byId(destination)) {
                                dojo.place('<div id="move_from_' + tmpid + '" class="topbar_movefrom"></div>', "thething");
                            }
                            _this.game.slideAndPlace(tempNode, destination, singleDur, undefined, function () {
                                dojo.destroy(tempNode);
                                dojo.destroy("move_from_" + tmpid);
                            });
                        }
                    });
                    delay += sequenceDur;
                };
                this_2 = this;
                for (i = 0; i < Math.abs(qty); i++) {
                    _loop_2(i);
                }
                return [2 /*return*/, this.wait(Math.max(delay + singleDur, 900))]; // no more than 900ms to not cause timeout
            });
        });
    };
    CustomAnimation.prototype.addAnimationsToDocument = function (animations) {
        if ($("css_animations"))
            return;
        var head = document.getElementsByTagName("head")[0];
        var s = document.createElement("style");
        s.setAttribute("type", "text/css");
        s.setAttribute("id", "css_animations");
        var css = "";
        for (var _i = 0, _a = Object.keys(animations); _i < _a.length; _i++) {
            var idx = _a[_i];
            var anim = animations[idx];
            css = css + ".anim_" + anim.name + " {\n";
            //  css = css + ' animation: key_anim_' + anim.name + ' ' + anim.duration + 'ms ' + anim.easing + ';\n'
            css =
                css +
                    " animation: key_anim_" +
                    anim.name +
                    " calc(var(--localsetting_animationspeed) * " +
                    anim.duration / 100 +
                    "ms) " +
                    anim.easing +
                    ";\n";
            css = css + "}\n";
            css = css + "@keyframes key_anim_" + anim.name + " {\n";
            css = css + anim.keyframes;
            css = css + "}\n";
        }
        s.innerHTML = css;
        head.appendChild(s);
    };
    CustomAnimation.prototype.areAnimationsPlayed = function () {
        //if(this.game.animated) return true;
        if (this.game.instantaneousMode)
            return false;
        if (this.game.isDoingSetup)
            return false;
        if (this.getAnimationAmount() < SMALL_ANIMATION)
            return false;
        if (document.hidden || document.visibilityState === "hidden")
            return false;
        return true;
    };
    //"fake" promise, made to use as functional empty default
    CustomAnimation.prototype.getImmediatePromise = function () {
        return Promise.resolve("");
    };
    //return a timed promise
    CustomAnimation.prototype.wait = function (ms) {
        return new Promise(function (resolve, reject) {
            setTimeout(function () { return resolve(""); }, ms);
        });
    };
    CustomAnimation.prototype.waitAdjusted = function (ms) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var msa = _this.getWaitDuration(ms);
            setTimeout(function () { return resolve(""); }, msa);
        });
    };
    //Adds css class on element, plays it, executes onEnd and removes css class
    //a promise is returned for easy chaining
    CustomAnimation.prototype.playCssAnimation = function (targetId, animationname, onStart, onEnd, minLevel) {
        if (minLevel === void 0) { minLevel = 2; }
        return __awaiter(this, void 0, void 0, function () {
            var animation, cssClass, resolvedOK, adjDuration, cleanUp;
            return __generator(this, function (_a) {
                if (!$(targetId))
                    return [2 /*return*/];
                if (!this.areAnimationsPlayed())
                    return [2 /*return*/];
                if (this.getAnimationAmount() < minLevel)
                    return [2 /*return*/];
                animation = this.animations[animationname];
                cssClass = "anim_" + animation.name;
                resolvedOK = false;
                adjDuration = this.getWaitDuration(animation.duration);
                // console.log(`*** anim ${animationname} started for ${targetId} of ${animation.duration} ms (${adjDuration} ms)`);
                if (adjDuration <= 0)
                    return [2 /*return*/];
                cleanUp = function (e, kind) {
                    if (kind === void 0) { kind = "callback"; }
                    if (resolvedOK)
                        return;
                    resolvedOK = true;
                    if ($(targetId)) {
                        $(targetId).removeEventListener("animationend", cleanUp);
                        $(targetId).classList.remove(cssClass);
                    }
                    //console.log(`*** anim ${animationname} for ${targetId} onEnd`);
                    safeCall(onEnd);
                    //console.log(`*** anim ${animationname} for ${targetId} resolved with ${kind}`);
                };
                //console.log(`*** anim ${animationname} for ${targetId} onStart`);
                safeCall(onStart);
                $(targetId).addEventListener("animationend", cleanUp);
                $(targetId).classList.add(cssClass);
                // this.MAIN.log('+anim',animationname,'starting playing');
                //timeout security
                setTimeout(function () { return cleanUp(undefined, "timeout"); }, adjDuration * 1.5);
                return [2 /*return*/, this.wait(adjDuration)];
            });
        });
    };
    return CustomAnimation;
}());
function safeCall(handler) {
    if (handler) {
        try {
            handler();
        }
        catch (e) {
            console.error(e);
        }
    }
}
/* Module for rendering  card effects, powers , etc
 *
 */
var CustomRenders = /** @class */ (function () {
    function CustomRenders() {
    }
    CustomRenders.updateUIFromCorp = function (key) {
        switch (key) {
            case "card_corp_12":
                //add discount to stanproj_2 ui;
                if ($("card_stanproj_2")) {
                    var node = $("card_stanproj_2");
                    if (node) {
                        node.dataset.cost = "8";
                        node.classList.add("discounted");
                    }
                }
                break;
        }
    };
    CustomRenders.parseExprToHtml = function (expr, card_num, action_mode, effect_mode) {
        if (action_mode === void 0) { action_mode = false; }
        if (effect_mode === void 0) { effect_mode = false; }
        var rethtm = "";
        if (!expr || expr.length < 1)
            return "";
        if (!action_mode && !effect_mode) {
            if (card_num && this["customcard_rules_" + card_num]) {
                return this["customcard_rules_" + card_num]();
            }
        }
        else if (action_mode == true) {
            if (card_num && this["customcard_action_" + card_num]) {
                return this["customcard_action_" + card_num]();
            }
        }
        else if (effect_mode == true) {
            if (card_num && this["customcard_effect_" + card_num]) {
                return this["customcard_effect_" + card_num]();
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
                        if (card_num == 105)
                            parse.qty = -3;
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
            rethtm += "</div></div>";
            if (action_mode == true)
                rethtm += '<div class="action_arrow"></div>';
            else
                rethtm += '<div class="effect_separator">:</div>';
            rethtm += '<div class="card_icono icono_gains cnt_gains"><div class="outer_gains">';
            rethtm += this.parseRulesToHtmlBlock(gains);
            rethtm += "</div></div>";
        }
        else {
            //rules mode
            var blocks = 0;
            //losses first
            if (losses.length > 0) {
                rethtm += '<div class="card_icono icono_losses cnt_losses"><div class="outer_gains"><div class="plusminus">-</div>';
                rethtm += this.parseRulesToHtmlBlock(losses);
                rethtm += "</div></div>";
                blocks++;
            }
            if (prodgains.length > 0 || prodlosses.length > 0) {
                rethtm += '<div class="card_icono icono_prod"><div class="outer_production">';
                if (prodlosses.length > 0) {
                    rethtm += '<div class="production_line cnt_losses"><div class="plusminus">-</div>';
                    rethtm += this.parseRulesToHtmlBlock(prodlosses);
                    rethtm += "</div>";
                }
                if (prodgains.length > 0) {
                    rethtm += '<div class="production_line cnt_gains">';
                    if (prodlosses.length > 0 && !action_mode)
                        rethtm += '<div class="plusminus">+</div>';
                    rethtm += this.parseRulesToHtmlBlock(prodgains);
                    rethtm += "</div>";
                }
                rethtm += "</div></div>";
                blocks++;
            }
            if (gains.length > 0) {
                rethtm += '<div class="card_icono icono_gains cnt_gains"><div class="outer_gains">';
                if (losses.length > 0)
                    rethtm += '<div class="plusminus">+</div>';
                rethtm += this.parseRulesToHtmlBlock(gains);
                rethtm += "</div></div>";
                blocks++;
            }
        }
        return rethtm;
    };
    CustomRenders.parseExprToText = function (expr, game) {
        if (!expr)
            return "";
        if (!Array.isArray(expr)) {
            expr = [expr];
        }
        var op = expr[0];
        var min = expr.length > 1 ? expr[1] : "1";
        var max = expr.length > 2 ? expr[2] : "1";
        var arg = expr.length > 3 ? expr[3] : "";
        if (expr.length == 1) {
            arg = op;
            op = "!";
        }
        if (op == "!") {
            var opId = "op_".concat(arg);
            if (arg.includes("ores")) {
                arg = arg.replace("ores(Microbe)", "resMicrobe");
                arg = arg.replace("ores(Animal)", "resAnimal");
                arg = arg.replace("ores(Floater)", "resFloater");
                arg = arg.replace("ores(Floater,Jovian)", "resFloater");
                opId = arg;
            }
            if (min == 1)
                return game.getTokenName(opId);
            return game.getTokenName(opId) + " x " + min;
        }
        return JSON.stringify(expr);
    };
    CustomRenders.parseExprItem = function (expr, depth) {
        if (!expr)
            return [];
        if (!Array.isArray(expr)) {
            expr = [expr];
        }
        var items = [];
        var op = expr[0];
        var min = expr.length > 1 ? expr[1] : "";
        var max = expr.length > 2 ? expr[2] : "";
        var arg1 = expr.length > 3 ? expr[3] : "";
        //simple op, one resource gain
        if (expr.length == 1) {
            //special patch
            if (op == "play_cardSpaceEvent") {
                items.push(this.getParse("tagSpace", depth));
                items.push(this.getParse("tagEvent", depth));
            }
            else if (op == "acard5") {
                items.push(this.getParse("tagMicrobe", depth));
                items.push(this.getParse("star", depth));
                items.push(this.getParse("twopoints", depth));
                items.push(this.getParse("res_Science", depth));
            }
            else {
                items.push(this.getParse(op, depth));
            }
        }
        else if (op == "!") {
            if (arg1 != "") {
                var item = this.getParse(arg1, depth);
                if (item != null) {
                    item.qty = max;
                    items.push(item);
                }
            }
        }
        else if ((op == "," || op == "+") && arg1.includes("counter(")) {
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
        else if (op == "," || op == ";" || op == "+") {
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
                var lastOr = null;
                for (var _d = 0, _e = this.parseExprItem(expr[i], depth + 1); _d < _e.length; _d++) {
                    var ret = _e[_d];
                    if (ret != null) {
                        items.push(ret);
                        lastOr = ret;
                    }
                }
                if (lastOr) {
                    lastOr.divider = "OR";
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
        if (item.includes("counter(")) {
            item = item.replace("counter(", "").replace(")", "");
        }
        item = item.replace("ores(Microbe)", "ores_Microbe");
        item = item.replace("ores(Animal)", "ores_Animal");
        item = item.replace("ores(Floater)", "ores_Floater");
        item = item.replace("ores(Floater,Jovian)", "ores_Floater");
        item = item.replace("counter('(tagPlant>=3)*4')", "special_tagplant_sup3");
        item = item.replace("tagMicrobe/2", "special_tagmicrobe_half");
        item = item.replace("ph,0", "ph");
        item = item.replace(/\([^)]*\)/g, "(*)");
        if (this.parses[item]) {
            parse = Object.assign({}, this.parses[item]);
        }
        else if (this.parses[item.replace("_Any", "")]) {
            parse = Object.assign({}, this.parses[item.replace("_Any", "")]);
            parse.redborder = "resource";
        }
        else if (this.parses[item.replace("play_", "")]) {
            parse = Object.assign({}, this.parses[item.replace("play_", "")]);
        }
        else if (this.parses[item.replace("place_", "")]) {
            parse = Object.assign({}, this.parses[item.replace("place_", "")]);
            if (!item.includes("forest"))
                parse.redborder = "hex";
        }
        else if (this.parses[item.replace("(*)", "")]) {
            parse = Object.assign({}, this.parses[item.replace("(*)", "")]);
            parse.after = "*";
        }
        else {
            //unknown parse
            //this.darhflog('UNKNOWN PARSE :',item);
            parse = { class: "unknown", content: item };
        }
        parse.depth = depth;
        return parse;
    };
    CustomRenders.parseRulesToHtmlBlock = function (items) {
        var rethtm = "";
        var foundor = false;
        for (var _i = 0, items_2 = items; _i < items_2.length; _i++) {
            var n = items_2[_i];
            if (n.item.divider && n.item.divider == "OR") {
                if (!foundor) {
                    foundor = true;
                    //  rethtm+='<div class="breaker"></div>';
                }
                else {
                    rethtm += _("OR") + "&nbsp;";
                }
            }
            //if (n.qty>1) rethtm+=n.qty+'&nbsp;';
            if (n.item.group && n.item.group == "FOREACH" && items[0] != n)
                rethtm += "&nbsp;/&nbsp;";
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
                content = "X";
        }
        else if (qty != null && (qty > 3 || item.norepeat == true)) {
            ret = qty + "&nbsp;";
        }
        else if (qty == -99) {
            ret = ret + "X&nbsp;";
        }
        var before = item.before != undefined ? '<div class="before">' + item.before + "</div>&nbsp;" : "";
        var after = item.after != undefined ? item.after : "";
        //little resource for nmu & nms
        if (item.exp) {
            after = '<div class="resource_exponent"><div class="' + item.exp + '"></div></div>';
        }
        var resicon = '<div class="cnt_media ' + item.classes + " depth_" + item.depth + '">' + content + "</div>";
        if (after)
            after = '<div class="after">' + after + "</div>";
        if (item.redborder) {
            var cc = "redborder_".concat(item.redborder);
            resicon = before + "<div class=\"outer_redborder ".concat(cc, "\">") + resicon + after + "</div>";
        }
        else {
            resicon = before + resicon + after;
        }
        if (item.production === true) {
            resicon = '<div class="outer_production">' + resicon + "</div>";
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
                var after_1 = item.after != undefined ? item.after : "";
                if (item.production === true) {
                    finds[idx] = '<div class="outer_production"><div class="' + item.classes + '">' + content + "</div>" + after_1 + "</div>";
                }
                else if (item.redborder) {
                    finds[idx] =
                        '<div class="outer_redborder redborder_' +
                            item.redborder +
                            '"><div class="' +
                            item.classes +
                            '">' +
                            content +
                            "</div>" +
                            after_1 +
                            "</div>";
                }
                else {
                    finds[idx] = '<div class="' + item.classes + '">' + content + "</div>" + after_1;
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
        if (typeof pre === "string") {
            op = ">=";
            what = pre;
            qty = 1;
        }
        else if (Array.isArray(pre)) {
            if (pre.length < 3) {
                return "?";
            }
            else {
                op = pre[0];
                what = pre[1];
                qty = pre[2];
            }
            if (typeof what !== "string") {
                what = this.parsePrereqToHTML(what);
            }
        }
        else if (!pre) {
            return "";
        }
        else {
            return "?";
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
            prefix = _("max") + " ";
        }
        var qtys;
        qtys = qty.toString();
        if (qty == 0 && what != "o" && what != "t")
            qtys = "";
        var htm = '<div class="prereq_content mode_' + mode + '">' + prefix + qtys + suffix + icon + "</div></div>";
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
        else if (Array.isArray(pre)) {
            if (pre.length < 3) {
                return "?";
            }
            else {
                op = pre[0];
                what = pre[1];
                qty = pre[2];
            }
            if (typeof what !== "string") {
                what = this.parsePrereqToText(what, game);
            }
        }
        else if (!pre) {
            return "";
        }
        else {
            return "?";
        }
        var mode = "min";
        if (op == "<=") {
            mode = "max";
        }
        var ret = "";
        switch (what) {
            case "o":
                ret = mode == "min" ? _("Requires $v% Oxygen.") : _("Oxygen must be $v% or less.");
                break;
            case "t":
                ret = mode == "min" ? _("Requires $v°C or warmer.") : _("It must be $v°C or colder.");
                break;
            case "w":
                ret = mode == "min" ? _("Requires $v ocean tiles.") : _("$v ocean tiles or less.");
                break;
            case "forest":
                if (qty == 0)
                    qty = 1;
                if (qty == 1)
                    ret = _("Requires that you have a greenery tile.");
                else
                    ret = _("Requires $v greenery tiles.");
                break;
            case "all_city":
                ret = _("Requires $v cities in play.");
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
                if (what.startsWith("res")) {
                    ret = _("Requires that you have $v $res resources.").replace("$res", game.getTokenName(what));
                }
                else {
                    var tr = "tracker_" + what;
                    var name_2 = game.getTokenName(tr);
                    if (!name_2 || name_2 === tr)
                        name_2 = game.getTokenName(what);
                    if (mode == "min") {
                        if (qty <= 1) {
                            ret = _("Requires that you have $res.").replace("$res", name_2);
                        }
                        else {
                            ret = _("Requires that you have $res times $v.").replace("$res", name_2);
                        }
                    }
                    else {
                        ret = _("Requires that you have at most $v $res.").replace("$res", name_2);
                    }
                }
                break;
        }
        ret = ret.replace("$v", String(qty));
        return ret;
    };
    //custom card stuff
    CustomRenders.customcard_vp_5 = function () {
        return this.parseSingleItemToHTML(this.getParse("res_Science", 0), 1) + '<div class="vp_qty">*:3</div>';
    };
    CustomRenders.customcard_action_6 = function () {
        return ('<div class="groupline">' +
            this.parseSingleItemToHTML(this.getParse(":", 0), 1) +
            _("ACTION:LOOK AT THE TOP CARD AND EITHER BUY IT OR DISCARD IT") +
            "</div>");
    };
    CustomRenders.customcard_action_7 = function () {
        return '<div class="card_icono icono_losses cnt_losses"><div class="outer_gains"><div class="cnt_media token_img tracker_e depth_1"></div></div></div><div class="action_arrow"></div><div class="card_icono icono_gains cnt_gains"><div class="outer_gains"><div class="cnt_media token_img tracker_m depth_2">1</div> / <div class="outer_redborder redborder_hex"><div class="cnt_media tracker tracker_city depth_2"></div></div>*</div></div>';
    };
    CustomRenders.customcard_vp_8 = function () {
        return '<div class="vp_qty">1/</div>' + this.parseSingleItemToHTML(this.getParse("w", 0), 1) + '<div class="vp_qty">*</div>';
    };
    CustomRenders.customcard_vp_12 = function () {
        return '<div class="vp_qty">1/</div>' + this.parseSingleItemToHTML(this.getParse("tagJovian", 0), 1);
    };
    CustomRenders.customcard_vp_24 = function () {
        return '<div class="vp_qty">1/</div>' + this.parseSingleItemToHTML(this.getParse("res_Animal", 0), 1);
    };
    CustomRenders.customcard_effect_25 = function () {
        return '<div class="card_icono icono_losses cnt_losses"><div class="outer_gains"><div class="cnt_media tracker badge tracker_tagSpace depth_1"></div></div></div><div class="effect_separator">:</div><div class="card_icono icono_gains cnt_gains"><div class="outer_gains"><div class="cnt_media token_img tracker_m depth_1">-2</div></div></div>';
    };
    CustomRenders.customcard_vp_28 = function () {
        return '<div class="vp_qty">1/</div><div class="cnt_media token_img tracker_resFighter depth_1"></div>';
    };
    CustomRenders.customcard_action_33 = function () {
        return ('<div class="groupline">' +
            this.parseSingleItemToHTML(this.getParse(":"), 1) +
            this.parseSingleItemToHTML(this.getParse("res_Microbe"), 1) +
            "</div>" +
            '<div class="groupline">OR&nbsp;' +
            this.parseSingleItemToHTML(this.getParse("res_Microbe"), 2) +
            this.parseSingleItemToHTML(this.getParse(":"), 1) +
            this.parseSingleItemToHTML(this.getParse("o"), 1) +
            "</div>");
    };
    CustomRenders.customcard_action_34 = function () {
        return ('<div class="groupline">' +
            this.parseSingleItemToHTML(this.getParse(":", 0), 1) +
            this.parseSingleItemToHTML(this.getParse("res_Microbe", 0), 1) +
            "</div>" +
            '<div class="groupline">OR&nbsp;' +
            this.parseSingleItemToHTML(this.getParse("res_Microbe", 1), 2) +
            this.parseSingleItemToHTML(this.getParse(":", 0), 1) +
            this.parseSingleItemToHTML(this.getParse("t", 0), 1) +
            "</div>");
    };
    CustomRenders.customcard_vp_35 = function () {
        return '<div class="vp_qty">1/2</div>' + this.parseSingleItemToHTML(this.getParse("res_Microbe", 0), 1);
    };
    CustomRenders.customcard_rules_37 = function () {
        return ('<div class="card_icono icono_prod">' +
            '<div class="outer_production">' +
            '<div class="groupline">' +
            this.parseSingleItemToHTML(this.getParse("pp"), 1) +
            "&nbsp;OR" +
            "</div>" +
            '<div class="groupline">' +
            "3&nbsp;" +
            this.parseSingleItemToHTML(this.getParse("tagPlant"), 1) +
            ":" +
            this.parseSingleItemToHTML(this.getParse("pp", 0), 4) +
            "</div>" +
            "</div>" +
            "</div>" +
            '<div class="card_icono icono_gains cnt_gains">' +
            '<div class="outer_gains">' +
            this.parseSingleItemToHTML(this.getParse("tr", 0), 2) +
            this.parseSingleItemToHTML(this.getParse("t", 0), 1) +
            "</div>" +
            "</div>");
    };
    CustomRenders.customcard_vp_49 = function () {
        return '<div class="vp_qty">1/4</div>' + this.parseSingleItemToHTML(this.getParse("res_Microbe", 0), 1);
    };
    CustomRenders.customcard_rules_50 = function () {
        return ('<div class="card_icono icono_gains cnt_gains">' +
            '<div class="outer_gains">' +
            '              <div class="plusminus">-</div>' +
            '              2&nbsp;<div class="outer_redborder redborder_resource">' +
            '                        <div class="cnt_media token_img tracker_resAnimal depth_1"></div>' +
            "                     </div>" +
            "&nbsp;0R&nbsp;" +
            '            <div class="plusminus">-</div>' +
            "            5&nbsp;" +
            '            <div class="outer_redborder redborder_resource">' +
            '                <div class="cnt_media token_img tracker_p depth_1"></div>' +
            "            </div>" +
            "          </div>" +
            "     </div>");
        //  '<div class="card_tt">'+_('Remove up to 2 animals or 5 plants from any player.')+'</div>';
    };
    CustomRenders.customcard_vp_52 = function () {
        return '<div class="vp_qty">1/</div>' + this.parseSingleItemToHTML(this.getParse("res_Animal", 0), 1);
    };
    CustomRenders.customcard_vp_54 = function () {
        return '<div class="vp_qty">1/2</div>' + this.parseSingleItemToHTML(this.getParse("res_Animal", 0), 1);
    };
    CustomRenders.customcard_action_69 = function () {
        return ('<div class="card_action_line card_action_icono"><div class="card_icono icono_losses cnt_losses"><div class="outer_gains">' +
            this.parseSingleItemToHTML(this.getParse("p", 0), 1) +
            "&nbsp;/&nbsp;" +
            this.parseSingleItemToHTML(this.getParse("s", 0), 1) +
            '</div></div><div class="action_arrow"></div><div class="card_icono icono_gains cnt_gains"><div class="outer_gains">' +
            this.parseSingleItemToHTML(this.getParse("m", 0), 7) +
            "</div></div></div>");
    };
    CustomRenders.customcard_action_71 = function () {
        return ('<div class="card_action_line card_action_icono"><div class="card_icono">' +
            '<div class="outer_gains">' +
            this.parseSingleItemToHTML(this.getParse("u", 0), 1) +
            "&nbsp;:&nbsp;+" +
            this.parseSingleItemToHTML(this.getParse("m", 0), 1) +
            "</div>" +
            '<div class="outer_gains">' +
            this.parseSingleItemToHTML(this.getParse("s", 0), 1) +
            "&nbsp;:&nbsp;+" +
            this.parseSingleItemToHTML(this.getParse("m", 0), 1) +
            "</div>" +
            "</div></div>");
    };
    CustomRenders.customcard_vp_72 = function () {
        return '<div class="vp_qty">1/</div>' + this.parseSingleItemToHTML(this.getParse("res_Animal", 0), 1);
    };
    CustomRenders.customcard_effect_74 = function () {
        return ('<div class="groupline">' +
            this.parseSingleItemToHTML(this.getParse("tagPlant", 0), 1) +
            "/" +
            this.parseSingleItemToHTML(this.getParse("tagMicrobe", 0), 1) +
            "/" +
            this.parseSingleItemToHTML(this.getParse("tagAnimal", 0), 1) +
            "&nbsp;:&nbsp;" +
            this.parseSingleItemToHTML(this.getParse("p", 0), 1) +
            "/" +
            this.parseSingleItemToHTML(this.getParse("res_Microbe", 0), 1) +
            '<div class="resource_exponent">*</div>/' +
            this.parseSingleItemToHTML(this.getParse("res_Animal", 0), 1) +
            '<div class="resource_exponent">*</div>' +
            "</div>");
    };
    CustomRenders.customcard_vp_81 = function () {
        return '<div class="vp_qty">1/</div>' + this.parseSingleItemToHTML(this.getParse("tagJovian", 0), 1);
    };
    CustomRenders.customcard_vp_85 = function () {
        return ('<div class="vp_qty">1/</div><div class="outer_redborder redborder_hex"><div class="cnt_media tracker tracker_city depth_2"></div></div>' +
            '<div class="vp_qty">*</div>');
    };
    CustomRenders.customcard_rules_86 = function () {
        return ('<div class="groupline">' +
            _("COPY A %i").replace("%i", '<div class="card_icono icono_prod"><div class="outer_production"><div class="production_line cnt_gains"><div class="outer_production"><div class="badge tag_Building"></div></div></div></div></div>') +
            "</div>");
    };
    CustomRenders.customcard_vp_92 = function () {
        return '<div class="vp_qty">1/</div>' + this.parseSingleItemToHTML(this.getParse("tagJovian", 0), 1);
    };
    CustomRenders.customcard_vp_95 = function () {
        return '<div class="vp_qty">2/</div>' + this.parseSingleItemToHTML(this.getParse("res_Science", 0), 1);
    };
    CustomRenders.customcard_rules_102 = function () {
        return ('<div class="groupline"><div class="card_icono icono_prod"><div class="outer_production"><div class="production_line cnt_gains"><div class="outer_production">' +
            this.parseSingleItemToHTML(this.getParse("e", 0), 1) +
            "&nbsp;/&nbsp;" +
            this.parseSingleItemToHTML(this.getParse("tagEnergy", 0), 1) +
            "</div></div></div></div></div>");
    };
    CustomRenders.customcard_action_110 = function () {
        return ('<div class="action_arrow"></div><div class="outer_gains">' +
            _("ACTION : LOOK AT THE TOP CARD AND EITHER BUY IT OR DISCARD IT") +
            "</div>");
    };
    CustomRenders.customcard_rules_121 = function () {
        return ('<div class="card_icono icono_losses cnt_losses"><div class="outer_gains"><div class="plusminus">-</div>3<div class="outer_redborder redborder_resource">' +
            this.parseSingleItemToHTML(this.getParse("u", 0), 1) +
            '</div>&nbsp;OR&nbsp;4&nbsp;<div class="outer_redborder redborder_resource">' +
            this.parseSingleItemToHTML(this.getParse("s", 0), 1) +
            '</div>OR&nbsp;<div class="plusminus">-</div><div class="outer_redborder redborder_resource">' +
            this.parseSingleItemToHTML(this.getParse("m", 0), 7) +
            '</div></div></div><div class="card_icono icono_gains cnt_gains"></div>');
    };
    CustomRenders.customcard_rules_124 = function () {
        return ('<div class="card_icono icono_losses cnt_losses"><div class="outer_gains">' +
            _("STEAL") +
            '&nbsp;2&nbsp;<div class="outer_redborder redborder_resource">' +
            this.parseSingleItemToHTML(this.getParse("s", 0), 1) +
            '</div></div><div class="outer_gains">' +
            _("OR STEAL ") +
            '&nbsp;<div class="outer_redborder redborder_resource">' +
            this.parseSingleItemToHTML(this.getParse("m", 0), 3) +
            "</div></div></div>");
    };
    CustomRenders.customcard_effect_128 = function () {
        return ('<div class="groupline">' +
            this.parseSingleItemToHTML(this.getParse("tagPlant", 0), 1) +
            "&nbsp;/&nbsp;" +
            this.parseSingleItemToHTML(this.getParse("tagAnimal", 0), 1) +
            "&nbsp;:&nbsp;" +
            this.parseSingleItemToHTML(this.getParse("res_Animal", 0), 1) +
            "</div>");
    };
    CustomRenders.customcard_vp_128 = function () {
        return '<div class="vp_qty">1/2</div>' + this.parseSingleItemToHTML(this.getParse("res_Animal", 0), 1);
    };
    CustomRenders.customcard_effect_131 = function () {
        return ('<div class="groupline">' +
            this.parseSingleItemToHTML(this.getParse("tagPlant", 0), 1) +
            "&nbsp;/&nbsp;" +
            this.parseSingleItemToHTML(this.getParse("tagAnimal", 0), 1) +
            "&nbsp;/&nbsp;" +
            this.parseSingleItemToHTML(this.getParse("tagMicrobe", 0), 1) +
            "&nbsp;:&nbsp;" +
            this.parseSingleItemToHTML(this.getParse("res_Microbe", 0), 1) +
            "</div>");
    };
    CustomRenders.customcard_vp_131 = function () {
        return '<div class="vp_qty">1/3</div>' + this.parseSingleItemToHTML(this.getParse("res_Microbe", 0), 1);
    };
    CustomRenders.customcard_rules_143 = function () {
        return ('<div class="card_icono icono_gains cnt_gains">' +
            this.parseSingleItemToHTML(this.getParse("w"), 1) +
            this.parseSingleItemToHTML(this.getParse("draw"), 2) +
            "&nbsp;&nbsp;" +
            this.parseSingleItemToHTML(this.getParse("p", 0), 5) +
            "&nbsp;/&nbsp;" +
            this.parseSingleItemToHTML(this.getParse("res_Animal", 0), 4) +
            "*" +
            "</div>");
    };
    CustomRenders.customcard_vp_147 = function () {
        return '<div class="vp_qty">1/2</div>' + this.parseSingleItemToHTML(this.getParse("res_Animal", 0), 1);
    };
    CustomRenders.customcard_rules_152 = function () {
        return ('<div class="card_icono icono_prod"><div class="outer_production"><div class="production_line cnt_losses"><div class="plusminus">-</div>X&nbsp;<div class="outer_production">' +
            this.parseSingleItemToHTML(this.getParse("h", 0), 1) +
            '</div><div class="plusminus">+</div><div class="outer_production"><div class="cnt_media token_img tracker_m depth_2">X</div></div></div></div></div>');
    };
    CustomRenders.customcard_rules_153 = function () {
        return ('<div class="groupline">' +
            '<div class="prereq_content mode_min">' +
            this.parseSingleItemToHTML(this.getParse("o", 0), 1) +
            "&nbsp;/&nbsp;" +
            this.parseSingleItemToHTML(this.getParse("w", 0), 1) +
            "&nbsp;/&nbsp;" +
            this.parseSingleItemToHTML(this.getParse("t", 0), 1) +
            "</div>" +
            "&nbsp;:&nbsp;" +
            "+/-2" +
            "</div>");
    };
    CustomRenders.customcard_action_157 = function () {
        return ('<div class="groupline">' +
            this.parseSingleItemToHTML(this.getParse(":", 0), 1) +
            this.parseSingleItemToHTML(this.getParse("res_Microbe", 0), 1) +
            "</div>" +
            '<div class="groupline">OR&nbsp;3&nbsp;' +
            this.parseSingleItemToHTML(this.getParse("res_Microbe", 1), 1) +
            this.parseSingleItemToHTML(this.getParse(":", 0), 1) +
            this.parseSingleItemToHTML(this.getParse("tr", 0), 1) +
            "</div>");
    };
    CustomRenders.customcard_rules_163 = function () {
        return ('<div class="card_icono icono_gains cnt_gains"><div class="outer_gains"><div class="groupline">' +
            this.parseSingleItemToHTML(this.getParse("tr", 0), 1) +
            "&nbsp;&nbsp;" +
            this.parseSingleItemToHTML(this.getParse("p", 0), 4) +
            "</div>" +
            '<div class="groupline">3&nbsp;' +
            this.parseSingleItemToHTML(this.getParse("res_Microbe", 0), 1) +
            "&nbsp;&nbsp;" +
            "2&nbsp;" +
            this.parseSingleItemToHTML(this.getParse("res_Animal", 0), 1) +
            "</div></div></div>");
    };
    CustomRenders.customcard_vp_172 = function () {
        return '<div class="vp_qty">1/2</div>' + this.parseSingleItemToHTML(this.getParse("res_Animal", 0), 1);
    };
    CustomRenders.customcard_effect_173 = function () {
        return ('<div class="groupline">' +
            _("OPPONENTS MAY NOT REMOVE YOUR") +
            "</div>" +
            '<div class="groupline">' +
            this.parseSingleItemToHTML(this.getParse("p", 0), 1) +
            this.parseSingleItemToHTML(this.getParse("res_Animal", 0), 1) +
            this.parseSingleItemToHTML(this.getParse("res_Microbe", 0), 1) +
            "</div>");
    };
    CustomRenders.customcard_vp_184 = function () {
        return '<div class="vp_qty">1/</div>' + this.parseSingleItemToHTML(this.getParse("res_Animal", 0), 1);
    };
    CustomRenders.customcard_effect_185 = function () {
        return ('<div class="card_action_line card_action_icono"><div class="card_icono icono_losses cnt_losses"><div class="outer_gains">' +
            this.parseSingleItemToHTML(this.getParse("tagScience", 0), 1) +
            '</div></div><div class="effect_separator">:</div><div class="card_icono icono_gains cnt_gains"><div class="outer_gains">' +
            this.parseSingleItemToHTML(this.getParse("res_Science", 0), 1) +
            "OR" +
            "-" +
            this.parseSingleItemToHTML(this.getParse("res_Science", 0), 1) +
            '&nbsp;+<div class=" cnt_media token_img cardback depth_3"></div></div></div></div>');
    };
    CustomRenders.customcard_vp_198 = function () {
        return '<div class="vp_qty">1/3</div><div class="outer_redborder redborder_hex"><div class="cnt_media tracker tracker_city depth_2"></div></div>';
    };
    CustomRenders.customcard_action_194 = function () {
        return '<div class="card_action_line card_action_icono"><div class="card_icono icono_losses cnt_losses"><div class="outer_gains">X<div class="cnt_media token_img tracker_e depth_2"></div></div></div><div class="action_arrow"></div><div class="card_icono icono_gains cnt_gains"><div class="outer_gains"><div class="cnt_media token_img tracker_m depth_2">X</div></div></div></div>';
    };
    CustomRenders.customcard_rules_200 = function () {
        return ('<div class="card_icono icono_prod"><div class="outer_production"><div class="production_line cnt_losses"><div class="plusminus">-</div><div class="outer_production"><div class="cnt_media token_img tracker_e depth_1"></div></div></div><div class="production_line cnt_gains"><div class="plusminus">-</div>' +
            this.parseSingleItemToHTML(this.getParse("m", 0), 2) +
            '</div></div></div><div class="card_icono icono_gains cnt_gains"><div class="outer_gains"><div class="cnt_media tracker micon tracker_city depth_1"></div>*</div></div>');
    };
    CustomRenders.customcard_effect_206 = function () {
        return ('<div class="groupline">' +
            '<div class="prereq_content mode_min">' +
            this.parseSingleItemToHTML(this.getParse("o", 0), 1) +
            "&nbsp;/&nbsp;" +
            this.parseSingleItemToHTML(this.getParse("w", 0), 1) +
            "&nbsp;/&nbsp;" +
            this.parseSingleItemToHTML(this.getParse("t", 0), 1) +
            "</div>" +
            "&nbsp;:&nbsp;" +
            "+/-2" +
            "</div>");
    };
    CustomRenders.customcard_rules_207 = function () {
        return ('<div class="card_icono icono_prod"><div class="outer_production"><div class="production_line cnt_gains"><div class="outer_production"><div class="cnt_media token_img tracker_m depth_1">1</div></div>&nbsp;/&nbsp;<div class="outer_production">2' +
            this.parseSingleItemToHTML(this.getParse("tagBuilding", 0), 1) +
            "</div></div></div></div>");
    };
    CustomRenders.customcard_effect_P39 = function (action) {
        return ('<div class="card_action_line card_action_icono">' +
            action +
            '</div><div class="card_action_line card_action_icono card_icono">' +
            this.parseSingleItemToHTML(this.getParse("tagPlant", 0), 1) +
            "&nbsp;:&nbsp;" +
            this.parseSingleItemToHTML(this.getParse("res_Microbe", 0), 1) +
            '&nbsp;=&nbsp;<div class="cnt_media token_img tracker_m depth_1">2</div></div>');
    };
    CustomRenders.parses = {
        forest: { classes: "tracker tracker_forest" },
        all_city: { classes: "tracker tracker_city", redborder: "hex" },
        all_cityonmars: { classes: "tracker tracker_city", redborder: "hex", after: "*" },
        all_tagEvent: { classes: "tracker badge tracker_tagEvent", after: "*" },
        play_cardEvent: { classes: "tracker badge tracker_tagEvent" },
        city: { classes: "tracker micon tracker_city" },
        ocean: { classes: "token_img tracker_w" },
        discard: { classes: "token_img cardback", before: "-" },
        draw: { classes: "token_img cardback" },
        drawdis: { classes: "token_img cardback", before: "+", after: "-" },
        tile: { classes: "tracker micon tile_%card_number%" },
        tagScience: { classes: "tracker badge tracker_tagScience" },
        tagEnergy: { classes: "tracker badge tracker_tagEnergy" },
        tagMicrobe: { classes: "tracker badge tracker_tagMicrobe" },
        tagPlant: { classes: "tracker badge tracker_tagPlant" },
        tagAnimal: { classes: "tracker badge tracker_tagAnimal" },
        tagJovian: { classes: "tracker badge tracker_tagJovian" },
        tagBuilding: { classes: "tracker badge tracker_tagBuilding" },
        opp_tagSpace: { classes: "tracker badge tracker_tagSpace", redborder: "resource" },
        tagSpace: { classes: "tracker badge tracker_tagSpace" },
        tagEvent: { classes: "tracker badge tracker_tagEvent" },
        all_cardsRed: { classes: "tracker badge token_img tracker_tagEvent", redborder: "tag", after: "*" },
        onPay_tagEarth: { classes: "tracker badge tracker_tagEarth" },
        tagEarth: { classes: "tracker badge tracker_tagEarth" },
        "[1,](sell)": { classes: "" },
        onPay_cardSpace: { classes: "tracker badge tracker_tagSpace" },
        onPay_card: { classes: "empty" },
        twopoints: { classes: "txtcontent", content: ":" },
        play_stan: { classes: "txtcontent", content: "Standard projects" },
        star: { classes: "txtcontent", content: "*" },
        colony: { classes: "colony" },
        res_Science: { classes: "token_img tracker_resScience" },
        res_Animal: { classes: "token_img tracker_resAnimal" },
        res_Microbe: { classes: "token_img tracker_resMicrobe" },
        res_Floater: { classes: "token_img tracker_resFloater" },
        nores_Animal: { classes: "token_img tracker_resAnimal", redborder: "resource", norepeat: true },
        nores_Microbe: { classes: "token_img tracker_resMicrobe", redborder: "resource", norepeat: true },
        ores_Microbe: { classes: "token_img tracker_resMicrobe", after: "*", norepeat: true },
        ores_Animal: { classes: "token_img tracker_resAnimal", after: "*", norepeat: true },
        ores_Floater: { classes: "token_img tracker_resFloater", after: "*", norepeat: true },
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
        q: { classes: "token_img tracker_q" },
        ":": { classes: "action_arrow" }
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
        this.gamedatas.tokens["limbo"] = {
            key: "limbo",
            state: 0,
            location: "thething"
        };
        this.placeToken("limbo");
        // Setting up player boards
        for (var player_id in gamedatas.players) {
            var playerInfo = gamedatas.players[player_id];
            this.setupPlayer(playerInfo);
        }
        this.setupTokens();
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
        var _this = this;
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
                var tok = this.placeToken(location);
                if (tok instanceof Promise)
                    tok.then(function () { return _this.placeToken(token); });
                else
                    this.placeToken(token);
            }
            else
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
    GameTokens.prototype.setTokenInfo = function (token_id, place_id, new_state, serverdata, args) {
        var token = token_id;
        if (!this.gamedatas.tokens[token]) {
            this.gamedatas.tokens[token] = {
                key: token,
                state: 0,
                location: "limbo"
            };
        }
        if (args) {
            args["_prev"] = dojo.clone(this.gamedatas.tokens[token]);
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
        var _a;
        (_a = $("limbo")) === null || _a === void 0 ? void 0 : _a.appendChild($(tokenId));
    };
    GameTokens.prototype.getPlaceRedirect = function (tokenInfo) {
        var _this = this;
        var location = tokenInfo.location;
        var result = {
            location: location,
            key: tokenInfo.key,
            state: tokenInfo.state
        };
        if (location === null || location === void 0 ? void 0 : location.startsWith("discard")) {
            result.onEnd = function (node) { return _this.hideCard(node); };
        }
        else if (location === null || location === void 0 ? void 0 : location.startsWith("deck")) {
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
            this.connect(tokenDiv, "onclick", placeInfo.onClick);
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
    GameTokens.prototype.onUpdateTokenInDom = function (tokenNode, tokenInfo, tokenInfoBefore, animationDuration) {
        if (animationDuration === void 0) { animationDuration = 0; }
        if (dojo.hasClass(tokenNode, "infonode")) {
            this.placeInfoBox(tokenNode);
        }
        return tokenNode;
    };
    GameTokens.prototype.placeTokenLocal = function (tokenId, location, state, args) {
        return __awaiter(this, void 0, void 0, function () {
            var tokenInfo;
            return __generator(this, function (_a) {
                tokenInfo = this.setTokenInfo(tokenId, location, state, false, args);
                //this.on_client_state = true;
                return [2 /*return*/, this.placeTokenWithTips(tokenId, tokenInfo, args)];
            });
        });
    };
    GameTokens.prototype.placeTokenServer = function (tokenId, location, state, args) {
        return __awaiter(this, void 0, void 0, function () {
            var tokenInfo;
            return __generator(this, function (_a) {
                tokenInfo = this.setTokenInfo(tokenId, location, state, true, args);
                return [2 /*return*/, this.placeTokenWithTips(tokenId, tokenInfo, args)];
            });
        });
    };
    GameTokens.prototype.placeToken = function (token, tokenInfo, args) {
        var _a, _b;
        try {
            if (args === undefined) {
                args = {};
            }
            var noAnnimation = false;
            if (args.noa) {
                noAnnimation = true;
            }
            var tokenInfoBefore = args === null || args === void 0 ? void 0 : args._prev;
            if (!tokenInfo) {
                tokenInfo = this.gamedatas.tokens[token];
            }
            var tokenNode = $(token);
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
            if (!tokenInfo.location) {
                console.log(token + ": " + " -place-> undefined " + tokenInfo.state);
            }
            var placeInfo = (_a = args.placeInfo) !== null && _a !== void 0 ? _a : this.getPlaceRedirect(tokenInfo);
            var location_1 = placeInfo.location;
            //console.log(token + ": " + " -place-> " + location + " " + tokenInfo.state);
            this.saveRestore(token);
            if (tokenNode == null) {
                //debugger;
                if (!placeInfo.from && args.place_from)
                    placeInfo.from = args.place_from;
                tokenNode = this.createToken(placeInfo);
            }
            this.syncTokenDisplayInfo(tokenNode);
            this.setDomTokenState(tokenNode, tokenInfo.state);
            if (placeInfo.nop) {
                // no movement
                return this.onUpdateTokenInDom(tokenNode, tokenInfo, tokenInfoBefore, 0);
            }
            if (!$(location_1)) {
                if (location_1)
                    console.error("Unknown place '" + location_1 + "' for '" + tokenInfo.key + "' " + token);
                return Promise.resolve();
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
                    top: placeInfo.y + "px"
                };
            }
            this.preSlideAnimation(tokenNode, tokenInfo, location_1);
            this.slideAndPlace(tokenNode, location_1, animtime, mobileStyle, placeInfo.onEnd);
            return this.onUpdateTokenInDom(tokenNode, tokenInfo, tokenInfoBefore, animtime);
        }
        catch (e) {
            console.error("Exception thrown", e, e.stack);
            // this.showMessage(token + " -> FAILED -> " + place + "\n" + e, "error");
        }
        return tokenNode;
    };
    GameTokens.prototype.preSlideAnimation = function (tokenNode, tokenInfo, location) { };
    GameTokens.prototype.placeTokenWithTips = function (token, tokenInfo, args) {
        return __awaiter(this, void 0, void 0, function () {
            var node;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!tokenInfo) {
                            tokenInfo = this.gamedatas.tokens[token];
                        }
                        return [4 /*yield*/, this.placeToken(token, tokenInfo, args)];
                    case 1:
                        node = _a.sent();
                        this.updateTooltip(token);
                        if (tokenInfo)
                            this.updateTooltip(tokenInfo.location);
                        if (!(node instanceof Promise))
                            return [2 /*return*/, Promise.resolve(node)];
                        return [2 /*return*/, node];
                }
            });
        });
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
        // attach node has to have id
        if (!attachNode.id)
            attachNode.id = "gen_id_" + Math.random() * 10000000;
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
        var main = this.getTooltipHtmlForTokenInfo(tokenInfo);
        if (main) {
            attachNode.classList.add("withtooltip");
            if (attachNode.id != token)
                attachNode.setAttribute("tt_token", token); // id of token that provides the tooltip
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
    GameTokens.prototype.handleStackedTooltips = function (attachNode) { };
    GameTokens.prototype.removeTooltip = function (nodeId) {
        // if (this.tooltips[nodeId])
        if (!nodeId)
            return;
        this.inherited(arguments);
        delete this.tooltips[nodeId];
    };
    GameTokens.prototype.getTooltipHtmlForToken = function (token) {
        if (typeof token != "string") {
            console.error("cannot calc tooltip" + token);
            return null;
        }
        var tokenInfo = this.getTokenDisplayInfo(token);
        // console.log(tokenInfo);
        if (!tokenInfo)
            return;
        return this.getTooltipHtmlForTokenInfo(tokenInfo);
    };
    GameTokens.prototype.getTooltipHtmlForTokenInfo = function (tokenInfo) {
        return this.getTooltipHtml(tokenInfo.name, tokenInfo.tooltip, tokenInfo.imageTypes, tokenInfo.tooltip_action);
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
        tokenId = String(tokenId);
        var tokenInfo = this.getAllRules(tokenId);
        if (!tokenInfo && tokenId.startsWith("alt_")) {
            tokenInfo = this.getAllRules(tokenId.substring(4));
        }
        if (!tokenInfo) {
            tokenInfo = {
                key: tokenId,
                _chain: tokenId,
                name: tokenId,
                showtooltip: false
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
    GameTokens.prototype.getTokenPresentaton = function (type, tokenKey, args) {
        if (args === void 0) { args = {}; }
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
                if (args.you)
                    args.you = this.divYou(); // will replace ${you} with colored version
                args.You = this.divYou(); // will replace ${You} with colored version
                var keys = ["token_name", "token_divs", "token_names", "token_div", "token_div_count", "place_name", "undo_button"];
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
                            if (l > 0)
                                res += ", ";
                            res += this.getTokenPresentaton(key, value, args);
                        }
                        res = res.trim();
                        if (res)
                            args[key] = res;
                        continue;
                    }
                    if (typeof arg_value == "string" && this.isMarkedForTranslation(key, args)) {
                        continue;
                    }
                    var res = this.getTokenPresentaton(key, arg_value, args);
                    if (res)
                        args[key] = res;
                }
                if (log && args.reason_tr) {
                    log = this.getTr(log) + " (${reason_tr})";
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
        dojo.stopEvent(event);
        var methodName = fromMethod + "_" + this.getStateName();
        var ret = this.callfn(methodName, id);
        if (ret === undefined)
            return false;
        return true;
    };
    GameTokens.prototype.setupNotifications = function () {
        _super.prototype.setupNotifications.call(this);
        //  dojo.subscribe("counter", this, "notif_counter");
        // this.notifqueue.setSynchronous("counter", 500);
        // dojo.subscribe("counterAsync", this, "notif_counter"); // same as conter but no delay
        this.subscribeNotification("counter");
        this.subscribeNotification("counterAsync", 1, "counter"); // same as conter but no delay
        this.subscribeNotification("tokenMoved");
        this.subscribeNotification("tokenMovedAsync", 1, "tokenMoved"); // same as conter but no delay
        this.subscribeNotification("animate");
        /*
        dojo.subscribe("tokenMoved", this, "notif_tokenMoved");
        this.notifqueue.setSynchronous("tokenMoved", 500);
        dojo.subscribe("tokenMovedAsync", this, "notif_tokenMoved"); // same as tokenMoved but no delay
    
         */
    };
    GameTokens.prototype.notif_animate = function (notif) {
        console.log(notif);
        this.notifqueue.setSynchronousDuration(notif.args.time);
    };
    GameTokens.prototype.notif_tokenMoved = function (notif) {
        return __awaiter(this, void 0, void 0, function () {
            var last, i, one, new_state;
            return __generator(this, function (_a) {
                this.onNotif(notif);
                //	console.log('notif_tokenMoved', notif);
                if (notif.args.list !== undefined) {
                    last = void 0;
                    for (i = 0; i < notif.args.list.length; i++) {
                        one = notif.args.list[i];
                        new_state = notif.args.new_state;
                        if (new_state === undefined) {
                            if (notif.args.new_states !== undefined && notif.args.new_states.length > i) {
                                new_state = notif.args.new_states[i];
                            }
                        }
                        last = this.placeTokenServer(one, notif.args.place_id, new_state, notif.args);
                    }
                    return [2 /*return*/, last];
                }
                else {
                    return [2 /*return*/, this.placeTokenServer(notif.args.token_id, notif.args.place_id, notif.args.new_state, notif.args)];
                }
                return [2 /*return*/];
            });
        });
    };
    GameTokens.prototype.notif_counter = function (notif) {
        return __awaiter(this, void 0, void 0, function () {
            var name_3, value, counter_inc, counters;
            return __generator(this, function (_a) {
                try {
                    this.onNotif(notif);
                    name_3 = notif.args.counter_name;
                    value = void 0;
                    if (notif.args.counter_value !== undefined) {
                        value = notif.args.counter_value;
                    }
                    else {
                        counter_inc = notif.args.counter_inc;
                        value = notif.args.counter_value = this.gamedatas.counters[name_3].counter_value + counter_inc;
                    }
                    if (this.gamedatas.counters[name_3]) {
                        counters = {};
                        counters[name_3] = {
                            counter_name: name_3,
                            counter_value: value
                        };
                        if (this.gamedatas_server && this.gamedatas_server.counters[name_3])
                            this.gamedatas_server.counters[name_3].counter_value = value;
                        this.updateCountersSafe(counters);
                    }
                    else if ($(name_3) && this.gamedatas.tokens[name_3]) {
                        notif.args.nop = true; // no move animation
                        return [2 /*return*/, this.placeTokenServer(name_3, this.gamedatas.tokens[name_3].location, value, notif.args)];
                    }
                    else if ($(name_3)) {
                        this.setDomTokenState(name_3, value);
                    }
                    console.log("** notif counter " + notif.args.counter_name + " -> " + notif.args.counter_value);
                }
                catch (ex) {
                    console.error("Cannot update " + notif.args.counter_name, notif, ex, ex.stack);
                }
                return [2 /*return*/];
            });
        });
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var LAYOUT_PREF_ID = 100;
var LIVESCORING_PREF_ID = 105;
var MA_PREF_CONFIRM_TURN = 101;
var GameXBody = /** @class */ (function (_super) {
    __extends(GameXBody, _super);
    function GameXBody() {
        var _this = _super.call(this) || this;
        _this.productionTrackers = ["pm", "ps", "pu", "pp", "pe", "ph"];
        _this.resourceTrackers = ["m", "s", "u", "p", "e", "h"];
        //score cache
        _this.cachedScoreMoveNbr = "0";
        // private parses:any;
        _this.currentOperation = {}; // bag of data to support operation engine
        _this.classSelected = "mr_selected"; // for the purpose of multi-select operations
        _this.prevLogId = 0;
        _this.lastMoveId = 0;
        _this.CON = {};
        return _this;
    }
    GameXBody.prototype.setup = function (gamedatas) {
        var _this = this;
        try {
            this.isDoingSetup = true;
            this.instantaneousMode = true;
            this.lastMoveId = 0;
            this.handman = new CardHand(this);
            this.CON = gamedatas.CON; // PHP contants for game
            this.stacks = [];
            var theme = this.isLayoutFull() ? 2 : 1;
            var root = document.documentElement;
            dojo.addClass(root, this.prefs[LAYOUT_PREF_ID].values[theme].cssPref);
            this.interface_autoscale = this.isLayoutFull();
            document.getElementById("page-content").classList.toggle("bga-game-zoom", this.interface_autoscale);
            this.defaultTooltipDelay = 800;
            this.vlayout = new VLayout(this);
            this.custom_pay = undefined;
            this.clearReverseIdMap();
            this.customAnimation = new CustomAnimation(this);
            if (!this.gamedatas.undo_moves)
                this.gamedatas.undo_moves = {};
            //layout
            this.previousLayout = "desktop";
            this.zoneWidth = 0;
            this.zoneHeight = 0;
            this.setupResourceFiltering();
            this.setupLocalSettings();
            var mapnum = this.getMapNumber();
            this.setupHexes(mapnum);
            this.setupMilestonesAndAwards(mapnum);
            _super.prototype.setup.call(this, gamedatas);
            this.removeTooltip("map_hexes");
            if (mapnum == 4) {
                $("hand_area").appendChild($("standard_projects_area"));
            }
            //player controls
            //this.connectClass("viewcards_button", "onclick", "onShowTableauCardsOfColor");
            //Give tooltips to alt trackers in player boards
            var togglehtml_1 = this.getTooltipHtml(_("Card visibility toggle"), _("Shows number of cards of corresponding color on tableau"), "", _("Click to show or hide cards"));
            document.querySelectorAll(".player_controls .viewcards_button").forEach(function (node) {
                // have to attach tooltip directly, this element does not have a game model
                _this.addTooltipHtml(node.id, togglehtml_1, _this.defaultTooltipDelay);
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
            document.querySelectorAll(".tracker").forEach(function (node) {
                var id = node.id;
                var tnode = node;
                if (node.parentElement &&
                    (node.parentElement.classList.contains("playerboard_produce") || node.parentElement.classList.contains("playerboard_own"))) {
                    tnode = node.parentElement;
                }
                if (id.startsWith("alt_")) {
                    _this.updateTooltip(id.substring(4), node);
                    _this.updateTooltip(id.substring(4), tnode);
                }
                else {
                    _this.updateTooltip(id, tnode);
                }
            });
            //translate some text set in .tpl
            if ($("generation_text"))
                $("generation_text").innerHTML = _("Gen");
            $("scoretracker_text").innerHTML = _("Score");
            $("milestones_title").innerHTML = _("Milestones");
            $("awards_title").innerHTML = _("Awards");
            $("deck_main_title").innerHTML = _("Draw:");
            $("discard_title").innerHTML = _("Discard:");
            $("standard_projects_title_zone").innerHTML = _("Standard projects");
            this.addTooltip("awards_progress", _("Awards Summary"), _("Click to show"));
            this.addTooltip("milestones_progress", _("Milestones Summary"), _("Click to show"));
            //update prereq on cards
            this.updateHandInformation(this.gamedatas["card_info"], "card");
            // card reference
            this.setupHelpSheets();
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
            if (!this.isSpectator) {
                this.handman.applySortOrder();
                var color = this.getPlayerColor(this.player_id);
                $("draw_".concat(color)).dataset.name = _("Draw");
                $("draft_".concat(color)).dataset.name = _("Draft");
                $("hand_".concat(color)).dataset.name = _("Hand");
                $("hand_".concat(color)).dataset.nameempty = _("Hand: Empty");
                $("draw_".concat(color)).dataset.nameempty = _("Draw: Empty");
            }
            $("outer_scoretracker").addEventListener("click", function () {
                _this.onShowScoringTable();
            });
            $("milestones_progress").addEventListener("click", function () {
                _this.onShowMilestonesProgress();
            });
            $("awards_progress").addEventListener("click", function () {
                _this.onShowAwardsProgress();
            });
            //2p specific
            if (Object.keys(gamedatas.players).length == 2) {
                $("ebd-body").classList.add("twoplayers");
            }
            var map = this.getMapNumber();
            $("ebd-body").classList.add("map_" + map);
            if (this.isColoniesExpansionEnabled()) {
                $("ebd-body").classList.add("exp-colonies");
            }
            // debug buttons studio only
            var parent = document.querySelector(".debug_section");
            if (parent) {
                this.addActionButton("button_debug_dump", "Dump Machine", function () {
                    _this.remoteCallWrapperUnchecked("say", { msg: "debug_dumpMachineDb()" });
                }, parent); // NOI18N
            }
            this.updateStacks();
            this.setupColonies();
            var move = gamedatas.notifications.move_nbr;
            this.cachedScoringTable = gamedatas.scoringTable;
            this.cachedProgressTable = gamedatas.progressTable;
            this.cachedScoreMoveNbr = move;
            // call this to update cards vp data-vp attr
            this.createScoringTableHTML(this.cachedScoringTable);
            this.vlayout.setupDone();
            //locale css management
            $("ebd-body").dataset["locale"] = _("$locale");
            this.setupOneTimePrompt();
            // debug
            // for (let i=1;i<=18;i++) {
            //   const nodeid = 'alt_tracker_o';
            //   const div = this.cloneAndFixIds(nodeid, "_tt_"+i);
            //   div.dataset.state = String(i);
            //   $(nodeid).parentNode.appendChild(div);
            // }
        }
        catch (e) {
            console.error(e);
            console.log("Ending game setup");
            this.showError("Error during game setup: " + e);
        }
        finally {
            this.isDoingSetup = false;
            this.instantaneousMode = false;
        }
        this.checkTerraformingCompletion();
    };
    GameXBody.prototype.setupColonies = function () {
        if (this.isColoniesExpansionEnabled()) {
            var butla_1 = $("button_display_colonies_layout");
            var coloniesDisplay_1 = $("display_colonies");
            this.addTooltip(butla_1.id, _("Layout for Colonues - grid vs synthetic"), _("Click to change layout"));
            var localSetting_1 = new LocalSettings(this.getLocalSettingNamespace("card_colo_layout"));
            var current = localSetting_1.readProp("layout", "grid");
            var applyMode_1 = function (mode) {
                if (mode == "synthetic") {
                    butla_1.dataset.mode = "synthetic";
                    coloniesDisplay_1.dataset.mode = "synthetic";
                    butla_1.classList.remove("fa-tablet");
                    butla_1.classList.add("fa-window-restore");
                    localSetting_1.writeProp("layout", mode);
                }
                else {
                    butla_1.dataset.mode = "grid";
                    coloniesDisplay_1.dataset.mode = "grid";
                    butla_1.classList.add("fa-tablet");
                    butla_1.classList.remove("fa-window-restore");
                    localSetting_1.writeProp("layout", "grid");
                }
            };
            applyMode_1(current);
            butla_1.addEventListener("click", function () {
                if (butla_1.dataset.mode == "grid") {
                    applyMode_1("synthetic");
                }
                else {
                    applyMode_1("grid");
                }
            });
        }
    };
    GameXBody.prototype.setupMilestonesAndAwards = function (mapnum) {
        var list = ["milestone", "award"];
        for (var _i = 0, list_1 = list; _i < list_1.length; _i++) {
            var type = list_1[_i];
            var mainnode = $("display_".concat(type, "s"));
            for (var x = 1; x <= 5; x++) {
                mainnode.insertAdjacentHTML("beforeend", "<div id=\"".concat(type, "_").concat(x, "\" class=\"").concat(type, " ").concat(type, "_").concat(x, " mileaw_item\"><div id=\"").concat(type, "_label_").concat(x, "\" class=\"").concat(type, "_label\"></div></div>"));
            }
        }
        //<div id="display_awards" class="mileaw_display">
        //<div id="award_1" class="award award_1"><div id="award_label_1" class="award_label">NA</div></div>
    };
    GameXBody.prototype.setupHexes = function (mapnum) {
        var _this = this;
        var maphexes = $("map_hexes");
        //<div class="hex" id="hex_3_1"></div>
        //<div class="hex even" id="hex_3_2"></div>
        // 3 3 2 2 1 2 2 3 3
        var topSize = this.getRulesFor("map", "w", 5);
        var maxy = topSize * 2 - 1;
        var mapname = this.gamedatas.token_types.map.name;
        for (var y = 1; y <= maxy; y++) {
            var even = y % 2 == 0 ? "even" : "odd";
            var cent = Math.abs(y - topSize);
            var start = cent / 2.0 + 1;
            if (topSize % 2 == 0)
                start = Math.floor(start);
            else
                start = Math.ceil(start);
            var maxx = topSize + (y > topSize ? topSize * 2 - y - 1 : y - 1);
            for (var x = start; x <= maxx + start - 1; x++) {
                var hex = "hex_".concat(x, "_").concat(y);
                maphexes.insertAdjacentHTML("beforeend", "<div id=\"".concat(hex, "\"  class=\"hex ").concat(even, "\"></div>"));
                var info = this.gamedatas.token_types[hex];
                if (info.name === undefined) {
                    info.name = _(mapname) + " " + _("Hex") + " ".concat(x, ",").concat(y);
                }
            }
        }
        // oxygen map
        // const mapoxi = $("oxygen_map_scale");
        // const maxo  = this.getRulesFor("tracker_o", "max");
        // for (let y = 0; y <= maxo; y++) {
        //   mapoxi.insertAdjacentHTML("beforeend",`<div class="oxygen_scale_item" data-val="${y}"></div>`);
        // }
        // hex tooltips
        document.querySelectorAll(".hex").forEach(function (node) {
            _this.updateTooltip(node.id);
        });
        // hexes are not moved so manually connect
        this.connectClass("hex", "onclick", "onToken");
    };
    GameXBody.prototype.setupPlayer = function (playerInfo) {
        var _this = this;
        _super.prototype.setupPlayer.call(this, playerInfo);
        $("player_score_".concat(playerInfo.id)).addEventListener("click", function () {
            _this.onShowScoringTable();
        });
        var scoreDiv = "player_score_".concat(playerInfo.id);
        if (this.isLiveScoringDisabled()) {
            this.addTooltip(scoreDiv, _("Live Scoring is disabled (table option), this value is same as TR"), "");
        }
        else if (this.isLiveScoringOn()) {
            this.addTooltip(scoreDiv, _("Live Scoring is enabled, this value is calculated VP. This only updates at the end of the turn or on demand"), _("Click to see Scoring table and force the update"));
        }
        else {
            this.addTooltip(scoreDiv, _("Live Scoring is hidden (not updated), this value is same as TR. You can enable Live Scoring via user preference"), _("Click to see Scoring table (this reveals the currrent score)"));
        }
        this.setupPlayerStacks(playerInfo.color);
        this.vlayout.setupPlayer(playerInfo);
        //attach sort buttons
        if (playerInfo.id == this.player_id) {
            //generate buttons
            this.handman.hookSort();
        }
        //move own player board in main zone
        if (playerInfo.id == this.player_id || (!this.isLayoutFull() && this.isSpectator && !document.querySelector(".thisplayer_zone"))) {
            var board = $("player_area_".concat(playerInfo.color));
            dojo.place(board, "main_board", "after");
            dojo.addClass(board, "thisplayer_zone");
        }
    };
    GameXBody.prototype.setupPlayerStacks = function (playerColor) {
        var localColorSetting = new LocalSettings(this.getLocalSettingNamespace(this.table_id));
        var lsStacks;
        // not allow to hide effects and actions, it has important info affecting game
        var noHidden = [View.Synthetic, View.Stacked, View.Full];
        if (!this.isLayoutFull()) {
            // digital
            lsStacks = [
                { label: _("Automated"), div: "cards_1", color_class: "green", default: View.Stacked },
                { label: _("Events"), div: "cards_3", color_class: "red", default: View.Hidden },
                {
                    label: _("Effects"),
                    div: "cards_2",
                    color_class: "blue",
                    default: View.Stacked,
                    views: noHidden
                },
                { label: _("Actions"), div: "cards_2a", color_class: "blue", default: View.Stacked, views: noHidden },
                { label: _("Headquarters"), div: "cards_4", color_class: "corp", default: View.Full }
            ];
        }
        else {
            // cardboard
            lsStacks = [
                { label: _("Resources"), div: "cards_0", color_class: "pb", default: View.Synthetic, views: [View.Hidden, View.Synthetic] },
                { label: _("Automated"), div: "cards_1", color_class: "green", default: View.Stacked },
                { label: _("Events"), div: "cards_3", color_class: "red", default: View.Hidden },
                {
                    label: _("Effects"),
                    div: "cards_2",
                    color_class: "blue",
                    default: View.Stacked,
                    views: [View.Stacked, View.Full]
                },
                { label: _("Actions"), div: "cards_2a", color_class: "blue", default: View.Stacked, views: [View.Stacked, View.Full] },
                {
                    label: _("Headquarters"),
                    div: "cards_4",
                    color_class: "corp",
                    default: View.Stacked,
                    views: [View.Hidden, View.Stacked, View.Full]
                }
            ];
        }
        for (var _i = 0, lsStacks_1 = lsStacks; _i < lsStacks_1.length; _i++) {
            var item = lsStacks_1[_i];
            // read default from local storage
            var setId = "defaultstack_" + getPart(item.div, 1);
            item.default = parseInt(this.localSettings.readProp(setId, String(item.default)));
            var stack = new CardStack(this, localColorSetting, item.div, item.label, playerColor, item.color_class, item.default, item.views);
            stack.render("tableau_" + playerColor);
            this.stacks.push(stack);
        }
    };
    GameXBody.prototype.updateStacks = function (reset) {
        if (reset === void 0) { reset = false; }
        for (var _i = 0, _a = this.stacks; _i < _a.length; _i++) {
            var stack = _a[_i];
            if (reset)
                stack.reset();
            else
                stack.adjustFromView();
        }
    };
    GameXBody.prototype.saveCurrentStackLayoutAsDefault = function () {
        var html = "";
        for (var _i = 0, _a = this.stacks; _i < _a.length; _i++) {
            var stack = _a[_i];
            if (stack.player_color == this.player_color) {
                var num = getPart(stack.bin_type, 1);
                var setId = "defaultstack_".concat(num);
                this.localSettings.writeProp(setId, "".concat(stack.current_view));
                var layoutName = stack.getViewLabel(stack.current_view);
                html += "".concat(stack.label, ": ").concat(layoutName, "<br>");
            }
        }
        this.showPopin(html, "dialog", _("Saved Layout"));
    };
    GameXBody.prototype.withConfirmation = function (message, yesHander, condition) {
        if (condition === void 0) { condition = true; }
        if (condition)
            this.confirmationDialog(message, yesHander);
        else
            yesHander();
    };
    GameXBody.prototype.showGameScoringDialog = function () {
        if (this.cachedScoringTable) {
            var html = this.createScoringTableHTML(this.cachedScoringTable);
            var scoringOption = _(this.prefs[LIVESCORING_PREF_ID].name);
            var desc = _(this.prefs[LIVESCORING_PREF_ID].description);
            html += "<div><p></p><div title=\"".concat(desc, "\">").concat(scoringOption, "</div><div id='pref_section_in_dialog' class='pref_section_in_dialog'></div></div>");
            this.showPopin(html, "score_dialog", _("Score Summary"));
            this.createCustomPreferenceNode(LIVESCORING_PREF_ID, "pp" + LIVESCORING_PREF_ID, $("pref_section_in_dialog"));
        }
    };
    GameXBody.prototype.onShowScoringTable = function () {
        var _this = this;
        if (this.isLiveScoringDisabled()) {
            this.showPopin(_("This table is created with option to Disable Live Scoring. Score Preview is not available. If you don't like this do not join the table when this option is chosen next time"), "mr_dialog", _("Notice"));
            return;
        }
        var move = this.gamedatas.notifications.move_nbr;
        if (move == this.cachedScoreMoveNbr) {
            this.showGameScoringDialog();
        }
        else {
            var url = "/".concat(this.game_name, "/").concat(this.game_name, "/getRollingVp.html");
            this.ajaxcall(url, { lock: true }, this, function (result) {
                _this.cachedScoringTable = result.data.contents;
                _this.cachedScoreMoveNbr = move;
                _this.showGameScoringDialog();
            });
        }
    };
    GameXBody.prototype.createScoringTableHTML = function (scoringTable) {
        var _a, _b;
        var tablehtm = "\n    <div id=\"scoretable\" class=\"scoretable\">\n       <div class=\"scoreheader scorecol\">\n             <div class=\"scorecell header\">".concat(_("Player Name"), "</div>\n             <div class=\"scorecell header corp\">").concat(_("Corporation"), "</div>\n             <div class=\"scorecell \">").concat(_("Terraforming Rank"), "</div>\n             <div class=\"scorecell \">").concat(_("VP from cities"), "</div>\n             <div class=\"scorecell \">").concat(_("VP from greeneries"), "</div>\n             <div class=\"scorecell \">").concat(_("VP from Awards"), "</div>\n             <div class=\"scorecell \">").concat(_("VP from Milestones"), "</div>\n             <div class=\"scorecell \">").concat(_("VP from cards"), "</div>\n             <div class=\"scorecell header total\">").concat(_("VP total"), "</div>\n       </div>\n       %lines%\n     </div>");
        var lines = "";
        for (var playerId in scoringTable) {
            var entry = scoringTable[playerId];
            var plcolor = this.getPlayerColor(parseInt(playerId));
            var corp = $("tableau_" + plcolor + "_corp_logo").dataset.corp;
            lines =
                lines +
                    "\n       <div class=\" scorecol\">\n             <div class=\"scorecell header name\" style=\"color:#".concat(plcolor, ";\">").concat(this.gamedatas.players[playerId].name, "</div>\n             <div class=\"scorecell header corp\" ><div class=\"corp_logo\" data-corp=\"").concat(corp, "\"></div></div>\n             <div class=\"scorecell score\">").concat(entry.total_details.tr, "</div>\n             <div class=\"scorecell score\">").concat(entry.total_details.cities, "</div>\n             <div class=\"scorecell score\">").concat(entry.total_details.greeneries, "</div>\n             <div class=\"scorecell score\">").concat((_a = entry.total_details.awards) !== null && _a !== void 0 ? _a : _("Not Applicable"), "</div>\n             <div class=\"scorecell score\">").concat((_b = entry.total_details.milestones) !== null && _b !== void 0 ? _b : _("Not Applicable"), "</div>\n             <div class=\"scorecell score\">").concat(entry.total_details.cards, "</div>\n             <div class=\"scorecell score header total\">").concat(entry.total, "</div>\n       </div>");
            for (var cat in entry.details) {
                for (var token_key in entry.details[cat]) {
                    var rec = entry.details[cat][token_key];
                    var node = $(token_key);
                    if (!node)
                        continue;
                    node.dataset.vp = rec.vp;
                }
            }
            if (!this.isLiveScoringDisabled()) {
                var score = entry.total_details.tr;
                if (this.isLiveScoringOn()) {
                    score = entry.total;
                }
                var noanimation = false;
                if (this.isDoingSetup)
                    noanimation = true;
                this.updatePlayerScoreWithAnim({
                    player_id: playerId,
                    player_score: score,
                    noa: noanimation,
                    target: "player_board_".concat(playerId)
                });
            }
        }
        var finalhtm = tablehtm.replace("%lines%", lines);
        return finalhtm;
    };
    GameXBody.prototype.getOpInfoArgs = function (operations, optype) {
        for (var _i = 0, operations_1 = operations; _i < operations_1.length; _i++) {
            var opInfo = operations_1[_i];
            if (opInfo.type == optype) {
                return opInfo.args.info;
            }
        }
        return undefined;
    };
    GameXBody.prototype.onShowMilestonesProgress = function (callServer) {
        var _this = this;
        if (callServer === void 0) { callServer = true; }
        var num = Object.keys(this.gamedatas.players).length;
        var solo = num == 1;
        if (solo) {
            this.showPopin(_("Not available in solo mode"), "pg_dialog", _("Error"));
            return;
        }
        if (callServer) {
            var url = "/".concat(this.game_name, "/").concat(this.game_name, "/getUiProgressUpdate.html");
            this.ajaxcall(url, {}, this, function (result) {
                _this.cachedProgressTable = result.data.contents;
                _this.onShowMilestonesProgress(false);
            });
        }
        var msinfo = {};
        for (var key in this.gamedatas.token_types) {
            var info = this.gamedatas.token_types[key];
            if (key.startsWith("milestone")) {
                msinfo[key] = info;
            }
        }
        var namesColumn = "";
        for (var key in msinfo) {
            var info = msinfo[key];
            namesColumn += "<div class=\"scorecell \">\n      ".concat(_(info.name), "\n      </div>");
        }
        var descColumn = "";
        for (var key in msinfo) {
            var info = msinfo[key];
            descColumn += "<div class=\"scorecell mileaw_desc\"><span class=\"tm_smalltext\">".concat(_(info.text), "</span></div>");
        }
        var progress = callServer ? "Updating..." : "&nbsp;";
        var lines = "";
        {
            // Claimed column
            lines += "<div class=\"scorecol\">\n      <div class=\"scorecell header\">".concat(_("Claimed"), "</div>\n      ");
            var firstPlayerId = parseInt(Object.keys(this.gamedatas.players)[0]);
            var progress_1 = this.cachedProgressTable[firstPlayerId];
            for (var key in msinfo) {
                var opInfoArgs = this.getOpInfoArgs(progress_1.operations, "claim");
                var code = opInfoArgs[key].q;
                var sponsored = _("No");
                if (code == this.CON.MA_ERR_OCCUPIED) {
                    sponsored = _("Yes!");
                }
                else if (code == this.CON.MA_ERR_MAXREACHED) {
                    sponsored = _("All Claimed");
                }
                lines += "<div id=\"scorecell_x_".concat(key, "\" \n        class=\"scorecell score\" \n        data-type=\"").concat(key, "\">\n        ").concat(sponsored, "\n        </div>\n        ");
            }
            lines += "</div>";
        }
        for (var plid in this.gamedatas.players) {
            var plcolor = this.getPlayerColor(parseInt(plid));
            var name_4 = this.getPlayerName(parseInt(plid));
            var progress_2 = this.cachedProgressTable[plid];
            var opInfoArgs = this.getOpInfoArgs(progress_2.operations, "claim");
            var corp = $("tableau_" + plcolor + "_corp_logo").dataset.corp;
            lines += "\n                    <div class=\" scorecol\">\n                          <div class=\"scorecell header name\" style=\"color:#".concat(plcolor, ";\">\n                          ").concat(name_4, "\n                          <div class=\"corp_logo\" data-corp=\"").concat(corp, "\"></div>\n                          </div>\n                          ");
            for (var key in msinfo) {
                var current = opInfoArgs[key].c;
                var claimed = opInfoArgs[key].claimed;
                var staticInfo = msinfo[key];
                var goal = staticInfo.min;
                var pc = Math.ceil((current / goal) * 100);
                if (pc > 100)
                    pc = 100;
                var grade = "high";
                if (pc <= 34)
                    grade = "low";
                else if (pc <= 67)
                    grade = "mid";
                var scoreval = "".concat(current, "/").concat(goal);
                //const code = opInfoArgs[key].q;
                var subtext = claimed ? '<div class="card_vp">5</div>' : "";
                //scoreval = '<div class="card_vp">5</div>';
                lines += "<div id=\"scorecell_".concat(plcolor, "_").concat(key, "\" class=\"scorecell score\" data-type=\"").concat(key, "\" data-position=\"0\">\n             <div class=\"progress_hist\"  data-grade=\"").concat(grade, "\"  style=\"height: ").concat(pc, "%;\"></div>\n             <div class=\"score_val\">").concat(scoreval, "</div>\n             <div class=\"scoregoal\">").concat(subtext, "</div>\n          </div>");
            }
            lines = lines + "</div>";
        }
        var finalHtml = "\n    <div id='scoretable_pg_progress' class=\"pg_progress\">".concat(progress, "</div>\n    <div id=\"scoretable_pg_milestones\" class=\"scoretable\">\n       <div class=\"scoreheader scorecol\">\n             <div class=\"scorecell header\">").concat(_("Milestone"), "</div>\n             ").concat(namesColumn, "\n       </div>\n       <div class=\"scoreheader scorecol\">\n             <div class=\"scorecell header mileaw_desc\">").concat(_("Criteria"), "</div>\n             ").concat(descColumn, "\n       </div>\n       ").concat(lines, "\n     </div>");
        this.showPopin(finalHtml, "pg_dialog", _("Milestones Summary"), true);
    };
    GameXBody.prototype.onShowAwardsProgress = function (callServer) {
        var _this = this;
        if (callServer === void 0) { callServer = true; }
        var num = Object.keys(this.gamedatas.players).length;
        var solo = num == 1;
        if (solo) {
            this.showPopin(_("Not available in solo mode"), "pg_dialog", _("Error"));
            return;
        }
        if (callServer) {
            var url = "/".concat(this.game_name, "/").concat(this.game_name, "/getUiProgressUpdate.html");
            this.ajaxcall(url, {}, this, function (result) {
                _this.cachedProgressTable = result.data.contents;
                _this.onShowAwardsProgress(false);
            });
        }
        var msinfo = {};
        for (var key in this.gamedatas.token_types) {
            var info = this.gamedatas.token_types[key];
            if (key.startsWith("award")) {
                msinfo[key] = info;
            }
        }
        var namesRow = "";
        for (var key in msinfo) {
            var info = msinfo[key];
            namesRow += "<div id='scoreheader_".concat(key, "' class=\"scorecell\">").concat(_(info.name), "</div>");
        }
        var descColumn = "";
        for (var key in msinfo) {
            var info = msinfo[key];
            descColumn += "<div class=\"scorecell mileaw_desc\"><span class=\"tm_smalltext\">".concat(_(info.text), "</span></div>");
        }
        var progress = callServer ? "Updating..." : "&nbsp;";
        var lines = "";
        {
            // first column to say its claimed or not
            lines += "<div class=\"scorecol\">\n      <div class=\"scorecell header\">".concat(_("Sponsored"), "</div>\n      ");
            var firstPlayerId = parseInt(Object.keys(this.gamedatas.players)[0]);
            var progress_3 = this.cachedProgressTable[firstPlayerId];
            for (var key in msinfo) {
                var opInfoArgs = this.getOpInfoArgs(progress_3.operations, "fund");
                if (!opInfoArgs)
                    solo = true;
                var code = opInfoArgs[key].q;
                var sponsored = _("No");
                if (code == this.CON.MA_ERR_OCCUPIED) {
                    sponsored = _("Yes!");
                }
                else if (code == this.CON.MA_ERR_MAXREACHED) {
                    sponsored = _("All Claimed");
                }
                lines += "<div id=\"scorecell_x_".concat(key, "\" \n        class=\"scorecell score\" \n        data-type=\"").concat(key, "\">\n        ").concat(sponsored, "\n        </div>\n        ");
            }
            lines += "</div>";
        }
        for (var plid in this.gamedatas.players) {
            var info = this.gamedatas.players[plid];
            var plcolor = info.color;
            var name_5 = info.name;
            var progress_4 = this.cachedProgressTable[plid];
            var opInfoArgs = this.getOpInfoArgs(progress_4.operations, "fund");
            var corp = $("tableau_" + plcolor + "_corp_logo").dataset.corp;
            lines += "<div class=\"scorecol\">\n                          <div class=\"scorecell header name\" style=\"color:#".concat(plcolor, ";\">\n                          ").concat(name_5, "<div class=\"corp_logo\" data-corp=\"").concat(corp, "\"></div>\n                          </div>\n                          ");
            for (var key in msinfo) {
                var current = opInfoArgs[key].counter;
                var vp = opInfoArgs[key].vp;
                var code = opInfoArgs[key].q;
                var canClaim = code != this.CON.MA_ERR_MAXREACHED;
                var place = canClaim ? opInfoArgs[key].place : 0;
                var vp_icon = "";
                var won = code == this.CON.MA_ERR_OCCUPIED;
                if (vp && won)
                    vp_icon = "<div class=\"card_vp\">".concat(vp, "</div>");
                lines += "<div id=\"scorecell_".concat(plcolor, "_").concat(key, "\" \n            class=\"scorecell score\" \n            data-type=\"").concat(key, "\" \n            data-value=\"").concat(current, "\" \n            data-position=\"").concat(place, "\">\n            ").concat(vp_icon, "\n            ").concat(current, "\n            </div>\n            ");
            }
            lines += "</div>";
        }
        var finalHtml = "\n    <div id='scoretable_pg_progress' class=\"pg_progress\">".concat(progress, "</div>\n    <div id=\"scoretable_pg_awards\" class=\"scoretable\">\n       <div class=\"scoreheader scorecol\">\n             <div class=\"scorecell header\">").concat(_("Award"), "</div>\n             ").concat(namesRow, "\n       </div>\n      <div class=\"scoreheader scorecol\">\n             <div class=\"scorecell header mileaw_desc\">").concat(_("Criteria"), "</div>\n             ").concat(descColumn, "\n       </div>\n       ").concat(lines, "\n     </div>");
        this.showPopin(finalHtml, "pg_dialog", _("Awards Summary"), true);
    };
    GameXBody.prototype.getLocalSettingNamespace = function (extra) {
        if (extra === void 0) { extra = ""; }
        return "".concat(this.game_name, "-").concat(this.player_id, "-").concat(extra);
    };
    GameXBody.prototype.setupLocalSettings = function () {
        var _this = this;
        var _a;
        //local settings, include user id into setting string so it different per local player and theme
        var theme = (_a = this.prefs[LAYOUT_PREF_ID].value) !== null && _a !== void 0 ? _a : 1;
        this.localSettings = new LocalSettings(this.getLocalSettingNamespace(theme), [
            { key: "cardsize", label: _("Card size"), range: { min: 15, max: 200, inc: 5 }, default: 100, ui: "slider" },
            { key: "mapsize", label: _("Map size"), range: { min: 15, max: 200, inc: 5 }, default: 100, ui: "slider" },
            { key: "handplace", label: _("Make floating hand"), choice: { floating: true }, default: false, ui: "checkbox" },
            {
                key: "mapplacement",
                label: _("Place map first"),
                choice: { first: true },
                default: false,
                ui: "checkbox"
            },
            {
                key: "showtags",
                label: _("Show tags on minipanel"),
                choice: { show: true },
                default: false,
                ui: "checkbox"
            },
            {
                key: "showmicon",
                label: _("Show counters on minipanel"),
                choice: { show: true },
                default: false,
                ui: "checkbox"
            },
            {
                key: "colorblind",
                label: _("Colorblind support"),
                choice: { colorblind: true },
                default: false,
                ui: "checkbox"
            },
            { key: "animationamount", label: _("Animations amount"), range: { min: 1, max: 3, inc: 1 }, default: 3, ui: "slider" },
            { key: "animationspeed", label: _("Animation time"), range: { min: 25, max: 100, inc: 5 }, default: 50, ui: "slider" }
        ]);
        this.localSettings.setup();
        //this.localSettings.renderButton('player_config_row');
        this.localSettings.renderContents("settings-controls-container", function () {
            // run on settings reset
            _this.updateStacks(true);
            // re-create this button because local setting div is destroyed on reset
            _this.createSaveLayoutButton($(_this.localSettings.getDivId()));
        });
        this.createSaveLayoutButton($(this.localSettings.getDivId()));
        //cleanup old table settings
        //using a simpler namespace context for easier filtering
        // const purgeSettings = new LocalSettings(this.getLocalSettingNamespace());
        // purgeSettings.manageObsoleteData(this.table_id);
    };
    GameXBody.prototype.createSaveLayoutButton = function (parentNode) {
        var _this = this;
        if (!parentNode)
            return null;
        var restore_tooltip = _("Click to save current card layout of main player as default (i.e. each card stack visibility and type)");
        var restore_title = _("Save current card layout");
        var div = dojo.create("a", {
            id: "localsettings_restore",
            class: "action-button bgabutton bgabutton_gray",
            innerHTML: "<span title=\"".concat(restore_tooltip, "\">").concat(restore_title, "</span> <span title=\"").concat(restore_tooltip, "\" class='fa fa-align-justify'></span>"),
            onclick: function (event) {
                _this.saveCurrentStackLayoutAsDefault();
            },
            target: "_blank"
        });
        parentNode.appendChild(div);
        return div;
    };
    /**
     * This asks to select the theme, only on for alpha
     */
    GameXBody.prototype.setupOneTimePrompt = function () {
        if (typeof g_replayFrom != "undefined" || g_archive_mode)
            return;
        var ls = new LocalSettings(this.getLocalSettingNamespace()); // need another instance to save once per machine not per user/theme like others
        if (ls.readProp("activated", undefined))
            return;
        ls.writeProp("activated", "1");
        // no used
        // if (this.getMapNumber() == 4 &&  !this.isLayoutVariant(2) ) {
        //   this.showPopin('Amazonis map is only available in Cardboard theme for now','popx','Warning');
        // }
    };
    GameXBody.prototype.isLiveScoringDisabled = function () {
        var _a;
        if (this.gamedatas.gamestage == this.CON.MA_STAGE_ENDED) {
            return false;
        }
        if (((_a = this.gamedatas.table_options["105"]) === null || _a === void 0 ? void 0 : _a.value) === 2) {
            return true;
        }
        return false;
    };
    GameXBody.prototype.isXUndoEnabled = function () {
        var _a;
        if (((_a = this.gamedatas.table_options["106"]) === null || _a === void 0 ? void 0 : _a.value) === 1) {
            return true;
        }
        return false;
    };
    GameXBody.prototype.getMapNumber = function () {
        var _a, _b;
        return Number((_b = (_a = this.gamedatas.table_options["107"]) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : 0);
    };
    GameXBody.prototype.isColoniesExpansionEnabled = function () {
        var _a, _b;
        return ((_b = (_a = this.gamedatas.table_options["108"]) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : 0) > 0;
    };
    GameXBody.prototype.isLiveScoringOn = function () {
        if (this.isLiveScoringDisabled())
            return false;
        if (this.prefs[LIVESCORING_PREF_ID].value == 2)
            return false;
        return true;
    };
    GameXBody.prototype.refaceUserPreference = function (pref_id, prefNodeParent, prefDivId) {
        // can override to change apperance
        //console.log("PREF", pref_id);
        var prefNode = $(prefDivId);
        if (pref_id == LAYOUT_PREF_ID) {
            var pp = prefNode.parentElement;
            pp.removeChild($(prefDivId));
            this.createCustomPreferenceNode(pref_id, prefDivId, pp);
            return true;
        }
        if (pref_id == LIVESCORING_PREF_ID) {
            // live scoring
            if (this.isLiveScoringDisabled()) {
                prefNode.setAttribute("disabled", "true");
                prefNodeParent.classList.add("mr_disabled");
                prefNodeParent.title = _("This preference has no effect as Live Scoring disabled for this table");
            }
            else {
                prefNodeParent.title = this.getTr(this.prefs[LIVESCORING_PREF_ID].description);
            }
            return true;
        }
        return false; // return false to hook defaut listener, otherwise return true and you have to hook listener yourself
    };
    GameXBody.prototype.createCustomPreferenceNode = function (pref_id, prefDivId, pp) {
        var _this = this;
        var _a;
        var pref = this.prefs[pref_id];
        var pc = this.createDivNode(prefDivId, "custom_pref " + prefDivId, pp);
        pc.setAttribute("data-pref-id", pref_id + "");
        pp.parentElement.classList.add("custom_pref_pp");
        for (var v in pref.values) {
            var optionValue = pref.values[v];
            var option = this.createDivNode("".concat(prefDivId, "_v").concat(v), "custom_pref_option pref_".concat((_a = optionValue.cssPref) !== null && _a !== void 0 ? _a : ""), pc);
            option.setAttribute("value", v);
            option.innerHTML = this.getTr(optionValue.name);
            option.setAttribute("data-pref-id", pref_id + "");
            if (optionValue.description)
                option.title = this.getTr(optionValue.description); // naive tooltip
            if (pref.value == v) {
                option.setAttribute("selected", "selected");
            }
            dojo.connect(option, "onclick", function (e) {
                pc.querySelectorAll(".custom_pref_option").forEach(function (node) { return node.removeAttribute("selected"); });
                e.target.setAttribute("selected", "selected");
                _this.onChangePreferenceCustom(e);
            });
        }
        return pc;
    };
    GameXBody.prototype.addTooltipToLogItems = function (log_id) {
        var _this = this;
        var lognode = $("log_" + log_id);
        lognode.querySelectorAll(".card_hl_tt").forEach(function (node) {
            var card_id = node.getAttribute("data-clicktt");
            if (card_id)
                _this.updateTooltip(card_id, node);
        });
    };
    // onNewLog( html, seemore, logaction, is_gamelog, is_chat, no_red_color, time){
    //   console.log(html);
    // }
    GameXBody.prototype.addMoveToLog = function (log_id, move_id) {
        this.inherited(arguments);
        if (move_id)
            this.lastMoveId = move_id;
        if (this.prevLogId + 1 < log_id) {
            // we skip over some logs, but we need to look at them also
            for (var i = this.prevLogId + 1; i < log_id; i++) {
                this.addTooltipToLogItems(i);
            }
        }
        this.addTooltipToLogItems(log_id);
        // add move #
        var prevmove = document.querySelector('[data-move-id="' + move_id + '"]');
        if (prevmove) {
            // ?
        }
        else if (move_id) {
            var tsnode = document.createElement("div");
            tsnode.classList.add("movestamp");
            tsnode.innerHTML = _("Move #") + move_id;
            var lognode = $("log_" + log_id);
            lognode.appendChild(tsnode);
            tsnode.setAttribute("data-move-id", move_id);
        }
        this.prevLogId = log_id;
    };
    GameXBody.prototype.setupHelpSheets = function () {
        var _this = this;
        var cc = { main: 0, corp: 0, prelude: 0, colo: 0 };
        for (var key in this.gamedatas.token_types) {
            var info = this.gamedatas.token_types[key];
            if (key.startsWith("card")) {
                var num = getPart(key, 2);
                var type = getPart(key, 1);
                var helpnode = document.querySelector("#allcards_".concat(type, " .expandablecontent_cards"));
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
        var cc_prelude = cc["prelude"];
        var cc_colo = cc["colo"];
        $("allcards_main_title").innerHTML = _("All Project Cards") + " (".concat(ccmain, ")");
        $("allcards_corp_title").innerHTML = _("All Corporate Cards") + " (".concat(cccorp, ")");
        $("allcards_prelude_title").innerHTML = _("All Prelude Cards") + " (".concat(cc_prelude, ")");
        if (cc_colo)
            $("allcards_colo_title").innerHTML = _("All Colonies") + " (".concat(cc_colo, ")");
        // clicks
        dojo.query(".expandablecontent_cards > *").connect("onclick", this, function (event) {
            var id = event.currentTarget.id;
            _this.showHelp(id, true);
        });
        dojo.query("#allcards .expandabletoggle").connect("onclick", this, "onToggleAllCards");
        // filter controls
        var refroot = $("allcards");
        refroot.querySelectorAll(".filter-text").forEach(function (node) {
            node.addEventListener("input", function (event) {
                var fnode = event.target;
                _this.applyCardFilter(fnode.parentNode.parentNode);
            });
            node.setAttribute("placeholder", _("Search..."));
        });
        refroot.querySelectorAll(".filter-text-clear").forEach(function (clearButton) {
            clearButton.addEventListener("click", function (event) {
                var cnode = event.target;
                var expandableNode = cnode.parentNode.parentNode;
                var fnode = expandableNode.querySelector(".filter-text");
                fnode.value = "";
                _this.applyCardFilter(expandableNode);
            });
        });
    };
    GameXBody.prototype.applyCardFilter = function (expandableNode) {
        var _this = this;
        var hiddenOpacity = "none";
        var fnode = expandableNode.querySelector(".filter-text");
        var text = fnode.value.trim().toLowerCase();
        var contentnode = expandableNode.querySelector(".expandablecontent_cards");
        contentnode.querySelectorAll(".card").forEach(function (card) {
            card.style.removeProperty("display");
        });
        contentnode.querySelectorAll(".card").forEach(function (card) {
            var cardtext = _this.getTooltipHtmlForToken(card.id);
            if (!cardtext.toLowerCase().includes(text)) {
                card.style.display = hiddenOpacity;
            }
        });
    };
    GameXBody.prototype.setupDiscard = function () {
        /*
        this.connect($("discard_title"), "onclick", () => {
          this.showHiddenContent("discard_main", _("Discard pile contents"));
        });*/
    };
    GameXBody.prototype.setupResourceFiltering = function () {
        g_img_preload = [];
        // leave this empty for now - does not seems to do anything good, causing some loading errors for no reason
    };
    GameXBody.prototype.showHiddenContent = function (id, title, selectedId) {
        var _this = this;
        var dlg = new ebg.popindialog();
        dlg.create("cards_dlg");
        dlg.setTitle(title);
        var cards_htm = this.cloneAndFixIds(id, "_tt", true).innerHTML;
        var html = "<div id=\"card_pile_selector\" class=\"card_pile_selector\"></div>\n    <div id=\"card_dlg_content\" class=\"card_dlg_content\">".concat(cards_htm, "</div>");
        dlg.setContent(html);
        $("card_dlg_content")
            .querySelectorAll(".token,.card")
            .forEach(function (node) {
            node.addEventListener("click", function (e) {
                var selected_html = _this.getTooltipHtmlForToken(e.currentTarget.id);
                $("card_pile_selector").innerHTML = selected_html;
            });
        });
        if (selectedId) {
            var selected_html = this.getTooltipHtmlForToken(selectedId);
            $("card_pile_selector").innerHTML = selected_html;
        }
        dlg.show();
        return dlg;
    };
    GameXBody.prototype.onScreenWidthChange = function () {
        console.log("onScreenWidthChange");
        if (this.isLayoutFull()) {
            _super.prototype.onScreenWidthChange.call(this);
            var root = document.documentElement;
            dojo.removeClass(root, "mcompact");
            dojo.addClass(root, "mfull");
        }
        else {
            var width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
            var height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
            //dojo.style("page-content", "zoom", "");
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
        //disable hand sort on mobile
        // if (dojo.hasClass("ebd-body", "mobile_version") && dojo.hasClass("ebd-body", "touch-device")) {
        // }
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
    GameXBody.prototype.gameStatusCleanup = function () {
        //general cleanup of temp stuff put in the header gamestatus bar
        if ($("draft_info"))
            $("draft_info").remove();
        if ($("custom_paiement"))
            $("custom_paiement").remove();
    };
    //Expands for cleanup
    GameXBody.prototype.remoteUserAction = function (action, args, handler) {
        this.gameStatusCleanup();
        console.log("sending ".concat(action), args);
        if (action === "passauto") {
            return this.remoteCallWrapperUnchecked(action, {}, handler);
        }
        _super.prototype.remoteUserAction.call(this, action, args, handler);
    };
    GameXBody.prototype.onNotif = function (notif) {
        _super.prototype.onNotif.call(this, notif);
        //  this.darhflog("playing notif " + notif.type + " with args ", notif.args);
        //header cleanup
        this.gameStatusCleanup();
        //Displays message in header while the notif is playing
        //deactivated if animations aren't played
        //if (this.customAnimation.areAnimationsPlayed() == true)
        {
            if (!this.instantaneousMode && notif.log) {
                if ($("gameaction_status_wrap").style.display != "none") {
                    this.setSubTitle(notif.log, notif.args);
                }
                else {
                    // XXX this is very bad in multiple player all yout buttons dissapear
                    // currently gameaction_status should be visible
                    this.setDescriptionOnMyTurn(notif.log, notif.args);
                }
            }
        }
    };
    GameXBody.prototype.notif_tokensUpdate = function (notif) {
        var _a;
        console.log("notif_tokensUpdate", notif);
        for (var opIdS in notif.args.operations) {
            var opInfo = notif.args.operations[opIdS];
            this.updateHandInformation(opInfo.args.info, opInfo.type);
        }
        this.cachedProgressTable[(_a = notif.args.player_id) !== null && _a !== void 0 ? _a : this.getActivePlayerId()] = notif.args;
    };
    GameXBody.prototype.notif_scoringTable = function (notif) {
        //console.log(notif);
        this.cachedScoringTable = notif.args.data;
        this.cachedScoreMoveNbr = this.gamedatas.notifications.move_nbr;
        // call this to update cards vp data-vp attr
        this.createScoringTableHTML(this.cachedScoringTable);
        if (notif.args.show) {
            this.showGameScoringDialog();
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
            case 9:
                return "Colony";
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
        var htm = '<div class="compact_card_tt %adcl" style="%adstyle"><div class="card_tt_tooltipimagecontainer">%c</div><div class="card_tt_tooltipcontainer" data-card-type="' +
            type +
            '">%t</div></div>';
        var fullitemhtm = "";
        var fulltxt = "";
        var adClass = "";
        var adStyle = "";
        var elemId = displayInfo.key;
        // XXX this function not suppose to look for js element in the DOM because it may not be there
        if (!$(elemId) && $("".concat(elemId, "_help"))) {
            elemId = "".concat(elemId, "_help");
        }
        if (type !== undefined) {
            fulltxt = this.generateCardTooltip(displayInfo);
            var div_2 = this.cloneAndFixIds(elemId, "_tt", true);
            div_2.classList.remove("active_slot");
            fullitemhtm = div_2.outerHTML;
            if ([1, 2, 3, 5].includes(type)) {
                //main cards + prelude
                if (div_2.getAttribute("data-invalid_prereq") == "1") {
                    adClass += " invalid_prereq";
                }
                if (div_2.getAttribute("data-discounted") == "true") {
                    adClass += " discounted";
                    adStyle += "--discount-val:'".concat(div_2.getAttribute("data-discount_cost"), "';");
                }
                ["cannot_resolve", "cannot_pay"].forEach(function (item) {
                    if (div_2.getAttribute("data-" + item) != null && div_2.getAttribute("data-" + item) != "0") {
                        adClass += " " + item;
                    }
                });
            }
            else if (type == this.CON.MA_CARD_TYPE_STANDARD_PROJECT) {
                fullitemhtm = "";
            }
            displayInfo.imageTypes += " _override";
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
        return htm.replace("%adcl", adClass).replace("%adstyle", adStyle).replace("%c", fullitemhtm).replace("%t", fulltxt);
    };
    GameXBody.prototype.generateItemTooltip = function (displayInfo) {
        var _a;
        if (!displayInfo)
            return "?";
        var txt = "";
        var key = displayInfo.typeKey;
        var tokenId = displayInfo.tokenId;
        switch (key) {
            case "tracker_tr":
                return this.generateTooltipSection(_(displayInfo.name), _("Terraform Rating (TR) is the measure of how much you have contributed to the terraforming process. Each time you raise the oxygen level, the temperature, or place an ocean tile, your TR increases as well. Each step of TR is worth 1 VP at the end of the game, and the Terraforming Committee awards you income according to your TR. You start at 20."));
            case "tracker_m":
                return this.generateTooltipSection(_(displayInfo.name), _("The MegaCredit (M€) is the general currency used for buying and playing cards and using standard projects, milestones, and awards."));
            case "tracker_pm":
                return this.generateTooltipSection(_(displayInfo.name), _("Resource icons inside brown boxes refer to production of that resource. Your M€ income is the sum of your M€ production and your TR (Terraform Rating). M€ production is the only production that can be negative, but it may never be lowered below -5"));
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
                return this.generateTooltipSection(_(displayInfo.name), this.format_string_recursive(_("This global parameter starts with ${max} Ocean tiles in a stack, to be placed on the board during the game."), {
                    max: this.getRulesFor("tracker_w", "max")
                }));
            case "tracker_o":
                return this.generateTooltipSection(_(displayInfo.name), this.format_string_recursive(_("This global parameter starts with 0% and ends with ${max}% (This percentage compares to Earth's 21% oxygen)"), {
                    max: this.getRulesFor("tracker_o", "max")
                }));
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
            else if (displayInfo.vol == 1)
                txt += this.generateTooltipSection(_("Volcanic Area"), _(displayInfo.name));
            if ((_a = displayInfo.expr) === null || _a === void 0 ? void 0 : _a.r) {
                txt += this.generateTooltipSection(_("Bonus"), CustomRenders.parseExprToHtml(displayInfo.expr.r));
            }
            return txt;
        }
        if (key.startsWith("tracker_tag")) {
            txt += this.generateTooltipSection(_("Tags"), _("Number of tags played by the player. A tag places the card in certain categories, which can affect or be affected by other cards, or by the player board (e.g. you can pay with steel when playing a building tag)."));
        }
        else if (key.startsWith("tracker_forest") || key.startsWith("tracker_land")) {
            txt += this.generateTooltipSection(_("Tiles on Mars"), _("Number of corresponding tiles played on Mars."));
        }
        else if (key.startsWith("tracker_pdelta")) {
            txt += this.generateTooltipSection(_("Global parameters delta"), _("Your temperature, oxygen, and ocean requirements are +X or -X steps, your choice in each case."));
        }
        else if (key.startsWith("tracker_p")) {
            txt += this.generateTooltipSection(_("Resource Production"), _("Resource icons inside brown boxes refer to production of that resource. During the production phase you add resources equal to your production."));
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
    GameXBody.prototype.generateTokenTooltip_Full = function (displayInfo) {
        var _a, _b, _c, _d, _e;
        if (!displayInfo)
            return "?";
        if (displayInfo.t === undefined) {
            return this.generateItemTooltip(displayInfo);
        }
        var tt = this.generateCardTooltip(displayInfo);
        var classes = "";
        var discount_cost = (_b = (_a = displayInfo.card_info) === null || _a === void 0 ? void 0 : _a.discount_cost) !== null && _b !== void 0 ? _b : displayInfo.cost;
        if (displayInfo.card_info) {
            if (displayInfo.cost != discount_cost)
                classes += " discounted";
            if ((_c = displayInfo.card_info.pre) !== null && _c !== void 0 ? _c : 0 > 0) {
                classes += " invalid_prereq";
            }
            if ((_d = displayInfo.card_info.m) !== null && _d !== void 0 ? _d : 0 > 0) {
                classes += " cannot_resolve";
            }
            if ((_e = displayInfo.card_info.c) !== null && _e !== void 0 ? _e : 0 > 0) {
                classes += " cannot_pay";
            }
        }
        var res = "<div class=\"full_card_tt ".concat(classes, "\" style=\"--discount-val:'").concat(discount_cost, "'\">").concat(tt, "</div>");
        return res;
    };
    GameXBody.prototype.generateCardTooltip = function (displayInfo) {
        var _a, _b, _c, _d, _e;
        if (!displayInfo)
            return "?";
        var type = displayInfo.t;
        if (type === undefined) {
            return this.generateItemTooltip(displayInfo);
        }
        var isProjectCard = type > 0 && type <= 3;
        var isCard = isProjectCard || type == this.CON.MA_CARD_TYPE_CORP || type == this.CON.MA_CARD_TYPE_PRELUDE;
        var card_id = "";
        if (type > 0 && type < 7)
            card_id += " " + _(displayInfo.deck) + " #" + ((_a = displayInfo.num) !== null && _a !== void 0 ? _a : "");
        var res = "";
        // card type
        var type_name = this.getCardTypeById(type);
        res += this.generateTooltipSection(type_name, card_id);
        // cost
        if (isProjectCard || type == this.CON.MA_CARD_TYPE_STANDARD_PROJECT) {
            res += this.generateTooltipSection(_("Cost"), displayInfo.cost, true, "tt_cost");
        }
        // tags
        var tags = (_b = displayInfo.tags) === null || _b === void 0 ? void 0 : _b.split(" ").map(function (x) { return _(x); }).join(" ");
        if (!tags && isCard) {
            tags = _("None");
        }
        res += this.generateTooltipSection(_("Tags"), tags);
        // prereq
        var prereqText = "";
        if ((_c = displayInfo.expr) === null || _c === void 0 ? void 0 : _c.pre) {
            if (displayInfo.key == "card_main_135")
                prereqText = _("Requires at least 1 plant tag, 1 microbe tag and 1 animal tag."); //special case
            else if ((_d = displayInfo.expr) === null || _d === void 0 ? void 0 : _d.pre)
                prereqText = CustomRenders.parsePrereqToText(displayInfo.expr.pre, this);
            prereqText += '<div class="prereq_notmet">' + _("(You cannot play this card now because pre-requisites are not met.)") + "</div>";
        }
        else if (type > 0 && type <= 3) {
            prereqText = _("None");
        }
        res += this.generateTooltipSection(_("Requirement"), prereqText, true, "tt_prereq");
        var vp = _(displayInfo.text_vp);
        if (!vp)
            vp = displayInfo.vp;
        if (type == this.CON.MA_CARD_TYPE_MILESTONE) {
            res += this.generateTooltipSection(_("Criteria"), _(displayInfo.text));
            res += this.generateTooltipSection(_("Cost"), displayInfo.cost, true, "tt_cost");
            res += this.generateTooltipSection(_("Victory Points"), vp);
            res += this.generateTooltipSection(_("Info"), _("If you meet the criteria of a milestone, you may\n        claim it by paying 8 M\u20AC and placing your player marker on\n        it. A milestone may only be claimed by one player, and only\n        3 of the 5 milestones may be claimed in total, so there is a\n        race for these! Each claimed milestone is worth 5 VPs at the\n        end of the game."));
        }
        else if (type == this.CON.MA_CARD_TYPE_AWARD) {
            res += this.generateTooltipSection(_("Condition"), _(displayInfo.text));
            res += this.generateTooltipSection(_("Cost"), _("The first player to fund an award pays 8 M\u20AC and\nplaces a player marker on it. The next player to fund an\naward pays 14 M\u20AC, the last pays 20 M\u20AC."), true, "tt_cost");
            var text = _(" Only three awards\nmay be funded. Each award can only be funded once.<p>\nIn the final scoring, each award is checked, and 5\nVPs are awarded to the player who wins that category - it\ndoes not matter who funded the award! The second place\ngets 2 VPs (except in a 2-player game where second place\ndoes not give any VPs). Ties are friendly: more than one\nplayer may get the first or second place bonus.\nIf more than one player gets 1st place bonus, no 2nd place is\nawarded.");
            res += this.generateTooltipSection(_("Info"), text);
        }
        else if (type == this.CON.MA_CARD_TYPE_COLONY) {
            //colony cards r - colony placement bonus, a- colony trade bonus, i - trade action
            var card_r = CustomRenders.parseExprToText(displayInfo.expr.r, this);
            var card_a = CustomRenders.parseExprToText(displayInfo.expr.a, this);
            var card_i = CustomRenders.parseExprToText(displayInfo.i, this);
            if (card_i.includes("ores")) {
                debugger;
            }
            var build = "<div>".concat(_("Gain the indicated bonus when building a colony here:"), "</div>") + this.getTradeLine(displayInfo.expr.r);
            res += this.generateTooltipSection(_("Build Plcement Bonus"), build);
            var actu = "<div>".concat(_("Gain the indicated bonus for each colony you have here if trade is initiated:"), "</div>") +
                this.getTradeLine(displayInfo.expr.a);
            res += this.generateTooltipSection(_("Colony Bonus"), actu);
            var tradeSection = "";
            if (!card_i)
                tradeSection = "<div>".concat(_("Gain the indicated below"), "</div>");
            for (var i = 0; i < 7; i++) {
                var trnum = displayInfo.slots[i];
                var num = i + 1;
                if (!displayInfo.i)
                    tradeSection += this.getTradeLine(trnum, 1, num);
                else
                    tradeSection += this.getTradeLine(displayInfo.i, Number(trnum), num);
            }
            res += this.generateTooltipSection(_("Trade Income"), tradeSection);
        }
        else {
            var errors = this.getPotentialErrors(displayInfo.key);
            var cardText = (_e = displayInfo.text) !== null && _e !== void 0 ? _e : "";
            res += this.generateTooltipSection(_("Immediate Effect"), _(cardText));
            res += this.generateTooltipSection(_("Effect"), _(displayInfo.text_effect));
            res += this.generateTooltipSection(_("Action"), _(displayInfo.text_action));
            res += this.generateTooltipSection(_("Holds"), _(displayInfo.holds));
            res += this.generateTooltipSection(_("Victory Points"), vp);
            res += this.generateTooltipSection(_("Playability"), errors, true, "tt_error");
        }
        return res;
    };
    GameXBody.prototype.getTradeLine = function (op, count, num) {
        if (count === void 0) { count = 1; }
        var traction;
        var exp = op;
        if (count > 1)
            exp = ["!", count, count, op];
        traction = CustomRenders.parseExprToHtml(exp) + " <div>" + CustomRenders.parseExprToText(exp, this) + "</div>";
        if (num === undefined)
            return "<div class=\"tt_tradeline\">".concat(traction, "</div>");
        return "<div class=\"tt_tradeline\">".concat(_("Slot"), " ").concat(num, ": ").concat(traction, "</div>");
    };
    GameXBody.prototype.getPotentialErrors = function (card_id) {
        if (!$(card_id))
            return "";
        var ds = $(card_id).dataset;
        var msg = "";
        if (ds.cannot_pay && ds.cannot_pay != "0") {
            msg = msg + this.getTokenName("err_".concat(ds.cannot_pay)) + "<br/>";
        }
        if (ds.cannot_resolve && ds.cannot_resolve !== "0") {
            msg = msg + this.getTokenName("err_".concat(ds.cannot_resolve)) + "<br/>";
        }
        if (ds.op_code == ds.cannot_pay)
            return msg;
        if (ds.op_code == ds.cannot_resolve)
            return msg;
        if (ds.op_code == "0" || ds.op_code === undefined)
            return msg;
        msg = msg + this.getTokenName("err_".concat(ds.op_code)) + "<br/>";
        return msg;
    };
    GameXBody.prototype.createHtmlForToken = function (tokenNode, displayInfo) {
        var _a;
        // use this to generate some fake parts of card, remove this when use images
        if (displayInfo.mainType == "card") {
            var tagshtm = "";
            if (tokenNode.id.startsWith("card_corp_")) {
                //Corp formatting
                var decor = this.createDivNode(null, "card_decor", tokenNode.id);
                // const texts = displayInfo.text.split(';');
                var card_initial = displayInfo.text || "";
                var card_effect = displayInfo.text_effect || displayInfo.text_action || "";
                var card_title = displayInfo.name || "";
                var holds = displayInfo.holds || "";
                decor.innerHTML = "\n                  <div class=\"card_bg\"></div>\n                  <div class=\"card_title\">".concat(_(card_title), "</div>\n                  <div class=\"card_initial\">").concat(_(card_initial), "</div>\n                  <div class=\"card_effect\">").concat(_(card_effect), "</div>           \n            ");
                if (holds) {
                    decor.innerHTML += " <div id=\"resource_holder_".concat(tokenNode.id, "\" class=\"card_resource_holder resource_counter token_img tracker_res tracker_res").concat(holds, "\" data-resource_counter=\"0\"></div>");
                }
            }
            else if (tokenNode.id.startsWith("card_stanproj")) {
                tokenNode.dataset.cost = displayInfo.cost != 0 ? displayInfo.cost : "X";
            }
            else if (tokenNode.id.startsWith("card_colo_")) {
                //Corp formatting
                var decor = this.createDivNode(null, "card_decor", tokenNode.id);
                // const texts = displayInfo.text.split(';');
                var card_title = displayInfo.name || "";
                var card_r = CustomRenders.parseExprToHtml(displayInfo.expr.r);
                var card_a = CustomRenders.parseExprToHtml(displayInfo.expr.a);
                var card_i = CustomRenders.parseExprToHtml(displayInfo.i);
                decor.innerHTML = "\n                  <div class=\"card_bg\"></div>\n                  <div class=\"card_title\">".concat(this.getTr(card_title), "</div>\n                  <div class=\"card_initial\">").concat(card_a, "<span>").concat(_("Colony Bonus"), "</span></div>\n                  <div class=\"card_effect\">").concat(card_i, "<span>").concat(_("Trade Income"), "</span></div>  \n                  <div class=\"colony-colony-line\"></div>  \n                  <div class=\"colony-trade-line\"></div>  \n                  <div class=\"colony-trade-value\"></div>  \n                  <div class=\"colony-trade-cube\"></div>  \n            ");
                // const line = tokenNode.querySelector(".colony-colony-line");
                // const line2 = tokenNode.querySelector(".colony-trade-line");
                // for (let i = 0; i < 7; i++) {
                //   let x = card_r;
                //   if (i > 2) x = "";
                //   const trnum = displayInfo.slots[i];
                //   placeHtml(`<div id='coloslot_${i}' class='coloslot'>${x}</div>`, line);
                //   placeHtml(`<div class='tradeslot'>${trnum}</div>`, line2);
                // }
            }
            else {
                //tags
                var firsttag = "";
                if (displayInfo.tags && displayInfo.tags != "") {
                    for (var _i = 0, _b = displayInfo.tags.split(" "); _i < _b.length; _i++) {
                        var tag = _b[_i];
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
                        tokenNode.setAttribute("data-show_calc_vp", "1");
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
                var number_for_bin = "";
                if (typeof displayInfo.num == "string" && displayInfo.num.startsWith("P")) {
                    number_for_bin = displayInfo.num.replace("P", "");
                }
                else if (displayInfo.num) {
                    number_for_bin = displayInfo.num;
                }
                var cn_binary = displayInfo.num ? parseInt(number_for_bin).toString(2).padStart(8, "0") : "";
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
                        if (displayInfo.num && displayInfo.num != 19 && displayInfo.imageTypes.indexOf("prelude") == -1) {
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
                if (displayInfo.num == "P39") {
                    card_a = CustomRenders.customcard_effect_P39(card_a);
                }
                //special for "res"
                card_a = card_a.replaceAll("%res%", displayInfo.holds);
                var card_action_text = "";
                if (displayInfo.text_action || displayInfo.text_effect) {
                    card_action_text = "<div class=\"card_action_line card_action_text\">".concat(_(displayInfo.text_action) || _(displayInfo.text_effect), "</div>");
                }
                if (displayInfo.num == "P39") {
                    card_action_text = "<div class=\"card_action_line card_action_text\">".concat(_(displayInfo.text_action) + " " + _(displayInfo.text_effect), "</div>");
                }
                var holds = (_a = displayInfo.holds) !== null && _a !== void 0 ? _a : "Generic";
                var num = displayInfo.num;
                var htm_holds = '<div class="card_line_holder"><div class="cnt_media token_img tracker_res' +
                    holds +
                    '"></div><div class="counter_sep">:</div><div id="resource_holder_counter_' +
                    num +
                    '" class="resource_counter"  data-resource_counter="0"></div></div>';
                var cardId = tokenNode.id;
                decor.innerHTML = "\n                  <div class=\"card_illustration cardnum_".concat(num, "\"></div>\n                  <div class=\"card_bg\"></div>\n                  <div class='card_badges'>").concat(tagshtm, "</div>\n                  <div class='card_title'><div class='card_title_inner'>").concat(_(displayInfo.name), "</div></div>\n                  <div class=\"card_outer_action\"><div class=\"card_action\"><div class=\"card_action_line card_action_icono\">").concat(card_a, "</div>").concat(_(card_action_text), "</div><div class=\"card_action_bottomdecor\"></div></div>\n                  <div class=\"card_effect ").concat(addeffclass, "\">").concat(card_r, "<div class=\"card_tt\">").concat(_(displayInfo.text) || "", "</div></div>           \n                  <div class=\"card_prereq\">").concat(parsedPre, "</div>\n                  <div class=\"card_number\">").concat(num, "</div>\n                  <div class=\"card_number_binary\">").concat(cn_binary, "</div>\n                  <div id='cost_").concat(cardId, "' class='card_cost'><div class=\"number_inside\">").concat(displayInfo.cost, "</div>\n                  <div id='discountedcost_").concat(cardId, "' class='card_cost minidiscount token_img tracker_m'></div> \n                  <div class=\"discountarrow fa fa-arrow-circle-down\"></div>\n                  </div> \n                  <div id=\"resource_holder_").concat(cardId, "\" class=\"card_resource_holder resource_counter token_img tracker_res tracker_res").concat(holds, "\" data-resource_counter=\"0\"></div>\n                  ").concat(vp, "\n            ");
            }
            // const div = this.createDivNode(null, "card_info_box", tokenNode.id);
            // div.innerHTML = `
            //     <div class='token_title'>${displayInfo.name}</div>
            //     <div class='token_cost'>${displayInfo.cost}</div>
            //     <div class='token_rules'>${displayInfo.r}</div>
            //     <div class='token_descr'>${displayInfo.text}</div>
            //     `;
            // tokenNode.appendChild(div);
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
        /*
        if (displayInfo.mainType == "marker" && tokenNode.id && !this.isLayoutFull()) {
          this.vlayout.convertInto3DCube(tokenNode, displayInfo.color);
        }*/
    };
    GameXBody.prototype.syncTokenDisplayInfo = function (tokenNode) {
        var _a;
        if (!tokenNode.getAttribute("data-info")) {
            var displayInfo = this.getTokenDisplayInfo(tokenNode.id);
            var classes = displayInfo.imageTypes.split(/  */);
            (_a = tokenNode.classList).add.apply(_a, classes);
            tokenNode.setAttribute("data-info", "1");
            if (displayInfo.t)
                tokenNode.setAttribute("data-card-type", displayInfo.t);
            this.connect(tokenNode, "onclick", "onToken");
            if (!this.isLayoutFull()) {
                this.createHtmlForToken(tokenNode, displayInfo);
            }
            else {
                this.vlayout.createHtmlForToken(tokenNode, displayInfo);
            }
        }
    };
    GameXBody.prototype.onUpdateTokenInDom = function (tokenNode, tokenInfo, tokenInfoBefore, animationDuration) {
        var _this = this;
        var _a;
        if (animationDuration === void 0) { animationDuration = 0; }
        try {
            _super.prototype.onUpdateTokenInDom.call(this, tokenNode, tokenInfo, tokenInfoBefore, animationDuration);
            var key_1 = tokenInfo.key;
            var location_2 = tokenInfo.location; // db location
            var place_id = (_a = tokenNode.parentElement) === null || _a === void 0 ? void 0 : _a.id; // where is object in dom
            var prevLocation = tokenInfoBefore === null || tokenInfoBefore === void 0 ? void 0 : tokenInfoBefore.location;
            var prevState = tokenInfoBefore === null || tokenInfoBefore === void 0 ? void 0 : tokenInfoBefore.state;
            var inc_1 = tokenInfo.state - prevState;
            if (key_1.startsWith("card_")) {
                this.handman.maybeEnabledDragOnCard(tokenNode);
            }
            // update resource holder counters
            if (key_1.startsWith("resource_")) {
                var targetCard = place_id;
                var removed = false;
                if (location_2.startsWith("card_")) {
                    //resource added to card
                    targetCard = location_2;
                }
                else if (prevLocation === null || prevLocation === void 0 ? void 0 : prevLocation.startsWith("card_")) {
                    //resource removed from a card
                    removed = true;
                    targetCard = prevLocation;
                }
                var targetCardNode = $(targetCard);
                if (targetCardNode) {
                    var count = String(targetCardNode.querySelectorAll(".resource").length);
                    if (this.isLayoutFull()) {
                        targetCardNode.dataset.resource_counter = count;
                    }
                    else {
                        var dest_holder = "resource_holder_".concat(targetCard);
                        var node = $(dest_holder);
                        if (node) {
                            node.dataset.resource_counter = count;
                        }
                        if (!removed) {
                            return this.customAnimation.animatePlaceResourceOnCard(key_1, location_2);
                        }
                        else {
                            return this.customAnimation.animateRemoveResourceFromCard(key_1, prevLocation);
                        }
                    }
                }
            }
            //pop animation on Tiles
            if (key_1.startsWith("tile_")) {
                return this.customAnimation.animateTilePop(key_1);
            }
            //temperature & oxygen - compact only as full doesn't have individual rendered elements
            if (!this.isLayoutFull() && this.getMapNumber() != 4) {
                if (key_1 == "tracker_t") {
                    return this.customAnimation.animateMapItemAwareness("temperature_map");
                }
                else if (key_1 == "tracker_o") {
                    return this.customAnimation.animateMapItemAwareness("oxygen_map");
                }
            }
            //ocean's pile
            if (key_1 == "tracker_w") {
                return this.customAnimation.animateMapItemAwareness("oceans_pile");
            }
            else if (key_1 == "tracker_gen") {
                return this.customAnimation.animateMapItemAwareness("outer_generation");
            }
            if (key_1.startsWith("marker_")) {
                if (location_2.startsWith("award")) {
                    this.strikeNextAwardMilestoneCost("award");
                    return this.customAnimation.animatePlaceMarker(key_1, place_id);
                }
                else if (location_2.startsWith("milestone")) {
                    this.strikeNextAwardMilestoneCost("milestone");
                    return this.customAnimation.animatePlaceMarker(key_1, place_id);
                }
                else if (location_2.startsWith("tile_")) {
                    return this.customAnimation.animatePlaceMarker(key_1, place_id);
                }
            }
            if (key_1.startsWith("card_corp") && location_2.startsWith("tableau")) {
                $(location_2 + "_corp_logo").dataset.corp = key_1;
                $(location_2.replace("tableau_", "miniboard_corp_logo_")).dataset.corp = key_1;
                //adds tt to corp logos
                this.updateTooltip(key_1, location_2 + "_corp_logo");
                this.updateTooltip(key_1, location_2.replace("tableau_", "miniboard_corp_logo_"));
            }
            if (key_1.startsWith("card_") && location_2.startsWith("tableau")) {
                var sub = String(tokenNode.parentElement.querySelectorAll(".card").length);
                tokenNode.parentElement.parentElement.dataset.subcount = sub;
                tokenNode.parentElement.parentElement.style.setProperty("--subcount", JSON.stringify(sub));
                tokenNode.parentElement.parentElement.style.setProperty("--subcount-n", sub);
            }
            //move animation on main player board counters
            if (key_1.startsWith("tracker_")) {
                if (!this.isLayoutFull() && inc_1) {
                    var type = getPart(key_1, 1);
                    if (this.resourceTrackers.includes(type) || type == "tr") {
                        // cardboard layout animating cubes on playerboard instead
                        return this.customAnimation.animateTingle(key_1).finally(function () { return _this.customAnimation.moveResources(key_1, inc_1); });
                    }
                    if ($(key_1)) {
                        return this.customAnimation.animateTingle(key_1);
                    }
                }
                return this.customAnimation.wait(this.customAnimation.getWaitDuration(200));
            }
            return this.customAnimation.wait(animationDuration); // default move animation
        }
        catch (e) {
            return Promise.reject(e);
        }
    };
    GameXBody.prototype.preSlideAnimation = function (tokenNode, tokenInfo, location) {
        _super.prototype.preSlideAnimation.call(this, tokenNode, tokenInfo, location);
        if (!this.isLayoutFull()) {
            //auto switch tabs here
            if (!this.isDoingSetup) {
                var parentStack = $(location).parentElement;
                if (parentStack.dataset.currentview == "0") {
                    parentStack.dataset.currentview = "2";
                    this.customAnimation.setOriginalStackView(parentStack, "0");
                }
            }
        }
    };
    GameXBody.prototype.setDomTokenState = function (tokenId, newState) {
        var _a;
        _super.prototype.setDomTokenState.call(this, tokenId, newState);
        var node = $(tokenId);
        if (!node)
            return;
        if (!node.id)
            return;
        this.vlayout.renderSpecificToken(node);
        // to show + signs in some cases
        if (node.id.startsWith("tracker_")) {
            if (newState > 0) {
                node.setAttribute("data-sign", "+");
            }
            else {
                node.removeAttribute("data-sign");
            }
        }
        if (node.id.startsWith("card_colo")) {
            var cube = $(node).querySelector(".colony-trade-cube");
            if (cube) {
                cube.dataset.state = newState;
            }
            var valueNode = $(node).querySelector(".colony-trade-value");
            if (valueNode) {
                var i = newState;
                var displayInfo = this.getTokenDisplayInfo(node.id);
                var trnum = (_a = displayInfo.slots[i]) !== null && _a !== void 0 ? _a : "";
                var text = "";
                if (displayInfo.i) {
                    text = "<span>".concat(trnum, "</span><span>").concat(CustomRenders.parseExprToHtml(displayInfo.i), "</span>");
                }
                else {
                    text = CustomRenders.parseExprToHtml(trnum);
                }
                valueNode.innerHTML = text;
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
        //handle copies of trackers
        var trackerCopy = "alt_" + node.id;
        var nodeCopy = $(trackerCopy);
        if (nodeCopy) {
            _super.prototype.setDomTokenState.call(this, trackerCopy, newState);
            if (node.id.startsWith("tracker_")) {
                if (newState > 0) {
                    nodeCopy.setAttribute("data-sign", "+");
                }
                else {
                    nodeCopy.removeAttribute("data-sign");
                }
            }
            //alt_tracker_w (on the map)
            if (node.id.startsWith("tracker_w")) {
                $(nodeCopy.id).dataset.calc = (this.getRulesFor("tracker_w", "max") - parseInt(newState)).toString();
            }
        }
        //check TM
        if (node.id.startsWith("tracker_w") || node.id.startsWith("tracker_t") || node.id.startsWith("tracker_o")) {
            this.checkTerraformingCompletion();
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
            tokenDisplayInfo.tooltip = this.generateTokenTooltip_Full(tokenDisplayInfo);
        }
        else {
            tokenDisplayInfo.tooltip = this.generateCardTooltip_Compact(tokenDisplayInfo);
        }
        // if (this.isLocationByType(tokenDisplayInfo.key)) {
        //   tokenDisplayInfo.imageTypes += " infonode";
        // }
    };
    GameXBody.prototype.updateHandInformation = function (info, opInfoType) {
        var _a, _b, _c;
        if (!info)
            return;
        for (var cardId in info) {
            if (!this.gamedatas.token_types[cardId])
                continue; // not a token
            var card_info = info[cardId];
            // update token display info
            var original_cost = parseInt(this.gamedatas.token_types[cardId].cost);
            var discount_cost = 0;
            var payop = card_info.payop;
            if (payop) {
                discount_cost = parseInt(payop.replace("nm", "").replace("nop", "0")) || 0;
            }
            else {
                discount_cost = original_cost;
            }
            card_info.discount_cost = discount_cost;
            this.gamedatas.token_types[cardId].card_info = card_info;
            // update node attrs
            var node = $(cardId);
            if (!node)
                continue; // not visible?
            var prereqMet = ((_a = card_info.pre) !== null && _a !== void 0 ? _a : "0") == 0;
            node.dataset.invalid_prereq = prereqMet ? "0" : "1";
            node.dataset.cannot_resolve = (_b = card_info.m) !== null && _b !== void 0 ? _b : "0";
            node.dataset.cannot_pay = (_c = card_info.c) !== null && _c !== void 0 ? _c : "0";
            node.dataset.op_code = card_info.q;
            var discounted = discount_cost != original_cost;
            if (discounted || !this.isLayoutFull()) {
                node.dataset.discounted = String(discounted);
                node.dataset.discount_cost = String(discount_cost);
            }
            else {
                delete node.dataset.discounted;
                delete node.dataset.discount_cost;
            }
            node.dataset.in_hand = node.parentElement.classList.contains("handy") ? "1" : "0";
            var costDiv = $("cost_" + cardId);
            var costdiscountDiv = $("discountedcost_" + cardId);
            if (costDiv) {
                if (discounted) {
                    // costdiscountDiv.dataset.discounted_cost = node.dataset.discount_cost;
                    costdiscountDiv.innerHTML = node.dataset.discount_cost;
                    //   costDiv.dataset.discounted_cost = node.dataset.discount_cost;
                    // costDiv.dataset.original_cost = node.dataset.original_cost;
                    costDiv.classList.add("discounted");
                }
                else {
                    costDiv.dataset.discounted_cost = "";
                    // costdiscountDiv.dataset.discounted_cost ="";
                    costdiscountDiv.innerHTML = "";
                    costDiv.classList.remove("discounted");
                }
            }
            //update TT too
            this.updateTooltip(node.id);
            this.handman.updateSortOrderOnCard(node);
        }
    };
    GameXBody.prototype.updateVisualsFromOp = function (opInfo, opId) {
        var _a, _b, _c, _d;
        var opargs = opInfo.args;
        var paramargs = (_a = opargs.target) !== null && _a !== void 0 ? _a : [];
        var ttype = (_b = opargs.ttype) !== null && _b !== void 0 ? _b : "none";
        var type = (_c = opInfo.type) !== null && _c !== void 0 ? _c : "none";
        var from = opInfo.mcount;
        var count = opInfo.count;
        if (type == "draft") {
            var next_color = (_d = opargs.args.next_color) !== null && _d !== void 0 ? _d : "";
            var next_name = next_color != "" ? this.getPlayerName(this.getPlayerIdByColor(next_color)) : "";
            if (next_color != "" && !$("draft_info")) {
                var txt = _("Draft Direction ➡️ %s").replace("%s", "<span class=\"draft_info\" style=\"color:#".concat(next_color, ";\">").concat(next_name, "</span>"));
                $("gameaction_status").insertAdjacentHTML("afterend", "<span id=\"draft_info\">".concat(txt, "</span>"));
            }
        }
    };
    /**
     * This function can convert the database info into dom placement info.
     * This SHOULD NOT MODIFY dom state. For that use @see onUpdateTokenInDom
     * @param tokenInfo
     * @returns
     */
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
        }
        else if (tokenInfo.key.startsWith("card_corp") && tokenInfo.location.startsWith("tableau")) {
            //result.location = tokenInfo.location + "_corp_effect";
            result.location = tokenInfo.location + "_cards_4";
            if (this.isSpectator === false && tokenInfo.location == "tableau_" + this.player_color && !this.isLayoutFull()) {
                CustomRenders.updateUIFromCorp(tokenInfo.key);
            }
        }
        else if (tokenInfo.key.startsWith("card_main") && tokenInfo.location.startsWith("tableau")) {
            var t = this.getRulesFor(tokenInfo.key, "t");
            result.location = tokenInfo.location + "_cards_" + t;
            if (this.getRulesFor(tokenInfo.key, "a")) {
                result.location = tokenInfo.location + "_cards_2a";
                // } else if (t == 2 && this.getRulesFor(tokenInfo.key, "holds", "")) {
                //   // card can hold stuff - no longer needed
                //   result.location = tokenInfo.location + "_cards_2a";
            }
        }
        else if (tokenInfo.key.startsWith("card_prelude") && tokenInfo.location.startsWith("tableau")) {
            result.location = tokenInfo.location + "_cards_4";
        }
        else if (tokenInfo.location.startsWith("hand_") ||
            tokenInfo.location.startsWith("draw_") ||
            tokenInfo.location.startsWith("draft_")) {
            var tocolor = getPart(tokenInfo.location, 1);
            if (tocolor != this.player_color && tocolor != "area") {
                // this is hidden location
                result.nop = true;
            }
        }
        if (!result.location)
            // if failed to find revert to server one
            result.location = tokenInfo.location;
        result.animtime = this.customAnimation.getWaitDuration(this.defaultAnimationDuration);
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
        return this.prefs[LAYOUT_PREF_ID].value == num;
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
    GameXBody.prototype.sendActionResolve = function (op, args, opInfo, handler) {
        if (!args)
            args = {};
        var action = "resolve";
        if (opInfo === null || opInfo === void 0 ? void 0 : opInfo.ooturn) {
            action = opInfo.type; // ugly hack
        }
        // if (!handler) handler = (err) => {
        //   if (err) return;
        //   dojo.empty('generalactions');
        // }
        this.remoteUserAction(action, {
            ops: [__assign({ op: op }, args)]
        }, handler);
        return true;
    };
    GameXBody.prototype.sendActionResolveWithCount = function (opId, count) {
        return this.sendActionResolve(opId, {
            count: count
        });
    };
    GameXBody.prototype.sendActionResolveWithTargetAndPayment = function (opId, target, payment) {
        return this.sendActionResolve(opId, { target: target, payment: payment });
    };
    GameXBody.prototype.sendActionDecline = function (op) {
        this.remoteUserAction("decline", {
            ops: [{ op: op }]
        });
    };
    GameXBody.prototype.sendActionSkip = function () {
        var op = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            op[_i] = arguments[_i];
        }
        this.remoteUserAction("skip", {
            oparr: op
        });
    };
    GameXBody.prototype.addUndoMoveButton = function (prompt, moveinfo) {
        var _this = this;
        var _a;
        var move_id = moveinfo === null || moveinfo === void 0 ? void 0 : moveinfo.move_id;
        var currentMove = parseInt((_a = $("ebd-body")) === null || _a === void 0 ? void 0 : _a.dataset.move_nbr);
        var message = this.format_string_recursive(prompt, {
            label: _(moveinfo.label),
            movenum: move_id
        });
        var tip = this.format_string_recursive(_("Undo up to move ${movenum} (${label})"), {
            label: _(moveinfo.label),
            movenum: move_id
        });
        var button = this.addActionButtonColor("button_undo_" + move_id, message, function () { return _this.sendActionUndo(move_id); });
        button.title = tip;
    };
    GameXBody.prototype.sendActionUndo = function (undoMove) {
        var _this = this;
        var _a;
        if (undoMove === void 0) { undoMove = 0; }
        var num = Object.keys(this.gamedatas.undo_moves).length;
        var currentMove = parseInt((_a = $("ebd-body")) === null || _a === void 0 ? void 0 : _a.dataset.move_nbr);
        if (this.isXUndoEnabled()) {
            if (undoMove === 0 && num > 0 && this.gamedatas.undo_move) {
                this.setMainTitle(_("Select undo move"));
                dojo.empty("generalactions");
                var first = undefined;
                var lastinfo = void 0;
                for (var i in this.gamedatas.undo_moves) {
                    var moveinfo = this.gamedatas.undo_moves[i];
                    var move_id = moveinfo === null || moveinfo === void 0 ? void 0 : moveinfo.move_id;
                    if (!move_id)
                        continue;
                    if (!first) {
                        this.addUndoMoveButton(_("Undo All"), moveinfo);
                        first = moveinfo;
                    }
                    else if (move_id >= currentMove) {
                        // ignore
                    }
                    else if (moveinfo.last_move && moveinfo.last_move >= currentMove) {
                        // ignore
                    }
                    else {
                        lastinfo = moveinfo;
                    }
                }
                if (lastinfo)
                    this.addUndoMoveButton(_("Undo One Step (${label})"), lastinfo);
                else if (first) {
                    this.sendActionUndo(first === null || first === void 0 ? void 0 : first.move_id);
                    return;
                }
                this.addCancelButton();
                return;
            }
        }
        this.gameStatusCleanup();
        var message = this.format_string_recursive(_("Cancelling all moves up to ${movenum}..."), { movenum: undoMove });
        this.setMainTitle(message);
        dojo.empty("generalactions");
        this.remoteCallWrapperUnchecked("undo", { move_id: undoMove }, function (err) {
            if (err) {
                _this.cancelLocalStateEffects();
            }
        });
    };
    // @Override
    GameXBody.prototype.onNextMove = function (move_id) {
        this.inherited(arguments);
        $("ebd-body").dataset.move_nbr = move_id;
    };
    GameXBody.prototype.getButtonNameForOperation = function (op) {
        var _a, _b;
        var baseActionName = op.args.button
            ? this.format_string_recursive(op.args.button, op.args.args)
            : this.getButtonNameForOperationExp(op.type);
        var opTargets = (_b = (_a = op.args) === null || _a === void 0 ? void 0 : _a.target) !== null && _b !== void 0 ? _b : [];
        if (opTargets.length == 1) {
            if (op.type.endsWith("nres"))
                return baseActionName;
            if (op.type.startsWith("conv"))
                return baseActionName;
            var onlyAvailableAction = this.getOpTargetName(op, 0);
            return "".concat(baseActionName, " \u2907 ").concat(onlyAvailableAction);
        }
        return baseActionName;
    };
    GameXBody.prototype.getOpTargetName = function (op, num) {
        var _a, _b;
        var opTargets = (_b = (_a = op.args) === null || _a === void 0 ? void 0 : _a.target) !== null && _b !== void 0 ? _b : [];
        switch (op.args.ttype) {
            case "token":
                return this.getTokenName(opTargets[num]);
            case "player":
                return this.getPlayerName(this.getPlayerIdByColor(opTargets[num]));
            case "enum":
                return opTargets[num];
            default:
                return "!";
        }
    };
    GameXBody.prototype.getDivForTracker = function (id, value) {
        if (value === void 0) { value = ""; }
        var res = getPart(id, 1);
        var name = this.getTokenName(id);
        var icon = "<div class=\"token_img tracker_".concat(res, "\" title=\"").concat(name, "\">").concat(value, "</div>");
        return icon;
    };
    GameXBody.prototype.getTokenPresentaton = function (type, tokenKey, args) {
        if (args === void 0) { args = {}; }
        var isString = typeof tokenKey == "string";
        if (isString) {
            if (tokenKey.startsWith("tracker"))
                return this.getDivForTracker(tokenKey);
            if (tokenKey.startsWith("card_main_")) {
                return '<div class="card_hl_tt"  data-clicktt="' + tokenKey + '">' + this.getTokenName(tokenKey) + "</div>";
            }
            return this.getTokenName(tokenKey); // just a name for now
        }
        else {
            if (type == "undo_button") {
                if (args.player_id != this.player_id)
                    return " ";
                return this.createUndoActionDiv(tokenKey).outerHTML;
            }
            if (type == "token_div_count") {
                var id = tokenKey.args["token_name"];
                var mod = tokenKey.args["mod"];
                if (id.startsWith("tracker_m_")) {
                    // just m
                    return this.getDivForTracker(id, mod);
                }
                return undefined; // process by parent
            }
        }
        return undefined; // process by parent
    };
    GameXBody.prototype.getButtonNameForOperationExp = function (op) {
        var rules = this.getRulesFor("op_" + op, "*");
        if (rules && rules.name)
            return this.getTr(rules.name);
        return op;
    };
    GameXBody.prototype.getOperationRules = function (opInfo, key) {
        if (key === void 0) { key = "*"; }
        if (typeof opInfo == "string")
            return this.getRulesFor("op_" + opInfo, key);
        return this.getRulesFor("op_" + opInfo.type, key);
    };
    GameXBody.prototype.onUpdateActionButtons_playerConfirm = function (args) {
        var _this = this;
        this.addActionButton("button_0", _("Confirm"), function () {
            _this.remoteUserAction("confirm");
        });
    };
    GameXBody.prototype.activateSlotForOp = function (tid, opId) {
        if (tid == "none")
            return undefined;
        var divId = this.getActiveSlotRedirect(tid);
        if (divId) {
            this.setActiveSlot(divId);
            this.setReverseIdMap(divId, opId, tid);
        }
        if (tid != divId) {
            var orig = $(tid);
            if (orig) {
                this.setActiveSlot(tid);
                this.setReverseIdMap(tid, opId, tid);
            }
        }
        return divId;
    };
    GameXBody.prototype.setMainOperationType = function (opInfo) {
        var main;
        if (opInfo) {
            main = opInfo.type.replace(/[^a-zA-Z0-9]/g, "");
        }
        else {
            main = "complex";
        }
        $("ebd-body").dataset.maop = main;
        this.currentOperation.opInfo = opInfo;
    };
    GameXBody.prototype.activateSlots = function (opInfo, single) {
        var _this = this;
        var _a, _b;
        if (single === void 0) { single = true; }
        var opId = opInfo.id;
        var opArgs = opInfo.args;
        var opTargets = (_a = opArgs.target) !== null && _a !== void 0 ? _a : [];
        var ttype = (_b = opArgs.ttype) !== null && _b !== void 0 ? _b : "none";
        var from = opInfo.mcount;
        var count = opInfo.count;
        var paramInfo = opArgs.info;
        if (single) {
            this.setDescriptionOnMyTurn(_(opArgs.prompt), opArgs.args);
            // add main operation to the body to change style if need be
            this.setMainOperationType(opInfo);
            if (opArgs.void) {
                this.setDescriptionOnMyTurn(_(opArgs.button) + ": " + _("No valid targets"), opArgs.args);
            }
        }
        if (ttype == "token") {
            var firstTarget_1 = undefined;
            for (var _i = 0, opTargets_1 = opTargets; _i < opTargets_1.length; _i++) {
                var tid = opTargets_1[_i];
                var divId = this.activateSlotForOp(tid, opId);
                if (!firstTarget_1 && divId)
                    firstTarget_1 = divId;
            }
            if (single) {
                if (!firstTarget_1)
                    firstTarget_1 = "generalactions";
                var MAGIC_BUTTONS_NUMBER = 8;
                var MAGIC_HEX_BUTTONS_NUMBER = 5;
                var hex = firstTarget_1.startsWith("hex");
                var showAsButtons = hex ? opTargets.length <= MAGIC_HEX_BUTTONS_NUMBER : opTargets.length <= MAGIC_BUTTONS_NUMBER;
                if (showAsButtons) {
                    this.addTargetButtons(opId, opTargets);
                }
                else if (!hex) {
                    // people confused when buttons are not shown, add button with explanations
                    var name_6 = this.format_string_recursive(_("Where are my ${x} buttons?"), { x: opTargets.length });
                    this.addActionButtonColor("button_x", name_6, function () {
                        _this.removeTooltip("button_x");
                        dojo.destroy("button_x");
                        _this.addTargetButtons(opId, opTargets);
                    }, "orange");
                    this.addTooltip("button_x", _("Buttons are not shows because there are too many choices, click on highlighted element on the game board to select"), _("Click to add buttons"));
                }
                if (hex || firstTarget_1.startsWith("award") || firstTarget_1.startsWith("milestone") || firstTarget_1.startsWith("card_stanproj")) {
                    this.addActionButtonColor("button_map", _("Show on Map"), function () { return $(firstTarget_1).scrollIntoView({ behavior: "smooth", block: "center" }); }, "orange");
                }
            }
        }
        else if (ttype == "player") {
            for (var tid in paramInfo) {
                this.activatePlayerSlot(tid, opId, single, __assign(__assign({}, paramInfo[tid]), { op: opInfo }));
            }
        }
        else if (ttype == "enum") {
            if (single) {
                var customNeeded_1 = undefined;
                opTargets.forEach(function (tid, i) {
                    var detailsInfo = paramInfo[tid];
                    if (tid == "payment") {
                        //show only if options
                        if (Object.entries(detailsInfo.resources).reduce(function (sum, _a) {
                            var key = _a[0], val = _a[1];
                            return sum + (key !== "m" && typeof val === "number" && Number.isInteger(val) ? val : 0);
                        }, 0) > 0) {
                            customNeeded_1 = detailsInfo;
                        }
                    }
                    else {
                        var sign = detailsInfo.sign; // 0 complete payment, -1 incomplete, +1 overpay
                        //console.log("enum details "+tid,detailsInfo);
                        var buttonColor = undefined;
                        if (sign < 0)
                            buttonColor = "gray";
                        if (sign > 0)
                            buttonColor = "red";
                        var divId = "button_" + i;
                        var title = _this.resourcesToHtml(detailsInfo.resources);
                        _this.addActionButtonColor(divId, title, function () { return _this.onSelectTarget(opId, tid); }, buttonColor);
                    }
                });
                if (customNeeded_1)
                    this.addActionButtonColor("btn_create_custompay", _("Custom"), function () { return _this.createCustomPayment(opId, customNeeded_1, opInfo); }, "blue");
            }
        }
        else if (ttype == "none" || !ttype) {
            // no arguments
            if (single) {
                if (count == 1) {
                    this.addActionButton("button_" + opId, _("Confirm"), function () { return _this.sendActionResolve(opId, {}, opInfo); });
                }
                else if (count == from) {
                    this.addActionButton("button_" + opId, _("Confirm") + " " + count, function () { return _this.sendActionResolve(opId, {}, opInfo); });
                }
                else {
                    var _loop_3 = function (i) {
                        this_3.addActionButton("button_".concat(opId, "_").concat(i), i, function () { return _this.sendActionResolveWithCount(opId, i); });
                    };
                    var this_3 = this;
                    // counter select stub for now
                    for (var i = from == 0 ? 1 : from; i < count; i++) {
                        _loop_3(i);
                    }
                    if (count >= 1) {
                        this.addActionButton("button_" + opId + "_max", count + " (" + _("max") + ")", function () {
                            _this.sendActionResolveWithCount(opId, count);
                        });
                    }
                }
            }
        }
        else if (ttype == "token_array") {
            // cannot use client state because multiplayer screws this up
            if (single) {
                this.activateMultiSelectionPrompt(opInfo);
            }
        }
        else if (ttype) {
            console.error("Unknown type " + ttype, opInfo);
        }
        if (single) {
            if (opArgs.skipname) {
                if (opInfo.numops > 1) {
                    this.addActionButtonColor("button_".concat(opId, "_0"), _(opArgs.skipname), function () { return _this.sendActionResolveWithCount(opId, 0); }, "orange");
                }
                else {
                    this.addActionButtonColor("button_skip", _(opArgs.skipname), function () { return _this.sendActionSkip(opId); }, "orange");
                }
                if (opArgs.nvt) {
                    // no valid target, remove Confirm button
                    var buttonId = "button_" + opId;
                    if ($(buttonId)) {
                        $(buttonId).classList.add(this.classButtonDisabled);
                        $(buttonId).title = _("Cannot use this action because no valid targets for operation");
                    }
                }
            }
        }
    };
    GameXBody.prototype.activateMultiSelectionPrompt = function (opInfo) {
        var _this = this;
        var _a, _b;
        var opId = opInfo.id;
        var opArgs = opInfo.args;
        var opTargets = (_a = opArgs.target) !== null && _a !== void 0 ? _a : [];
        var ttype = (_b = opArgs.ttype) !== null && _b !== void 0 ? _b : "none";
        var skippable = !!opArgs.skipname;
        var buttonName = _(opArgs.args.name);
        var buttonId = "button_done";
        var cancelButtonId = "button_cancel";
        var onUpdate = function () {
            var count = document.querySelectorAll(".".concat(_this.classSelected)).length;
            if ($(buttonId)) {
                if ((count == 0 && skippable) || opInfo.mcount > count) {
                    $(buttonId).classList.add(_this.classButtonDisabled);
                    $(buttonId).title = _("Cannot use this action because insuffient amount of elements selected");
                }
                else {
                    $(buttonId).classList.remove(_this.classButtonDisabled);
                    $(buttonId).title = "";
                }
            }
            if (count > 0) {
                _this.addActionButtonColor(cancelButtonId, _("Reset"), function () {
                    _this.removeAllClasses(_this.classSelected);
                    onUpdate();
                }, "red");
                if ($("button_undo"))
                    $("button_undo").remove();
            }
            else {
                if ($(cancelButtonId))
                    dojo.destroy(cancelButtonId);
                _this.addUndoButton();
            }
            if ($(buttonId)) {
                $(buttonId).innerHTML = buttonName + ": " + count;
            }
        };
        // Init
        this.clearReverseIdMap();
        // this.removeAllClasses(this.classSelected); - this causing issue when other player does undo
        this.setActiveSlots(opTargets);
        this.addActionButtonColor(buttonId, buttonName, function () {
            var target = _this.queryIds(".".concat(_this.classSelected));
            return _this.sendActionResolve(opId, { target: target }, opInfo, function (err) {
                if (!err) {
                    _this.removeAllClasses(_this.classSelected);
                    onUpdate();
                    _this.removeAllClasses(_this.classActiveSlot);
                }
            });
        }, "blue");
        onUpdate();
        this["onToken_".concat(ttype)] = function (tid) {
            $(tid).classList.toggle(_this.classSelected);
            onUpdate();
        };
    };
    GameXBody.prototype.addTargetButtons = function (opId, opTargets) {
        var _this = this;
        if (opTargets.length == 0) {
            this.addActionButtonColor("button_0", _("No valid targets"), function () { return _this.sendActionResolveWithCount(opId, 0); }, "orange");
        }
        opTargets.forEach(function (tid) {
            _this.addActionButtonColor("button_" + tid, _this.getTokenName(tid), function () {
                _this.sendActionResolve(opId, { target: tid });
            }, tid == "none" ? "orange" : "targetcolor");
        });
    };
    /**
     * Activate player for the operation
     * @param color - player color or word 'none'
     * @param opId - operation id to map
     * @param single - if signle is true add button also
     * @param info - extra data about the player (i.e. why its not applicable)
     */
    GameXBody.prototype.activatePlayerSlot = function (color, opId, single, info) {
        var _this = this;
        // color is player color or word 'none'
        var playerId = this.getPlayerIdByColor(color);
        // here divId can be like player name on miniboard
        var divId = "player_name_".concat(playerId);
        var valid = info ? info.q == 0 : true; // if info passed its only valid when q is 0
        if (valid && playerId)
            this.setReverseIdMap(divId, opId, color);
        if (!single)
            return;
        var buttonId = "button_" + color;
        var buttonDisable = !valid;
        var buttonDiv = this.addActionButtonPlayer(buttonId, color, function () { return _this.onSelectTarget(opId, color); }, buttonDisable);
        if (!buttonDiv)
            return;
        // if name is not set its not a real player
        if (!playerId)
            return;
        if (!info)
            return;
        // count of resources
        //  action coutn info.op?.count // not used now
        var you = this.player_id == playerId;
        if (info.max !== undefined) {
            buttonDiv.innerHTML +=
                " " +
                    this.format_string_recursive(you ? _("(own ${res_count})") : _("(owns ${res_count})"), {
                        res_count: info.max
                    });
        }
        // player is protected from attack
        if (info.q == this.gamedatas.CON.MA_ERR_PROTECTED) {
            buttonDiv.innerHTML += " " + _("(protected)");
        }
        if (info.q !== "0") {
            buttonDiv.title = this.getTokenName("err_".concat(info.q));
        }
    };
    /** When server wants to activate some element, ui may adjust it */
    GameXBody.prototype.getActiveSlotRedirect = function (_node) {
        var node = $(_node);
        if (!node) {
            console.error("Not found for active slot " + _node);
            return undefined;
        }
        var id = node.id;
        if (!id)
            return undefined;
        var target = id;
        if (!this.isLayoutFull()) {
            if (id.startsWith("tracker_p_")) {
                target = id.replace("tracker_p_", "playergroup_plants_");
            }
            else if (id.startsWith("tracker_h_")) {
                target = id.replace("tracker_h_", "playergroup_heat_");
            }
            else if (id.startsWith("card_corp_")) {
                var tableau = node.parentElement.id;
                var pcolor = getPart(tableau, 1);
                target = "tableau_".concat(pcolor, "_corp_logo");
            }
        }
        return target;
    };
    //Adds the payment picker according to available alternative payment options
    GameXBody.prototype.createCustomPayment = function (opId, info, opInfo) {
        var _this = this;
        var _a, _b;
        this.custom_pay = {
            needed: info.count,
            selected: {},
            available: [],
            rate: []
        };
        if ($("btn_create_custompay"))
            $("btn_create_custompay").remove();
        var items_htm = "";
        var targetRes = (_b = (_a = opInfo === null || opInfo === void 0 ? void 0 : opInfo.type) === null || _a === void 0 ? void 0 : _a.substring(1, 2)) !== null && _b !== void 0 ? _b : "m";
        for (var res in info.resources) {
            this.custom_pay.selected[res] = 0;
            this.custom_pay.available[res] = info.resources[res];
            this.custom_pay.rate[res] = info.rate[res];
            //megacredits are spent automatically
            if (res == targetRes) {
                this.custom_pay.selected[res] = this.custom_pay.available[res];
                continue;
            }
            if (this.custom_pay.available[res] <= 0)
                continue;
            //add paiments buttons
            items_htm += "\n        <div class=\"payment_group\">\n          <div class=\"token_img tracker_".concat(res, "\"></div>\n          <div class=\"item_worth\">\n               <div class=\"token_img tracker_m payment_item\">").concat(this.custom_pay.rate[res], "</div>\n          </div>\n          <div id=\"payment_item_minus_").concat(res, "\" class=\"btn_payment_item btn_item_minus\" data-resource=\"").concat(res, "\" data-direction=\"minus\">-</div>\n          <div id=\"payment_item_").concat(res, "\" class=\"payment_item_value item_value_").concat(res, "\">0</div>\n          <div id=\"payment_item_plus_").concat(res, "\" class=\"btn_payment_item btn_item_plus\" data-resource=\"").concat(res, "\" data-direction=\"plus\">+</div>                \n        </div>\n      ");
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
        var node = this.createDivNode("custom_paiement", "", "gameaction_status_wrap"); //was general_actions
        node.innerHTML = paiement_htm;
        //adds actions to button payments
        document.querySelectorAll(".btn_payment_item").forEach(function (node) {
            node.addEventListener("click", function (event) {
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
                    if (res_1 != targetRes) {
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
                _this.custom_pay.selected[targetRes] = mc;
                //   values_htm+=` <div class="token_img tracker_m payment_item">${mc}</div>`;
                var values_htm = _this.resourcesToHtml(_this.custom_pay.selected, true);
                $("btn_custompay_send").innerHTML = "Pay %s".replace("%s", values_htm);
            });
        });
        // connectClass is not suitable for temp objects, it leaves refernce in memory
        //this.connectClass("btn_payment_item", "onclick", (event) => {   });
        //adds action to final payment button
        $("btn_custompay_send").addEventListener("click", function () {
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
        var trackers = this.resourceTrackers.concat("resMicrobe", "resFloater");
        trackers.forEach(function (item) {
            var value = resources[item];
            if (value !== undefined && (value > 0 || show_zeroes === true)) {
                htm += "<div class=\"token_img tracker_".concat(item, " payment_item\">").concat(value, "</div>");
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
    GameXBody.prototype.addActionButtonColor = function (buttonId, name, handler, buttonColor, playerColor, disabled) {
        if (buttonColor === void 0) { buttonColor = "blue"; }
        if (playerColor === void 0) { playerColor = undefined; }
        if (disabled === void 0) { disabled = false; }
        this.addActionButton(buttonId, name, handler);
        var buttonDiv = $(buttonId);
        if (playerColor && playerColor != this.player_color && playerColor != "none")
            buttonDiv.classList.add("otherplayer", "plcolor_" + playerColor);
        if (buttonColor) {
            buttonDiv.classList.remove("bgabutton_blue");
            buttonDiv.classList.add("bgabutton_" + buttonColor);
        }
        if (disabled) {
            buttonDiv.classList.add(this.classButtonDisabled);
        }
        buttonDiv.classList.add("ma_button"); // to allow more styling if needed
        return buttonDiv;
    };
    GameXBody.prototype.addActionButtonPlayer = function (buttonId, playerColor, handler, disabled) {
        if (disabled === void 0) { disabled = false; }
        if (playerColor === "none") {
            return this.addActionButtonColor(buttonId, _("None"), handler, "orange", undefined, disabled);
        }
        var playerId = this.getPlayerIdByColor(playerColor);
        if (!playerId)
            return undefined; // invalid?
        var name = playerId == this.player_id ? this.divYou() : this.divColoredPlayer(playerId);
        var buttonDiv = this.addActionButtonColor(buttonId, name, handler, "gray", undefined, disabled);
        buttonDiv.classList.add("otherplayer", "plcolor_" + playerColor);
        var logo = this.cloneAndFixIds("miniboard_corp_logo_".concat(playerColor), "bar", true);
        logo.classList.remove("miniboard_corp_logo");
        buttonDiv.innerHTML = logo.outerHTML + " " + name;
        return buttonDiv;
    };
    GameXBody.prototype.completeOpInfo = function (opId, opInfo, xop, num) {
        var _a;
        try {
            // server may skip sending some data, this will feel all omitted fields
            opInfo.id = opId; // should be already there but just in case
            opInfo.xop = xop; // parent op
            opInfo.numops = num; // number of siblings
            opInfo.count = parseInt(opInfo.count);
            if (opInfo.mcount === undefined)
                opInfo.mcount = opInfo.count;
            else
                opInfo.mcount = parseInt(opInfo.mcount);
            var opArgs_1 = opInfo.args;
            if (opArgs_1.void === undefined)
                opArgs_1.void = false;
            if (opArgs_1.ack === undefined)
                opArgs_1.ack = false;
            else
                opArgs_1.ack = true;
            if (!opArgs_1.info)
                opArgs_1.info = {};
            if (!opArgs_1.target)
                opArgs_1.target = [];
            opArgs_1.o = parseInt(opArgs_1.o) || 0;
            var infokeys = Object.keys(opArgs_1.info);
            if (infokeys.length == 0 && opArgs_1.target.length > 0) {
                opArgs_1.target.forEach(function (element) {
                    opArgs_1.info[element] = { q: 0 };
                });
            }
            else if (infokeys.length > 0 && opArgs_1.target.length == 0) {
                infokeys.forEach(function (element) {
                    if (opArgs_1.info[element].q == 0)
                        opArgs_1.target.push(element);
                });
            }
            if (!opArgs_1.prompt)
                opArgs_1.prompt = (_a = this.getOperationRules(opInfo, "prompt")) !== null && _a !== void 0 ? _a : _("${you} must choose");
        }
        catch (e) {
            console.error(e);
        }
    };
    GameXBody.prototype.sortOrderOps = function (args) {
        var xop = args.op;
        var operations = args.operations;
        var sortedOps = Object.keys(operations);
        if (xop != "+")
            return sortedOps;
        sortedOps.sort(function (x1, y1) {
            var x = operations[x1].args.o;
            var y = operations[y1].args.o;
            if (x < y) {
                return -1;
            }
            if (x > y) {
                return 1;
            }
            return 0;
        });
        return sortedOps;
    };
    GameXBody.prototype.onUpdateActionButtons_playerTurnChoice = function (args) {
        var _this = this;
        var _a, _b, _c;
        var operations = args.operations;
        if (!operations)
            return; // XXX
        this.clientStateArgs.call = "resolve";
        this.clientStateArgs.ops = [];
        this.clearReverseIdMap();
        this.setMainOperationType(undefined);
        this.setSubTitle(" ");
        var xop = args.op;
        var sortedOps = Object.keys(operations);
        var single = sortedOps.length == 1;
        var ordered = xop == "," && !single;
        var chooseorder = xop == "+" && !single;
        if (chooseorder) {
            this.setDescriptionOnMyTurn(_("${you} must choose order of operations"));
            sortedOps = this.sortOrderOps(args);
        }
        var allSkip = true;
        var numops = [];
        var _loop_4 = function (i) {
            var opIdS = sortedOps[i];
            var opId = parseInt(opIdS);
            var opInfo = operations[opId];
            this_4.completeOpInfo(opId, opInfo, xop, sortedOps.length);
            numops.push(opId);
            var opArgs = opInfo.args;
            var name_7 = this_4.getButtonNameForOperation(opInfo);
            var singleOrFirst = single || (ordered && i == 0);
            this_4.updateVisualsFromOp(opInfo, opId);
            // update screen with activate slots for:
            // - single action
            // - first if ordered
            // - all if choice required (!ordered)
            if (singleOrFirst || !ordered) {
                this_4.activateSlots(opInfo, singleOrFirst);
                this_4.updateHandInformation(opInfo.args.info, opInfo.type);
            }
            // if more than one action and they are no ordered add buttons for each
            // xxx add something for remaining ops in ordered case?
            if (!single && !ordered) {
                // temp hack
                if (opInfo.type === "passauto")
                    return "continue";
                this_4.addActionButtonColor("button_".concat(opId), name_7, function () { return _this.onOperationButton(opInfo); }, (_b = (_a = opInfo.args) === null || _a === void 0 ? void 0 : _a.args) === null || _b === void 0 ? void 0 : _b.bcolor, opInfo.owner, opArgs.void);
                if (opArgs.void) {
                    $("button_".concat(opId)).title = this_4.extractError(opInfo, _("Operation cannot be executed"));
                }
            }
            if (!ordered && !chooseorder && i == 0) {
                var tr = void 0;
                if ((_c = opInfo.args) === null || _c === void 0 ? void 0 : _c.reason) {
                    tr = this_4.getTr(opInfo.args.reason);
                }
                else if (opInfo.data) {
                    var data = opInfo.data.split(":")[0];
                    tr = this_4.getTokenName(data);
                }
                if (tr) {
                    this_4.setMainTitle(" [".concat(tr, "]"), true); // TODO
                }
            }
            // add done (skip) when all optional
            if (opInfo.mcount > 0) {
                allSkip = false;
            }
        };
        var this_4 = this;
        for (var i = 0; i < sortedOps.length; i++) {
            _loop_4(i);
        }
        if (allSkip && !single) {
            this.addActionButtonColor("button_skip", _("Skip All"), function () { return _this.sendActionSkip.apply(_this, numops); }, "red");
        }
        if (chooseorder)
            this.addActionButtonColor("button_whatever", _("Whatever"), function () { return _this.remoteUserAction("whatever", {}); }, "orange");
    };
    GameXBody.prototype.extractError = function (opInfo, errorPrefix) {
        var opArgs = opInfo.args;
        var argsInfo = opArgs.info;
        for (var key in argsInfo) {
            var elem = argsInfo[key];
            if (elem.q != 0) {
                return errorPrefix + ": " + this.getTokenName("err_" + elem.q);
            }
        }
        return errorPrefix + ": " + _("No valid targets");
    };
    GameXBody.prototype.onOperationButton = function (opInfo, clientState) {
        var _this = this;
        var _a, _b;
        if (clientState === void 0) { clientState = true; }
        var opTargets = (_b = (_a = opInfo.args) === null || _a === void 0 ? void 0 : _a.target) !== null && _b !== void 0 ? _b : [];
        var opId = opInfo.id;
        var ack = opInfo.args.ack == 1;
        if (!ack && opInfo.mcount > 0 && opTargets.length == 1) {
            // mandatory and only one choice
            this.sendActionResolve(opId, { target: opTargets[0] }, opInfo);
        }
        else if (!ack && opTargets.length == 0) {
            this.sendActionResolve(opId, {}, opInfo); // operations without targets
        }
        else if (opInfo.owner !== this.player_color) {
            var prompt_1 = _("The control will be passed to another player and you cannot undo this action");
            this.withConfirmation(prompt_1, function () { return _this.remoteUserAction("choose", { op: opId }); });
        }
        else {
            if (clientState)
                this.setClientStateUpdOn("client_collect", function (args) {
                    // on update action buttons
                    _this.clearReverseIdMap();
                    _this.activateSlots(opInfo, true);
                }, function (tokenId) {
                    // onToken
                    return _this.onSelectTarget(opId, tokenId, true);
                });
            else {
                // no client state
                this.clearReverseIdMap();
                dojo.empty("generalactions");
                this.activateSlots(opInfo, true);
                this.addCancelButton();
            }
        }
    };
    GameXBody.prototype.addOutOfTurnOperationButtons = function (args) {
        var _this = this;
        var _a, _b;
        var operations = args === null || args === void 0 ? void 0 : args.operations;
        if (!operations)
            return; // XXX
        var sortedOps = Object.keys(operations);
        var _loop_5 = function (i) {
            var opIdS = sortedOps[i];
            var opId = parseInt(opIdS);
            var opInfo = operations[opId];
            this_5.completeOpInfo(opId, opInfo, args.op, sortedOps.length);
            opInfo.ooturn = true;
            var opArgs = opInfo.args;
            if (opArgs.void)
                return "continue";
            var name_8 = this_5.getButtonNameForOperation(opInfo);
            this_5.addActionButtonColor("button_".concat(opId), name_8, function () { return _this.onOperationButton(opInfo, false); }, (_b = (_a = opInfo.args) === null || _a === void 0 ? void 0 : _a.args) === null || _b === void 0 ? void 0 : _b.bcolor, opInfo.owner, opArgs.void);
        };
        var this_5 = this;
        for (var i = 0; i < sortedOps.length; i++) {
            _loop_5(i);
        }
    };
    GameXBody.prototype.addUndoButton = function () {
        var _this = this;
        if (!$("button_undo") && !this.isSpectator) {
            this.addActionButtonColor("button_undo", _("Undo"), function () { return _this.sendActionUndo(); }, "red");
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
    GameXBody.prototype.onUpdateActionButtons_after = function (stateName, args) {
        var _a;
        if (this.isCurrentPlayerActive()) {
            // add undo on every state
            if (this.on_client_state)
                this.addCancelButton();
            else
                this.addUndoButton();
        }
        else if (stateName == "multiplayerDispatch" || stateName == "client_collectMultiple") {
            this.addUndoButton();
        }
        if ((args === null || args === void 0 ? void 0 : args.ooturn) && !this.isSpectator) {
            //add buttons for out of turn actions for all players
            this.addOutOfTurnOperationButtons((_a = args === null || args === void 0 ? void 0 : args.ooturn) === null || _a === void 0 ? void 0 : _a.player_operations[this.player_id]);
        }
        var parent = document.querySelector(".debug_section"); // studio only
        if (parent)
            this.addActionButton("button_rcss", "Reload CSS", function () { return reloadCss(); });
        if (!this.isCurrentPlayerActive()) {
            if (stateName == "playerTurnChoice" && (args === null || args === void 0 ? void 0 : args.master) && (args === null || args === void 0 ? void 0 : args.master) != this.getActivePlayerId()) {
                this.setDescriptionOnMyTurn(_("${player_name} is performing out of turn action"), {
                    player_name: this.divColoredPlayer(this.getActivePlayerId())
                });
            }
        }
    };
    GameXBody.prototype.onSelectTarget = function (opId, target, checkActive) {
        if (checkActive === void 0) { checkActive = false; }
        // can add prompt
        if ($(target) && checkActive && !this.checkActiveSlot(target))
            return;
        return this.sendActionResolve(opId, { target: target });
    };
    // on click hooks
    GameXBody.prototype.onToken_playerTurnChoice = function (tid) {
        var _a, _b, _c;
        //debugger;
        if (!tid)
            return;
        var info = this.reverseIdLookup.get(tid);
        if (info && info !== "0") {
            var opId = info.op;
            if (info.param_name == "target")
                this.onSelectTarget(opId, (_a = info.target) !== null && _a !== void 0 ? _a : tid);
            else
                this.showError("Not implemented");
        }
        else if ($(tid).classList.contains(this.classActiveSlot)) {
            var ttype = (_c = (_b = this.currentOperation.opInfo) === null || _b === void 0 ? void 0 : _b.args) === null || _c === void 0 ? void 0 : _c.ttype;
            if (ttype) {
                var methodName = "onToken_" + ttype;
                var ret = this.callfn(methodName, tid);
                if (ret === undefined)
                    return false;
                return true;
            }
            else {
                $(tid).classList.toggle(this.classSelected); // fallback
                this.showError("Not implemented");
                return false;
            }
        }
        else if (tid.endsWith("discard_main") || tid.endsWith("deck_main")) {
            this.showError(_("Cannot inspect deck or discard content - not allowed by the rules"));
        }
        else if (tid.startsWith("card_")) {
            if (tid.endsWith("help"))
                return;
            this.showHiddenContent($(tid).parentElement.id, _("Pile contents"), tid);
        }
        else if (tid.startsWith("marker_")) {
            // propagate to parent
            this.onToken_playerTurnChoice($(tid).parentNode.id);
        }
        else {
            return false;
        }
        return true;
    };
    GameXBody.prototype.onToken_multiplayerChoice = function (tid) {
        this.onToken_playerTurnChoice(tid);
    };
    GameXBody.prototype.onToken_multiplayerDispatch = function (tid) {
        this.onToken_playerTurnChoice(tid);
    };
    //custom actions
    GameXBody.prototype.combineTooltips = function (parentNode) {
        var _a, _b;
        var childNodes = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            childNodes[_i - 1] = arguments[_i];
        }
        // combine parent and child tooltips and stuck to parnet, remove child one
        if (!parentNode)
            return;
        if (!parentNode.id)
            return;
        if (!parentNode.classList.contains("withtooltip"))
            return;
        var parentId = parentNode.id;
        var parenttt = this.tooltips[parentId];
        if (parenttt) {
            var parentToken = (_a = parentNode.dataset.tt_token) !== null && _a !== void 0 ? _a : parentId;
            var newhtml = this.getTooltipHtmlForToken(parentToken);
            for (var _c = 0, childNodes_1 = childNodes; _c < childNodes_1.length; _c++) {
                var childNode = childNodes_1[_c];
                if (!childNode)
                    return;
                if (!childNode.id)
                    return;
                if (!childNode.classList.contains("withtooltip"))
                    return;
                var childToken = (_b = childNode.dataset.tt_token) !== null && _b !== void 0 ? _b : childNode.id;
                newhtml += this.getTooltipHtmlForToken(childToken);
                this.removeTooltip(childNode.id);
            }
            this.addTooltipHtml(parentId, newhtml, parenttt.showDelay);
        }
    };
    // stack or combined tooltips
    GameXBody.prototype.handleStackedTooltips = function (attachNode) {
        var parentId = attachNode.parentElement.id;
        if (attachNode.childElementCount > 0) {
            if (attachNode.id.startsWith("hex")) {
                this.removeTooltip(attachNode.id);
                return;
            }
        }
        var markers = attachNode.querySelectorAll(".marker");
        var elems = Array.from(markers);
        if (parentId === null || parentId === void 0 ? void 0 : parentId.startsWith("hex")) {
            // remove tooltip from parent, it will likely just collide
            this.removeTooltip(parentId);
            elems.push(attachNode.parentElement);
        }
        if (elems.length > 0)
            this.combineTooltips.apply(this, __spreadArray([attachNode], elems, false));
        // sometimes parent are added first and sometimes child, have to handle both independency here...
        if (attachNode.id.startsWith("marker_")) {
            this.handleStackedTooltips(attachNode.parentElement);
            return;
        }
    };
    // notifications
    GameXBody.prototype.setupNotifications = function () {
        _super.prototype.setupNotifications.call(this);
        dojo.subscribe("tokensUpdate", this, "notif_tokensUpdate");
        this.notifqueue.setSynchronous("tokensUpdate", 50);
        dojo.subscribe("scoringTable", this, "notif_scoringTable");
        //this.notifqueue.setSynchronous("scoringTable", 50);
        dojo.subscribe("undoMove", this, "notif_undoMove");
        dojo.subscribe("undoRestore", this, "notif_undoRestore");
    };
    GameXBody.prototype.notif_animate = function (notif) {
        this.notifqueue.setSynchronousDuration(this.customAnimation.getWaitDuration(notif.args.time));
    };
    GameXBody.prototype.notif_undoMove = function (notif) {
        console.log("undoMove", notif);
        this.setUndoMove(notif.args, notif.move_id);
    };
    GameXBody.prototype.notif_undoRestore = function (notif) {
        console.log("undoRestore", notif);
        this.cancelLogs(notif.args.cancelledIds);
    };
    GameXBody.prototype.onLeavingState = function (stateName) {
        var _a;
        _super.prototype.onLeavingState.call(this, stateName);
        (_a = this.handman) === null || _a === void 0 ? void 0 : _a.saveSort();
    };
    GameXBody.prototype.setUndoMove = function (undoMeta, currentMove) {
        var _this = this;
        if (!undoMeta)
            return;
        var undoMove = undoMeta.move_id;
        var player_id = undoMeta.player_id;
        this.gamedatas.undo_move = undoMove;
        this.gamedatas.undo_player_id = player_id;
        this.gamedatas.undo_moves[undoMove] = undoMeta;
        document.querySelectorAll(".undomarker").forEach(function (node) {
            if (undoMeta.barrier && node.dataset.move != undoMove)
                node.classList.add("disabled");
            else
                node.classList.remove("disabled");
            //if (parseInt(node.dataset.move) >= currentMove) node.classList.add("disabled");
            if (node.dataset.move == undoMove) {
                node.parentElement.parentElement.classList.remove("log_replayable");
                _this.removeTooltip(node.parentElement.parentElement.id);
            }
        });
        if (undoMeta.barrier) {
            this.gamedatas.undo_moves = {}; // wipe
            this.gamedatas.undo_moves[undoMove] = undoMeta;
        }
        this.cancelLogs(undoMeta.cancelledIds);
    };
    GameXBody.prototype.createUndoActionDiv = function (move_id) {
        var div = dojo.create("div", {
            innerHTML: "Undo",
            class: "undomarker bgabutton bgabutton_red",
            title: _("Click to undo your move up to this point"),
            onclick: "gameui.sendActionUndo(".concat(move_id, ")")
        });
        div.dataset.move = move_id;
        return div;
    };
    //get settings
    GameXBody.prototype.getSetting = function (key) {
        //doesn't work.
        // return this.localSettings.readProp(key);
        return $("ebd-body").dataset["localsetting_" + key];
    };
    //Prevent moving parts when animations are set to none
    GameXBody.prototype.phantomMove = function (mobileId, newparentId, duration, mobileStyle, onEnd) {
        if (!this.customAnimation.areAnimationsPlayed()) {
            return _super.prototype.phantomMove.call(this, mobileId, newparentId, 0, mobileStyle, onEnd);
        }
        else {
            return _super.prototype.phantomMove.call(this, mobileId, newparentId, duration, mobileStyle, onEnd);
        }
    };
    GameXBody.prototype.extractTokenText = function (node1, options) {
        var node = $(node1);
        if (!node.id)
            return;
        var text = "";
        if (node.id.startsWith("card")) {
            var name_9 = node.dataset.name;
            var dcost = node.dataset.discount_cost;
            var cost = this.getRulesFor(node.id, "cost", 0);
            text += "[".concat(name_9, "]");
            if (cost && (options === null || options === void 0 ? void 0 : options.showCost)) {
                if (dcost !== undefined && cost != dcost) {
                    text += " ".concat(cost, "(").concat(dcost, ")ME");
                }
                else
                    text += " ".concat(cost, "ME");
            }
            var vp = node.dataset.vp;
            if (vp !== undefined && (options === null || options === void 0 ? void 0 : options.showVp)) {
                text += " ".concat(vp, "VP");
            }
            var res = node.dataset.resource_counter;
            if (res) {
                text += " ".concat(res, "RES");
            }
            return text;
        }
        if (node.id.startsWith("tile")) {
            var hex = node.parentNode;
            var hexname = hex.dataset.name;
            var tile = node;
            text += "".concat(hexname, ": ");
            var name_10 = tile.dataset.name;
            text += "[".concat(name_10, "]");
            var state = tile.dataset.state;
            if (state && state != "0") {
                var pid = this.getPlayerIdByNo(state);
                text += " ".concat(this.getPlayerName(pid), "(").concat(this.getPlayerColor(pid), ")");
            }
            var vp = tile.dataset.vp;
            if (vp !== undefined && (options === null || options === void 0 ? void 0 : options.showVp)) {
                text += " ".concat(vp, "VP");
            }
            return text;
        }
        if (node.id.startsWith("tracker")) {
            var name_11 = node.dataset.name;
            var state = node.dataset.state;
            text = "".concat(name_11, " ").concat(state);
            return text;
        }
        return node.id;
    };
    GameXBody.prototype.extractPileText = function (title, query, options) {
        var _this = this;
        var text = title + ": \n";
        document.querySelectorAll(query).forEach(function (node) {
            var inner = _this.extractTokenText(node, options);
            if (!inner)
                return; // skip empty
            text += "  " + inner + "\n";
        });
        return text;
    };
    GameXBody.prototype.extractTextGameInfo = function () {
        var text = "";
        text += "Current player ".concat(this.getPlayerName(this.player_id), " ").concat(this.player_color, "\n");
        var move = this.gamedatas.notifications.move_nbr;
        text += "Current move ".concat(move, "\n");
        var plcolor = this.player_color;
        text += this.extractPileText("HAND", ".hand_".concat(plcolor, " .card"), { showCost: true });
        var num = Object.keys(this.gamedatas.players).length;
        text += "PLAYERS: ".concat(num, "\n");
        for (var plid in this.gamedatas.players) {
            var plcolor_1 = this.getPlayerColor(parseInt(plid));
            var info = this.gamedatas.players[plid];
            text += "PLAYER: ".concat(info.name, " ").concat(info.color, " ").concat(info.zombie ? "ZOMBIE" : "", "\n");
            text += this.extractPileText("PLAYED", ".tableau_".concat(plcolor_1, " .card"), { showVp: true });
            text += this.extractPileText("RESOURCES", "#playerboard_".concat(plcolor_1, " .tracker"));
        }
        var map = this.getMapNumber();
        text += this.extractPileText("MAP #".concat(map), ".map .tile", { showVp: true });
        return text;
    };
    GameXBody.prototype.checkTerraformingCompletion = function () {
        if (this.isDoingSetup)
            return;
        var o = parseInt($("tracker_o").dataset.state);
        var t = parseInt($("tracker_t").dataset.state);
        var w = parseInt($("tracker_w").dataset.state);
        var o_max = this.getRulesFor("tracker_o", "max");
        var t_max = this.getRulesFor("tracker_t", "max");
        var w_max = this.getRulesFor("tracker_w", "max");
        if (o >= o_max && t >= t_max && w >= w_max) {
            var htm = '<div id="terraforming_complete" class="terraforming_complete">⚠️' + _("The terraforming is complete") + "</div>";
            if (!$("terraforming_complete"))
                $("game_play_area").insertAdjacentHTML("afterbegin", htm);
        }
        else {
            if ($("$terraforming_complete"))
                dojo.destroy($("$terraforming_complete"));
        }
    };
    GameXBody.prototype.onLoadingLogsComplete = function () {
        var _this = this;
        _super.prototype.onLoadingLogsComplete.call(this);
        var currentMove = parseInt(this.gamedatas.notifications.move_nbr);
        var undoMove = parseInt(this.gamedatas.undo_move);
        this.cancelLogs(this.gamedatas.cancelledIds);
        console.log("undo move", undoMove, currentMove);
        document.querySelectorAll(".undomarker").forEach(function (node) {
            var lognode = node.parentElement.parentElement;
            lognode.classList.remove("log_replayable");
            lognode.classList.add("log_hidden");
            lognode.style.removeProperty("display");
            lognode.style.removeProperty("color");
            if (parseInt(node.dataset.move) < undoMove) {
                node.classList.add("disabled");
            }
            else {
                lognode.classList.remove("log_hidden");
                console.log("last move", node.dataset.move, lognode.id);
            }
            _this.removeTooltip(node.parentElement.parentElement.id);
        });
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
        if (props === void 0) { props = []; }
        this.gameName = gameName;
        this.props = props;
    }
    //loads setttings, apply data values to main body
    LocalSettings.prototype.setup = function () {
        //this.load();
        for (var _i = 0, _a = this.props; _i < _a.length; _i++) {
            var prop = _a[_i];
            var stored = this.readProp(prop.key, undefined);
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
    LocalSettings.prototype.renderContents = function (parentId, resetHandler) {
        var _this = this;
        if (!document.getElementById(parentId))
            return false;
        $(parentId)
            .querySelectorAll(".localsettings_window")
            .forEach(function (node) {
            dojo.destroy(node); // on undo this remains but another one generated
        });
        var title = _("Local Settings");
        var htmcontents = "";
        for (var _i = 0, _a = this.props; _i < _a.length; _i++) {
            var prop = _a[_i];
            if (prop.ui !== false)
                htmcontents = htmcontents + '<div class="localsettings_group">' + this.renderProp(prop) + "</div>";
        }
        var htm = "\n      <div id=\"".concat(this.getDivId(), "\" class=\"localsettings_window\">\n         <div class=\"localsettings_header\">").concat(title, "</div>\n         ").concat(htmcontents, "\n      </div>\n      ");
        document.getElementById(parentId).insertAdjacentHTML("beforeend", htm);
        //add interactivity
        for (var _b = 0, _c = this.props; _b < _c.length; _b++) {
            var prop = _c[_b];
            if (prop.ui !== false)
                this.actionProp(prop);
        }
        var restore_tooltip = _("Click to restore all local setting to original values (all tables, this browser)");
        var restore_title = _("Restore all local settings");
        var restoreDiv = dojo.create("a", {
            id: "localsettings_restore",
            class: "action-button bgabutton bgabutton_gray",
            innerHTML: "<span title=\"".concat(restore_tooltip, "\">").concat(restore_title, "</span> <span title=\"").concat(restore_tooltip, "\" class=\"fa fa-eraser\"></span>"),
            onclick: function (event) {
                var target = event.target;
                _this.clear();
                _this.setup();
                _this.renderContents(parentId, resetHandler);
                if (resetHandler)
                    resetHandler();
            },
            target: "_blank"
        });
        var node = document.getElementById(this.getDivId());
        node.appendChild(restoreDiv);
        return true;
    };
    LocalSettings.prototype.getDivId = function () {
        return "".concat(this.gameName, "_localsettings_window");
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
            if (newvalue === undefined)
                newvalue = prop.default;
            if (newvalue) {
                var key = Object.keys(prop.choice)[0];
                prop.value = key !== null && key !== void 0 ? key : String(newvalue);
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
    LocalSettings.prototype.clear = function () {
        localStorage.clear();
    };
    LocalSettings.prototype.getLocalStorageItemId = function (key) {
        return this.gameName + "." + key;
    };
    LocalSettings.prototype.readProp = function (key, def) {
        var value = localStorage.getItem(this.getLocalStorageItemId(key));
        if (value === undefined || value === null)
            return def;
        return value;
    };
    LocalSettings.prototype.writeProp = function (key, val) {
        try {
            localStorage.setItem(this.getLocalStorageItemId(key), val);
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
        this.nominations = [10, 5, 1];
        this.nominationSize = {
            10: 30,
            5: 25,
            1: 10
        };
        this.game = game;
        this.resclass = resclass;
        this.zoneId = zoneId;
        this.supplyId = "main_board";
    }
    ScatteredResourceZone.prototype.setValue = function (value, redraw) {
        if (redraw === void 0) { redraw = true; }
        this.value = value;
        if (redraw)
            this.redraw();
    };
    ScatteredResourceZone.prototype.redraw = function () {
        var divZone = $(this.zoneId);
        if (!divZone)
            return;
        var prevValue = divZone.getAttribute("data-state") || 0;
        var newValue = this.value;
        var diff = newValue - prevValue;
        divZone.setAttribute("data-state", String(this.value));
        add: while (diff > 0) {
            for (var _i = 0, _a = this.nominations; _i < _a.length; _i++) {
                var nom = _a[_i];
                if (diff >= nom) {
                    this.addResource(nom);
                    diff -= nom;
                    continue add;
                }
            }
        }
        rem: while (diff < 0) {
            for (var _b = 0, _c = this.nominations; _b < _c.length; _b++) {
                var nom = _c[_b];
                if (-diff >= nom) {
                    if (this.removeResource(nom)) {
                        diff += nom;
                        continue rem;
                    }
                }
            }
            // need to split
            for (var _d = 0, _e = this.nominations; _d < _e.length; _d++) {
                var nom = _e[_d];
                if (-diff < nom) {
                    if (this.split(nom)) {
                        continue rem;
                    }
                }
            }
            // nothing left?
            break;
        }
    };
    ScatteredResourceZone.prototype.split = function (nomination) {
        if (nomination == 1)
            return false;
        if (this.removeResource(nomination)) {
            this.addResourceN(nomination, 1);
            return true;
        }
        return false;
    };
    ScatteredResourceZone.prototype.addResourceN = function (count, nomination) {
        if (nomination === void 0) { nomination = 1; }
        while (count--) {
            this.addResource(nomination);
        }
    };
    ScatteredResourceZone.prototype.addResource = function (nomination) {
        if (nomination === void 0) { nomination = 1; }
        //debugger;
        var supply = this.supplyId;
        var avail = $(supply).querySelector(".".concat(this.resclass, "_n").concat(nomination));
        if (avail) {
            var id = avail.id;
        }
        else {
            var all = document.querySelectorAll(".".concat(this.resclass, "_n").concat(nomination));
            var num = all.length + 1;
            var id = "".concat(this.resclass, "_n").concat(nomination, "_").concat(num);
        }
        var parent = $(this.zoneId);
        var size = this.nominationSize[nomination] || 20;
        var w = parent.offsetWidth;
        if (!w)
            w = 100; // XXX why its not working?
        var h = parent.offsetHeight;
        if (!h)
            h = 100;
        var x = Math.floor(Math.random() * (w - size));
        var y = Math.floor(Math.random() * (h - size));
        var pi = {
            location: this.zoneId,
            key: id,
            state: nomination,
            x: x,
            y: y,
            position: "absolute",
            from: this.supplyId
        };
        //console.log("adding res "+id+" on "+this.zoneId);
        this.game.placeTokenLocal(id, this.zoneId, nomination, { placeInfo: pi });
        $(id).classList.add(this.resclass);
        $(id).classList.add("".concat(this.resclass, "_n").concat(nomination));
    };
    ScatteredResourceZone.prototype.removeResource = function (nomination) {
        if (nomination === void 0) { nomination = 1; }
        var parent = $(this.zoneId);
        var cube = parent.querySelector(".".concat(this.resclass, "_n").concat(nomination));
        if (!cube)
            return false;
        var id = cube.id;
        //console.log("removing res "+id+" on "+this.zoneId);
        this.game.stripPosition(id);
        this.game.placeTokenLocal(id, this.supplyId);
        return true;
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
        //div.appendChild(board);
        dojo.place("pboard_".concat(color), "tableau_".concat(color, "_cards_0"));
        dojo.place("tableau_".concat(color, "_corp"), "pboard_".concat(color), "after");
        //dojo.place(`player_controls_${color}`, `player_board_header_${color}`, "first");
        //dojo.removeClass(`tableau_${color}_corp_effect`, "corp_effect");
        dojo.place("player_area_name_".concat(color), "player_board_header_".concat(color), "first");
        dojo.place("alt_tracker_gen", "main_board");
        dojo.destroy("outer_generation");
        dojo.place("deck_main", "decks_area");
        dojo.place("discard_main", "decks_area");
        dojo.place("oceans_pile", "map_middle");
        $("deck_holder").style.display = "none";
        $("discard_holder").style.display = "none";
        // dojo.place(`player_controls_${color}`,`miniboardentry_${color}`);
        dojo.place("fpholder_".concat(color), "miniboardentry_".concat(color));
        dojo.place("counter_draw_".concat(color), "limbo");
        // var parent = document.querySelector(".debug_section"); // studio only
        // if (!parent)
        //     $(`pboard_${color}`).style.display  = 'none'; // disable for now
    };
    VLayout.prototype.setupDone = function () {
        if (!this.game.isLayoutFull())
            return;
        // const togglehtml = this.game.getTooltipHtml(_("Player board visibility toggle"), "", "*", _("Click to show or hide player board"));
        // document.querySelectorAll(".viewcards_button[data-cardtype='0']").forEach((node) => {
        //   // have to attach tooltip directly, this element does not have a game model
        //   this.game.addTooltipHtml(node.id, togglehtml, this.game.defaultTooltipDelay);
        // });
        // move player zones in the same order
        var div = $("main_area");
        document.querySelectorAll("#players_area > .player_area").forEach(function (board) {
            div.appendChild(board);
        });
    };
    VLayout.prototype.renderSpecificToken = function (tokenNode) {
        if (!this.game.isLayoutFull())
            return;
        if (tokenNode.id.startsWith("card_colo_")) {
            var marker = "marker_" + tokenNode.id;
            var markerNode = $(marker);
            var color = getPart(tokenNode.id, 2);
            var state = tokenNode.getAttribute("data-state");
            if (!markerNode) {
                markerNode = this.game.createDivNode(marker, "colony-trade-cube marker_" + color, tokenNode.id);
                //this.convertInto3DCube(markerNode, color);
            }
            markerNode.dataset.state = state;
        }
        if (tokenNode.id.startsWith("tracker_tr")) {
            // debugger;
            var marker = "marker_" + tokenNode.id;
            var markerNode = $(marker);
            var color = getPart(tokenNode.id, 2);
            if (!markerNode) {
                markerNode = this.game.createDivNode(marker, "marker marker_tr marker_" + color, "main_board");
                //this.convertInto3DCube(markerNode, color);
            }
            var state = parseInt(tokenNode.getAttribute("data-state"));
            //this.game.setDomTokenState(markerNode, state);
            var bp = 0;
            var lp = 0;
            state = state % 100;
            var off = state % 25;
            var mul = 100 / 25;
            if (state < 25) {
                lp = 0;
                bp = mul * off;
            }
            else if (state < 50) {
                lp = mul * off;
                bp = 100;
            }
            else if (state < 75) {
                lp = 100;
                bp = 100 - mul * off;
            }
            else {
                lp = 100 - mul * off;
                bp = 0;
            }
            markerNode.style.left = "calc(10px + ".concat(lp, "% * 0.95)");
            markerNode.style.bottom = "calc(10px + ".concat(bp, "% * 0.95)");
            return;
        }
        var ptrackers = this.game.productionTrackers;
        var rtrackers = this.game.resourceTrackers;
        if (tokenNode.id.startsWith("tracker_")) {
            var type = getPart(tokenNode.id, 1);
            if (ptrackers.includes(type)) {
                // production tracker
                var markerNode = this.getMarkerCube(tokenNode.id);
                var state = parseInt(tokenNode.getAttribute("data-state"));
                var coords = this.productionCoords(state);
                markerNode.style.marginLeft = "".concat(coords.x * 3.7, "%");
                markerNode.style.marginTop = "".concat(coords.y * 4, "%");
                // update tooltip
                this.updateCountTooltip(tokenNode.id, markerNode.id);
                for (var i = 10; i < 100; i += 10) {
                    if (state < i) {
                        var markerNode10 = this.getMarkerCube(tokenNode.id, i, false);
                        if (markerNode10)
                            dojo.destroy(markerNode10);
                    }
                }
                for (var i = 10; i < state; i += 10) {
                    var markerNode10 = this.getMarkerCube(tokenNode.id, i);
                    var coords_1 = { x: 5 + i / 10 / 2.0 - 0.5, y: 1 };
                    markerNode10.style.marginLeft = "".concat(coords_1.x * 3.7, "%");
                    markerNode10.style.marginTop = "".concat(coords_1.y * 4, "%");
                    this.updateCountTooltip(tokenNode.id, markerNode10.id);
                }
            }
            else if (rtrackers.includes(type)) {
                var color = getPart(tokenNode.id, 2);
                var state = parseInt(tokenNode.getAttribute("data-state"));
                var areaId = "resarea_".concat(type, "_").concat(color);
                new ScatteredResourceZone(this.game, areaId).setValue(state);
                // update tooltip
                this.updateCountTooltip(tokenNode.id, areaId);
            }
        }
    };
    VLayout.prototype.getMarkerCube = function (tokenNodeId, num, create) {
        if (num === void 0) { num = 0; }
        if (create === void 0) { create = true; }
        // production tracker
        var color = getPart(tokenNodeId, 2);
        var marker = "marker_" + tokenNodeId + "_" + num;
        var type = getPart(tokenNodeId, 1);
        var markerNode = $(marker);
        if (!markerNode && create) {
            markerNode = this.game.createDivNode(marker, "marker marker_".concat(type, " marker_").concat(color), "pboard_".concat(color));
            //this.convertInto3DCube(markerNode, color);
        }
        return markerNode;
    };
    VLayout.prototype.productionCoords = function (state) {
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
        return { x: x, y: y };
    };
    VLayout.prototype.updateCountTooltip = function (tokenNodeId, attachTo) {
        var tokenDisplayInfo = this.game.getTokenDisplayInfo(tokenNodeId);
        var state = $(tokenNodeId).getAttribute("data-state");
        tokenDisplayInfo.tooltip = this.game.generateItemTooltip(tokenDisplayInfo);
        tokenDisplayInfo.tooltip += this.game.generateTooltipSection(_("Count"), state + "");
        var tt = this.game.getTooltipHtmlForTokenInfo(tokenDisplayInfo);
        this.game.addTooltipHtml(attachTo, tt);
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
        // if (displayInfo.mainType == "marker") {
        //   this.convertInto3DCube(tokenNode, displayInfo.color);
        // }
        if (tokenNode.id.startsWith("card_stanproj")) {
            //standard project formatting:
            //cost -> action title
            //except for sell patents
            if (this.game.getMapNumber() == 4 || tokenNode.id == "card_stanproj_7")
                tokenNode.dataset.cost = displayInfo.cost != 0 ? displayInfo.cost : "X";
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
    declare("bgagame.terraformingmars", ebg.core.gamegui, new GameXBody());
});
