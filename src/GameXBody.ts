/** Game class */

class GameXBody extends GameTokens {
  private reverseIdLookup: any;
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
    };

    super.setup(gamedatas);
    // hexes are not moved so manually connect
    this.connectClass("hex", "onclick", "onToken");

    document.querySelectorAll(".hex").forEach((node) => {
      this.updateTooltip(node.id);
    });

    console.log("Ending game setup");
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

        const div = this.createDivNode(null, "card_info_box", tokenNode.id);
        div.innerHTML = `
        <div class='token_title'>${displayInfo.name}</div>
        <div class='token_cost'>${displayInfo.cost}</div>
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
    const displayInfo = this.getTokenDisplayInfo(tokenNode.id);
    if (tokenNode && displayInfo && tokenNode.parentNode && displayInfo.location) {
      const originalHtml = tokenNode.outerHTML;
      console.log("checking", tokenNode.id, "maintype", displayInfo.mainType, "location inc", displayInfo.location.includes("miniboard_"));
      if (displayInfo.mainType == "tracker" && displayInfo.location.includes("miniboard_")) {
        const rpDiv = document.createElement("div");
        rpDiv.classList.add("outer_tracker", "outer_" + displayInfo.typeKey);
        rpDiv.innerHTML = '<div class="token_img ' + displayInfo.typeKey + '"></div>' + originalHtml;
        tokenNode.parentNode.replaceChild(rpDiv, tokenNode);
      }
    }
  }

  //finer control on how to place things
  createDivNode(id?: string | undefined, classes?: string, location?: string): HTMLDivElement {
    console.log("placing ", id);
    if (id && location && this.custom_placement[id]) {
      location = this.custom_placement[id];
      console.log("placing id elsewhere: ", id, "at location ", location);
    }
    return super.createDivNode(id, classes, location);
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
      result.location = this.getDomTokenLocation(tokenInfo.key);
    } else if (this.custom_placement[tokenInfo.key]) {
      result.location = this.custom_placement[tokenInfo.key];
    }
    return result;
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

  activateSlots(opargs: any, opId: number, single: boolean) {
    const paramargs = opargs.target ?? [];
    const ttype = opargs.ttype ?? "none";
    if (single) {
      this.setDescriptionOnMyTurn(opargs.prompt, opargs.args);
      if (paramargs.length <= 1)
        this.addActionButton("button_" + opId, _("Confirm"), () => {
          this.sendActionResolve(opId);
        });
    }
    debugger;
    if (ttype == "token") {
      paramargs.forEach((tid: string) => {
        if (tid == "none") {
          if (single) {
            this.addActionButton("button_none", _("None"), () => {
              this.sendActionResolveWithTarget(opId, "none");
            });
          }
        } else this.setActiveSlot(tid);
        if (opId)
          this.reverseIdLookup.set(tid, {
            op: opId,
            param_name: "target",
          });
      });
    } else if (ttype == "player") {
      paramargs.forEach((tid: string) => {
        // XXX need to be pretty
        const divId = "button_" + tid;
        this.addActionButton(divId, tid, () => {
          this.onSelectTarget(opId, tid);
        });
        if (opId)
          this.reverseIdLookup.set(divId, {
            op: opId,
            param_name: "target",
          });
      });
    } else if (ttype == "enum") {
      paramargs.forEach((tid: string, i: number) => {
        const divId = "button_" + i;
        this.addActionButton(divId, tid, () => {
          this.onSelectTarget(opId, tid);
        });
        if (opId)
          this.reverseIdLookup.set(divId, {
            op: opId,
            param_name: "target",
          });
      });
    }
  }

  clearReverseIdMap() {
    this.reverseIdLookup = new Map<String, any>();
  }

  onUpdateActionButtons_playerTurnChoice(args) {
    let operations = args.operations;
    this.clientStateArgs.call = "resolve";
    this.clientStateArgs.ops = [];
    this.clearReverseIdMap();
    const xop = args.op;

    const single = Object.keys(operations).length == 1;
    const ordered = xop == "," && !single;

    let i = 0;
    for (const opIdS in operations) {
      const opId = parseInt(opIdS);
      const opInfo = operations[opId];
      const opargs = opInfo.args;
      const name = this.getButtonNameForOperation(opInfo);
      const paramargs = opargs.target ?? [];
      const singleOrFirst = single || (ordered && i == 0);

      this.activateSlots(opargs, opId, singleOrFirst);
      if (!single && !ordered) {
        // xxx add something for remaining ops in ordered case?
        if (paramargs.length > 0) {
          this.addActionButton("button_" + opId, name, () => {
            this.setClientStateUpdOn(
              "client_collect",
              (args) => {
                // on update action buttons
                this.clearReverseIdMap();
                this.activateSlots(opargs, opId, true);
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

  clientCollectParams(opInfo, param_name) {
    if (param_name == "payment") {
      // get id of the selected card
      const id = this.clientStateArgs.ops[0].target;
      // get cost
      let cost = this.getRulesFor(id, "cost");
      const overridecost = opInfo.args.cost;
      if (overridecost !== undefined) cost = overridecost;
      // check if can be auto
      const auto = true;
      // create payment prompt
      const clstate = "client_payment";
      this.setClientStateUpdOn(
        clstate,
        (args) => {
          // on update action buttons

          this.setDescriptionOnMyTurn(_("Confirm payment") + ": " + this.getButtonNameForOperationExp("nm") + " x " + cost);
          this.addActionButton("button_confirm", _("Confirm"), () => {
            this.clientStateArgs.ops[0].payment = "auto";
            this.ajaxuseraction(this.clientStateArgs.call, this.clientStateArgs);
          });
        },
        (id: string) => {
          // onToken as payment - remove its not a thing
          this.showMoveUnauthorized();
        }
      );
    } else {
      throw new Error("Not supported param: " + param_name);
    }
  }

  onUpdateActionButtons_after(stateName: string, args: any): void {
    if (this.isCurrentPlayerActive()) {
      // add undo on every state
      if (this.on_client_state) this.addCancelButton();
      else this.addActionButton("button_undo", _("Undo"), () => this.ajaxcallwrapper("undo"), undefined, undefined, "red");
    }
  }

  onSelectTarget(opId: number, target: string) {
    const opInfo = this.gamedatas.gamestate.args.operations[opId];
    const rules = this.getOperationRules(opInfo);
    if (rules && rules.params && rules.params != "target") {
      // more params
      const params = rules.params.split(",");
      const nextparam = params[1];
      this.clientStateArgs.ops[0] = {
        op: opId,
        target: target,
      };
      this.clientCollectParams(opInfo, nextparam);
    } else {
      return this.sendActionResolveWithTarget(opId, target);
    }
  }

  // on click hooks
  onToken_playerTurnChoice(tid: string) {
    const info = this.reverseIdLookup.get(tid);
    if (info) {
      const opId = info.op;
      if (info.param_name == "target") this.onSelectTarget(opId, tid);
      else this.showError("Not implemented");
    } else {
      this.showMoveUnauthorized();
    }
  }

  // notifications
  setupNotifications(): void {
    super.setupNotifications();
  }
}

class Operation {
  type: string;
}
