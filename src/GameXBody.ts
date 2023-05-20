/** Game class */

class GameXBody extends GameTokens {
  private reverseIdLookup: Map<String, any>;
  private custom_placement: any;
  private custom_pay:any;

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
    this.custom_pay = undefined;

    super.setup(gamedatas);
    // hexes are not moved so manually connect
    this.connectClass("hex", "onclick", "onToken");

    document.querySelectorAll(".hex").forEach((node) => {
      this.updateTooltip(node.id);
    });

    this.connectClass("filter_button", "onclick", "onFilterButton");
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
        let tagshtm = "";
        if (tokenNode.id.startsWith("card_corp_")) {
          //Corp formatting
          const decor = this.createDivNode(null, "card_decor", tokenNode.id);
          const texts = displayInfo.text.split(';');
          let card_initial="";
          let card_effect="";
          if (texts.length>0) card_initial = texts[0];
          if (texts.length>1) card_effect= texts[1];
          decor.innerHTML = `
                <div class="card_bg"></div>
                <div class="card_initial">${card_initial}</div>
                <div class="card_effect">${card_effect}</div>
          `;

        } else if (tokenNode.id.startsWith("card_stanproj"))  {
          //standard project formatting:
          //cost -> action title
          //except for sell patents
          const decor = this.createDivNode(null, "stanp_decor", tokenNode.id);
          const parsedActions = this.parseActionsToHTML(displayInfo.r);
          //const costhtm='<div class="stanp_cost">'+displayInfo.cost+'</div>';
          /*
          decor.innerHTML = `
             <div class='stanp_cost'>${displayInfo.cost}</div>
             <div class='stanp_arrow'></div>
             <div class='stanp_action'>${parsedActions}</div>  
             <div class='standard_projects_title'>${displayInfo.name}</div>  
          `;*/
          decor.innerHTML = `
             <div class='stanp_cost'>${displayInfo.cost!=0 ? displayInfo.cost : "X"}</div>
             <div class='standard_projects_title'>${displayInfo.name}</div>  
          `;
        }

        else {
          //tags

          if (displayInfo.tags && displayInfo.tags != "") {
            for (let tag of displayInfo.tags.split(" ")) {
              tagshtm += '<div class="badge tag_' + tag + '"></div>';
            }
          }
          const parsedActions = this.parseActionsToHTML(displayInfo.a ?? displayInfo.e ?? "");
          let parsedPre = displayInfo.pre ? this.parsePrereqToHTML(displayInfo.expr.pre) :"";

          //specigic card rendering
          if (displayInfo.num==2) {
            parsedPre='<div class="prereq_content mode_min">'+this.parseActionsToHTML('pu')+'</div></div>';
          }
          if (displayInfo.num==61) {
            parsedPre='<div class="prereq_content mode_min">'+this.parseActionsToHTML('ps')+'</div></div>';
          }
          if (displayInfo.num==135) {
            parsedPre='<div class="prereq_content mode_min">'+this.parseActionsToHTML('tagPlant tagMicrobe tagAnimal')+'</div></div>';
          }
          const decor = this.createDivNode(null, "card_decor", tokenNode.id);
          let vp="";
          if (displayInfo.vp) {
            vp = parseInt(displayInfo.vp) ? '<div class="card_vp">'+displayInfo.vp+'</div>' : '<div class="card_vp">*</div>' ;
          } else {
            vp='';
          }


          //const vp = displayInfo.vp ? '<div class="card_vp">'+displayInfo.vp+'</div>' : "";

          const cn_binary = displayInfo.num ? parseInt(displayInfo.num).toString(2) : "";
          decor.innerHTML = `
                <div class="card_illustration cardnum_${displayInfo.num}"></div>
                <div class="card_bg"></div>
                <div class='card_badges'>${tagshtm}</div>
                <div class='card_title'><div class='card_title_inner'>${displayInfo.name}</div></div>
                <div class='card_cost'>${displayInfo.cost}</div> 
                <div class="card_action">${displayInfo.a ?? displayInfo.e ?? ""}</div>
                <div class="card_effect"><div class="card_tt">${displayInfo.text}</div></div>
                <div class="card_prereq">${parsedPre!=="" ? parsedPre : ""}</div>
                <div class="card_number">${displayInfo.num ?? ""}</div>
                <div class="card_number_binary">${cn_binary}</div>
                ${vp}
          `;
          // <div class="card_action">${parsedActions}</div>
          //  <div class="card_action">${displayInfo.a ?? displayInfo.e ?? ''}</div>
        }
        const div = this.createDivNode(null, "card_info_box", tokenNode.id);

        div.innerHTML = `

        <div class='token_title'>${displayInfo.name}</div>
        <div class='token_cost'>${displayInfo.cost}</div> 
        <div class='token_rules'>${displayInfo.r}</div>
        <div class='token_descr'>${displayInfo.text}</div>
        `;
        tokenNode.appendChild(div);

        tokenNode.setAttribute("data-card-type", displayInfo.t);
      }
      this.connect(tokenNode, "onclick", "onToken");
    }
  }
  parsePrereqToHTML(pre: Array<string>) {
      if (!pre) return "";
      if (pre.length<3) return "";

      const op = pre[0];
      const what = pre[1];
      const qty=pre[2];

      let suffix="";
      let icon=this.parseActionsToHTML(what);
      switch (what) {
        case "o":
          suffix="%";
          break;
        case "t":
          suffix="°C";
          break;
        case "tagScience":
          break;
        case "w":

          break;
      }

      let mode="min";
      let prefix="";

      if (op=="<=") {
        mode="max";
        prefix="max ";
      }

      let htm='<div class="prereq_content mode_'+mode+'">'+prefix+qty+suffix+icon+'</div></div>';

     return  htm;

  }
  parseActionsToHTML(actions: string) {
    let ret = actions;

    const easyParses = {
      forest: { classes: "tracker tracker_forest" },
      all_city:{classes: "tracker tracker_city", redborder: 'hex'},
      city: { classes: "tracker tracker_city" },
      draw: { classes: "token_img draw_icon" },
      tagScience:{ classes: "tracker badge tracker_tagScience"},
      tagEnergy:{ classes: "tracker badge tracker_tagEnergy"},
      tagMicrobe:{ classes: "tracker badge tracker_tagMicrobe"},
      tagPlant:{ classes: "tracker badge tracker_tagPlant"},
      tagAnimal:{ classes: "tracker badge tracker_tagAnimal"},
      "[1,](sell)": { classes: "" },
      pe: { classes: "token_img tracker_e", production: true },
      pm: { classes: "token_img tracker_m", production: true, content: "1" },
      pu: { classes: "token_img tracker_u", production: true },
      ps: { classes: "token_img tracker_s", production: true },
      pp: { classes: "token_img tracker_p", production: true },
      ph: { classes: "token_img tracker_h", production: true },
      e: { classes: "token_img tracker_e" },
      m: { classes: "token_img tracker_m", content: "1" },
      u: { classes: "token_img tracker_u" },
      s: { classes: "token_img tracker_s" },
      p: { classes: "token_img tracker_p" },
      h: { classes: "token_img tracker_h" },
      t: { classes: "token_img temperature_icon" },
      w: { classes: "tile tile_3" },
      o: { classes: "token_img oxygen_icon"},

      ":": { classes: "action_arrow" },
    };

    let idx = 0;
    let finds = [];
    for (let key in easyParses) {
      let item = easyParses[key];

      if (ret.includes(key)) {
        ret = ret.replace(key, "%" + idx + "%");
        let content = item.content != undefined ? item.content : "";

        if (item.production === true) {
          finds[idx] = '<div class="outer_production"><div class="' + item.classes + '">' + content + "</div></div>";
        } else if (item.redborder) {
          finds[idx] = '<div class="outer_redborder redborder_'+item.redborder+'"><div class="' + item.classes + '">' + content + "</div></div>";
        } else {
          finds[idx] = '<div class="' + item.classes + '"></div>';
        }

        idx++;
      }
    }

    //remove ";" between icons
    ret = ret.replace("%;%", "%%");

    //replaces
    for (let key in finds) {
      let htm = finds[key];
      ret = ret.replace("%" + key + "%", htm);
    }

    return ret;
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
    if (id && location && this.custom_placement[id]) {
      location = this.custom_placement[id];
    }
    const div = super.createDivNode(id, classes, location);
    return div;
  }

  updateTokenDisplayInfo(tokenDisplayInfo: TokenDisplayInfo) {
    // override to generate dynamic tooltips and such

    if  (tokenDisplayInfo.mainType == "card") {

      let cardtype="card";
      let prefix="card_main_";
      let rules = tokenDisplayInfo.r ? "<b>"+_("Card Rules:")+"</b>"+tokenDisplayInfo.r : "";
      if (tokenDisplayInfo.a) rules += "<br><b>"+_("Action:")+"</b>" + tokenDisplayInfo.a;
      if (tokenDisplayInfo.e) rules += "<br><b>"+_("Effect:")+"</b>" + tokenDisplayInfo.e;

      tokenDisplayInfo.imageTypes += " infonode";
      let fullText=
        rules +
        "<br>" +
        (tokenDisplayInfo.ac ? "(" + this.getTr(tokenDisplayInfo.ac) + ")<br>" : "") +
        this.getTr(tokenDisplayInfo.text) +
        "<br>" +
        "<b>" + _("Number: ") + "</b>" + tokenDisplayInfo.num +
        (tokenDisplayInfo.tags ? "<br>" + "<b>" + _("Tags: ") + "</b>" + tokenDisplayInfo.tags : "");
      if (tokenDisplayInfo.vp) {
        fullText += "<br><b>" + _("VP:") + "</b>" + tokenDisplayInfo.vp;
      }

      if (tokenDisplayInfo.key.startsWith("card_corp_")) {
        prefix = "card_corp_";
        cardtype = "corp";
      }

      if ($(prefix + tokenDisplayInfo.num)) {
        let card_htm = $(prefix + tokenDisplayInfo.num).outerHTML.replaceAll('id="', 'id="tt');
        tokenDisplayInfo.tooltip = '<div class="tt_2cols ' + cardtype + '"><div class="tt_card_img">' + card_htm + '</div><div class="tt_card_txt">' + fullText + '</div></div>';
      } else {
        tokenDisplayInfo.tooltip = fullText;

      }

      if ($(prefix+tokenDisplayInfo.num))  {
        let card_htm= $(prefix+tokenDisplayInfo.num).outerHTML.replaceAll('id="','id="tt');
        tokenDisplayInfo.tooltip ='<div class="tt_2cols '+cardtype+'"><div class="tt_card_img">'+card_htm+'</div><div class="tt_card_txt">'+fullText+'</div></div>';
      } else {
        tokenDisplayInfo.tooltip =fullText;

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
    } else if (tokenInfo.key.startsWith("card_main") && tokenInfo.location.startsWith("tableau")) {
      const t = this.getRulesFor(tokenInfo.key, "t");
      if (t !== undefined) result.location = tokenInfo.location + "_cards_" + t;
    }
    if (!result.location)
      // if failed to find revert to server one
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

  sendActionResolveWithTargetAndPayment(opId: number, target: string, payment: any) {
    this.sendActionResolve(opId, { target, payment });
  }

  activateSlots(opInfo: any, opId: number, single: boolean) {
    const opargs = opInfo.args;
    const paramargs = opargs.target ?? [];
    const ttype = opargs.ttype ?? "none";
    const from = opInfo.mcount;
    const count = opInfo.count;

    if (single) {
      this.setDescriptionOnMyTurn(opargs.prompt, opargs.args);
      if (opargs.void) {
        this.addActionButton("button_u", _("No valid targets, must Undo"), () => {
          this.ajaxcallwrapper("undo");
        });
        return;
      }
      if (paramargs.length == 0) {
        if (count == from) {
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

          if (count >= 1)
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
          const name = this.gamedatas.players[playerId]?.name;
          this.addActionButton(
            buttonId,
            name ?? tid,
            () => {
              this.onSelectTarget(opId, tid);
            },
            undefined,
            false,
            "gray"
          );
          if (name) $(buttonId).style.color = "#" + tid;
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
          let title='<div class="custom_paiement_inner">'+this.resourcesToHtml(detailsInfo.resources)+'</div>';

          if (tid=="payment") {
            //show only if options
            const opts =this.gamedatas.gamestate.args.operations[opId].args.info?.[tid];
            if (Object.entries(opts.resources).reduce((sum: number, [key, val]: [string, unknown]) => sum + ((key !== 'm' && typeof val === 'number' && Number.isInteger(val)) ? val : 0), 0)  > 0) {
              this.createCustomPayment(opId,opts);
            }
          } else {
            //  title = this.parseActionsToHTML(tid);
            this.addActionButton(
              divId,
              title,
              () => {
                if (tid == "payment") {
                  // stub

                  /*
                  const first = paramargs[0]; // send same data as 1st option as stub
                  this.sendActionResolveWithTargetAndPayment(opId, tid, this.gamedatas.gamestate.args.operations[opId].args.info?.[first]?.resources);

                   */
                } else this.onSelectTarget(opId, tid);
              },
              undefined,
              false,
              buttonColor
            );
          }
        }
      });
    }
  }

  //Adds the payment picker according to available alternative payment options
  createCustomPayment(opId,info) {
    this.custom_pay  = {
      needed:info.count,
      selected:{},
      available:[],
      rate:[]
    }



    let items_htm='';
    for (let res in info.resources) {
      this.custom_pay.selected[res]=0;
      this.custom_pay.available[res]=info.resources[res];
      this.custom_pay.rate[res]=info.rate[res];

      //megacredits are spent automatically
      if (res=='m') {
        this.custom_pay.selected[res]=this.custom_pay.available[res];
        continue;
      }


      if ( this.custom_pay.available[res]<=0) continue;
      //add paiments buttons
        items_htm+=`
        <div class="payment_group">
           <div class="token_img tracker_${res}"></div>
          <div id="payment_item_minus_${res}" class="btn_payment_item btn_item_minus" data-resource="${res}" data-direction="minus">-</div>
          <div id="payment_item_${res}" class="payment_item_value item_value_${res}">0</div>
          <div id="payment_item_plus_${res}" class="btn_payment_item btn_item_plus" data-resource="${res}" data-direction="plus">+</div>                
        </div>
      `;
    }
    /*
      <div class="token_img tracker_m payment_item">
          <div id="custompay_amount_m">${this.custom_pay.needed}</div>
      </div>
     */

    //add confirmation button
    const txt =_("Custom:");
    const button_htm=this.resourcesToHtml( this.custom_pay.selected,true);

    const button_whole='Pay %s'.replace('%s',button_htm);
    const paiement_htm=`
      <div class="custom_paiement_inner">
        ${txt}
        ${items_htm}
        <div id="btn_custompay_send" class="action-button bgabutton bgabutton_blue">${button_whole}</div>
      </div>
    `;
    const node = this.createDivNode('custom_paiement',"","generalactions");
    node.innerHTML=paiement_htm;


    //adds actions to button payments
    this.connectClass("btn_payment_item",'onclick',(event)=>{
      const id = (event.currentTarget as HTMLElement).id;
      const direction = $(id).dataset.direction;
      const res = $(id).dataset.resource;
      dojo.stopEvent(event);

      if (direction=="minus") {
        if (this.custom_pay.selected[res]>0) {
          this.custom_pay.selected[res]--;
        }
      }
      if (direction=="plus") {
        if (this.custom_pay.selected[res]<this.custom_pay.available[res]) {
          this.custom_pay.selected[res]++;
        }
      }
      $('payment_item_'+res).innerHTML=this.custom_pay.selected[res];

      let total_res = 0;
     // let values_htm='';
      for (let res in  this.custom_pay.rate) {
          if (res!='m') {
            total_res = total_res + this.custom_pay.rate[res] * this.custom_pay.selected[res];
          //  values_htm+=`<div class="token_img tracker_${res}">${this.custom_pay.selected[res]}</div>`;
          }
      }
      const mc= this.custom_pay.needed - total_res;
      this.custom_pay.selected['m']=mc;
   //   values_htm+=` <div class="token_img tracker_m payment_item">${mc}</div>`;
      const values_htm=this.resourcesToHtml( this.custom_pay.selected,true);

      $('btn_custompay_send').innerHTML='Pay %s'.replace('%s',values_htm);

    });

    //adds action to final payment button
    this.connect($('btn_custompay_send'),'onclick', ()=>{
      let pays={};
      //backend doesn't accept 0 as paiment
      for (let res of Object.keys(this.custom_pay.selected) ) {
        if (this.custom_pay.selected[res]>0) pays[res] = parseInt(this.custom_pay.selected[res]);
      }
      this.darhflog('sending',pays,'org',this.custom_pay.selected);
      this.sendActionResolveWithTargetAndPayment(opId, 'payment', pays);
    });
  }

  resourcesToHtml(resources:any,show_zeroes:boolean = false):string {
    var htm='';
    const allResources =['m','s','u','h'];

    allResources.forEach((item)=>{
        if (resources[item]!=undefined && (resources[item]>0 || show_zeroes===true)) {
          htm+=`<div class="token_img tracker_${item} payment_item">${resources[item]}</div>`;
        }
    });


    return htm;
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
    if (xop == "+" && !single) this.setDescriptionOnMyTurn("${you} must choose order of operations");

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
          dojo.addClass("button_" + opId, "disabled");
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

  onToken_multiplayerChoice(tid: string) {
    this.onToken_playerTurnChoice(tid);
  }
  onToken_multiplayerDispatch(tid: string) {
    this.onToken_playerTurnChoice(tid);
  }

  //custom actions
  onFilterButton(event: Event) {
    let id = (event.currentTarget as HTMLElement).id;
    // Stop this event propagation
    dojo.stopEvent(event); // XXX

    const plcolor = $(id).dataset.player;
    const btncolor = $(id).dataset.color;
    const tblitem = "visibility" + btncolor;

    $("tableau_" + plcolor).dataset[tblitem] = $("tableau_" + plcolor).dataset[tblitem] == "1" ? "0" : "1";
    $(id).dataset.enabled = $(id).dataset.enabled == "1" ? "0" : "1";

    return true;
  }

  // notifications
  setupNotifications(): void {
    super.setupNotifications();
  }
}

class Operation {
  type: string;
}
