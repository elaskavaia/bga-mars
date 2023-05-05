/** Game class */

class GameXBody extends GameTokens {
  private reverseIdLookup: Map<String, any>;
  private custom_placement: any;

  constructor() {
    super();
  }

  setup(gamedatas: any) {
    this.defaultTooltipDelay = 800;

    //custom destinations for tokens
    this.custom_placement = {
      tracker_t: "temperature_map",
      tracker_o: "oxygen_map",
      tracker_w: "oceans_pile",
    };

    super.setup(gamedatas);
    // hexes are not moved so manually connect
    this.connectClass("hex", "onclick", "onToken");

    document.querySelectorAll(".hex").forEach((node) => {
      this.updateTooltip(node.id);
    });

    console.log("Ending game setup");
  }

  setupPlayer(playerInfo: any) {
    super.setupPlayer(playerInfo);

    //move own player board in main zone
    if (playerInfo.id == this.player_id) {
      const board = $(`player_area_${playerInfo.color}`);
      $("thisplayer_zone").appendChild(board);
    }
  }

  syncTokenDisplayInfo(tokenNode: HTMLElement) {
    if (!tokenNode.getAttribute("data-info")) {
      const displayInfo = this.getTokenDisplayInfo(tokenNode.id);
      const classes = displayInfo.imageTypes.split(/  */);
      tokenNode.classList.add(...classes);
      tokenNode.setAttribute("data-info", "1");

      // use this to generate some fake parts of card, remove this when use images
      if (displayInfo.mainType == "card") {
        let rules = displayInfo.r ?? "";
        if (displayInfo.a) rules += ";a:" + displayInfo.a;
        if (displayInfo.e) rules += ";e:" + displayInfo.e;

        //tags
        let tagshtm = "";
        if (displayInfo.tags && displayInfo.tags != "") {
          for (let tag of displayInfo.tags.split(" ")) {
            tagshtm += '<div class="badge tag_' + tag + '"></div>';
          }
        }

        const div = this.createDivNode(null, "card_info_box", tokenNode.id);
        div.innerHTML = `
        <div class='token_title'>${displayInfo.name}</div>
        <div class='token_cost'>${displayInfo.cost}</div>
        <div class='token_badges'>${tagshtm}</div>
        <div class='token_rules'>${rules}</div>
        <div class='token_descr'>${displayInfo.tooltip}</div>
        `;
        tokenNode.appendChild(div);

        tokenNode.setAttribute("data-card-type", displayInfo.t);
      }
      this.connect(tokenNode, "onclick", "onToken");
    }
  }

  renderSpecificToken(tokenNode: HTMLElement) {
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
  }

  //finer control on how to place things
  createDivNode(id?: string | undefined, classes?: string, location?: string): HTMLDivElement {
    this.darhflog("placing ", id);
    if (id && location && this.custom_placement[id]) {
      location = this.custom_placement[id];
      this.darhflog("placing id elsewhere: ", id, "at location ", location);
    }
    const div = super.createDivNode(id, classes, location);
    this.darhflog(`id ${div.id} has been created at ${(div.parentNode as HTMLElement)?.id}`);
    return div;
  }

  updateTokenDisplayInfo(tokenDisplayInfo: TokenDisplayInfo) {
    // override to generate dynamic tooltips and such
    if (tokenDisplayInfo.mainType == "card") {
      tokenDisplayInfo.imageTypes += " infonode";
      tokenDisplayInfo.tooltip =
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
  }

  getPlaceRedirect(tokenInfo: Token): TokenMoveInfo {
    let result = super.getPlaceRedirect(tokenInfo);
    if (tokenInfo.key.startsWith("tracker") && $(tokenInfo.key)) {
      result.nop = true; // do not relocate or do anyting
    } else if (tokenInfo.key.startsWith("award")) {
      result.nop = true; 
    } else if (tokenInfo.key.startsWith("milestone")) {
      result.nop = true; 
    } else if (this.custom_placement[tokenInfo.key]) {
      result.location = this.custom_placement[tokenInfo.key];
    }
    if (!result.location) // if failed to find revert to server one
      result.location = tokenInfo.location;
    return result;
  }

  isLayoutVariant(num: number) {
    return this.prefs[100].value == num;
  }

  darhflog(...args: any) {
    if (this.isLayoutVariant(1)) {
      console.log(...args);
    }
  }

  sendActionResolve(op: number, args?: any) {
    if (!args) args = {};
    this.ajaxuseraction("resolve", {
      ops: [{ op: op, ...args }],
    });
  }

  sendActionDecline(op: number) {
    this.ajaxuseraction("decline", {
      ops: [{ op: op }],
    });
  }
  sendActionSkip() {
    this.ajaxuseraction("skip", {});
  }

  getButtonNameForOperation(op: any) {
    if (op.args.button) return this.format_string_recursive(op.args.button, op.args.args);
    else return this.getButtonNameForOperationExp(op.type);
  }

  getButtonNameForOperationExp(op: string) {
    const rules = this.getRulesFor("op_" + op, "*");
    if (rules && rules.name) return this.getTr(rules.name);
    return op;
  }
  getOperationRules(opInfo: string | Operation) {
    if (typeof opInfo == "string") return this.getRulesFor("op_" + opInfo, "*");
    return this.getRulesFor("op_" + opInfo.type, "*");
  }

  onUpdateActionButtons_playerConfirm(args) {
    this.addActionButton("button_0", _("Confirm"), () => {
      this.ajaxuseraction("confirm");
    });
  }

  sendActionResolveWithTarget(opId: number, target: string) {
    this.sendActionResolve(opId, {
      target: target,
    });
    return;
  }

  activateSlots(opInfo: any, opId: number, single: boolean) {
    const opargs = opInfo.args;
    const paramargs = opargs.target ?? [];
    const ttype = opargs.ttype ?? "none";
    const from = opInfo.mcount;
    const count = opInfo.count;

    if (single) {
      this.setDescriptionOnMyTurn(opargs.prompt, opargs.args);
      if (paramargs.length == 0) {
        if (count == from || from == 0) {
          this.addActionButton("button_" + opId, _("Confirm"), () => {
            this.sendActionResolve(opId);
          });
        } else {
          // counter select stub for now
          if (from > 0)
            this.addActionButton("button_" + opId + "_0", from, () => {
              this.sendActionResolve(opId, {
                count: from,
              });
            });
          if (from == 0 && count > 1) {
            this.addActionButton("button_" + opId + "_1", "1", () => {
              this.sendActionResolve(opId, {
                count: 1,
              });
            });
          }
          this.addActionButton("button_" + opId + "_max", count + " (max)", () => {
            // XXX
            this.sendActionResolve(opId, {
              count: count,
            });
          });
        }
      }
    }

    if (ttype == "token") {
      paramargs.forEach((tid: string) => {
        if (tid == "none") {
          if (single) {
            this.addActionButton("button_none", _("None"), () => {
              this.sendActionResolveWithTarget(opId, "none");
            });
          }
        } else {
          this.setActiveSlot(tid);
          this.setReverseIdMap(tid, opId, tid);
          if (single) {
            if (paramargs.length <= 5) {
              // magic number?
              this.addActionButton("button_" + tid, this.getTokenName(tid), () => {
                this.sendActionResolveWithTarget(opId, tid);
              });
            }
          }
        }
      });
    } else if (ttype == "player") {
      paramargs.forEach((tid: string) => {
        // XXX need to be pretty
        const playerId = this.getPlayerIdByColor(tid);
        // here divId can be like player name on miniboard
        const divId = `player_name_${playerId}`;
        if (single) {
          const buttonId = "button_" + tid;
          this.addActionButton(buttonId, tid, () => {
            this.onSelectTarget(opId, tid);
          });
        }

        this.setReverseIdMap(divId, opId, tid);
      });
    } else if (ttype == "enum") {
      paramargs.forEach((tid: string, i: number) => {
        if (single) {
          const detailsInfo = this.gamedatas.gamestate.args.operations[opId].args.info?.[tid];
          const sign = detailsInfo.sign; // 0 complete payment, -1 incomplete, +1 overpay
          //console.log("enum details "+tid,detailsInfo);
          let buttonColor = undefined;
          if (sign < 0) buttonColor = "gray";
          if (sign > 0) buttonColor = "red";
          const divId = "button_" + i;
          this.addActionButton(
            divId,
            tid,
            () => {
              this.onSelectTarget(opId, tid);
            },
            undefined,
            false,
            buttonColor
          );
        }
      });
    }
  }

  clearReverseIdMap() {
    this.reverseIdLookup = new Map<String, any>();
  }
  setReverseIdMap(divId: string, opId: number, target?: string, param_name?: string) {
    const prev = this.reverseIdLookup.get(divId);
    if (prev && prev.opId != opId) {
      // ambiguous lookup
      this.reverseIdLookup.set(divId, 0);
      return;
    }
    this.reverseIdLookup.set(divId, {
      op: opId,
      param_name: param_name ?? "target",
      target: target ?? divId,
    });
  }

  onUpdateActionButtons_playerTurnChoice(args) {
    let operations = args.operations;
    if (!operations) return; // XXX
    this.clientStateArgs.call = "resolve";
    this.clientStateArgs.ops = [];
    this.clearReverseIdMap();
    const xop = args.op;

    const single = Object.keys(operations).length == 1;
    const ordered = xop == "," && !single;
    if (ordered) this.setDescriptionOnMyTurn("${you} must choose order of operations");

    let i = 0;
    for (const opIdS in operations) {
      const opId = parseInt(opIdS);
      const opInfo = operations[opId];
      const opargs = opInfo.args;
      const name = this.getButtonNameForOperation(opInfo);
      const paramargs = opargs.target ?? [];
      const singleOrFirst = single || (ordered && i == 0);

      this.activateSlots(opInfo, opId, singleOrFirst);
      if (!single && !ordered) {
        // xxx add something for remaining ops in ordered case?
        if (paramargs.length > 0) {
          this.addActionButton("button_" + opId, name, () => {
            this.setClientStateUpdOn(
              "client_collect",
              (args) => {
                // on update action buttons
                this.clearReverseIdMap();
                this.activateSlots(opInfo, opId, true);
              },
              (id: string) => {
                // onToken
                this.onSelectTarget(opId, id);
              }
            );
          });

        } else {
          this.addActionButton("button_" + opId, name, () => {
            this.sendActionResolve(opId);
          });
        }
    
        if (opargs.void) {
          dojo.addClass("button_" + opId,"disabled");
        }
      }
      // add done (skip) when optional
      if (singleOrFirst) {
        if (opInfo.mcount <= 0)
          this.addActionButton("button_skip", _("Skip"), () => {
            this.sendActionSkip();
          });
      }
      i = i + 1;
    }
  }
  onUpdateActionButtons_multiplayerChoice(args) {
      let operations = args.player_operations[this.player_id] ?? undefined;
      if (!operations) return;
      this.onUpdateActionButtons_playerTurnChoice(operations);
  }

  onUpdateActionButtons_after(stateName: string, args: any): void {
    if (this.isCurrentPlayerActive()) {
      // add undo on every state
      if (this.on_client_state) this.addCancelButton();
      else this.addActionButton("button_undo", _("Undo"), () => this.ajaxcallwrapper("undo"), undefined, undefined, "red");
    }
  }

  onSelectTarget(opId: number, target: string) {
    // can add prompt
    return this.sendActionResolveWithTarget(opId, target);
  }

  // on click hooks
  onToken_playerTurnChoice(tid: string) {
    const info = this.reverseIdLookup.get(tid);
    if (info && info !== "0") {
      const opId = info.op;
      if (info.param_name == "target") this.onSelectTarget(opId, info.target ?? tid);
      else this.showError("Not implemented");
    } else {
      this.showMoveUnauthorized();
    }
  }
  onToken_multiplayerChoice(tid: string){
    this.onToken_playerTurnChoice(tid);
  }
  onToken_multiplayerDispatch(tid: string){
    this.onToken_playerTurnChoice(tid);
  }

  // notifications
  setupNotifications(): void {
    super.setupNotifications();
  }
}

class Operation {
  type: string;
}
