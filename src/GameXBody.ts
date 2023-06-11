
class GameXBody extends GameTokens {
  private reverseIdLookup: Map<String, any>;
  private custom_placement: any;
  private custom_pay:any;
  private local_counters:any;
  private isDoingSetup:boolean;
 // private parses:any;

  constructor() {
    super();
  }

  setup(gamedatas: any) {
    this.defaultTooltipDelay = 800;
    this.isDoingSetup=true;

    //custom destinations for tokens
    this.custom_placement = {
      tracker_t: "temperature_map",
      tracker_o: "oxygen_map",
      tracker_w: "oceans_pile",
      tracker_gen: "generation_counter",
    };
    this.custom_pay = undefined;
    this.local_counters=[];


    super.setup(gamedatas);
    // hexes are not moved so manually connect
    this.connectClass("hex", "onclick", "onToken");

    document.querySelectorAll(".hex").forEach((node) => {
      this.updateTooltip(node.id);
    });

   // this.connectClass("filter_button", "onclick", "onFilterButton");
    this.connectClass("viewcards_button", "onclick", "onShowTableauCardsOfColor");

    $('thething').removeAttribute('title');

    console.log("Ending game setup");
    this.isDoingSetup=false;
  }

  setupPlayer(playerInfo: any) {
    super.setupPlayer(playerInfo);
    this.local_counters[playerInfo.color] = {
      cards_1:0,
      cards_2:0,
      cards_3:0
    }

    if (this.isLayoutFull()) {
      const div = $("main_area");
      const board = $(`player_area_${playerInfo.color}`);
      div.appendChild(board);
      $(`tableau_${playerInfo.color}`).setAttribute('data-visibility_3',"1");
      $(`tableau_${playerInfo.color}`).setAttribute('data-visibility_1',"1");

      dojo.destroy(`tableau_${playerInfo.color}_cards_3vp`);
      dojo.destroy(`tableau_${playerInfo.color}_cards_1vp`);
    } 
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
        const ttdiv = this.createDivNode(null, "card_hovertt", tokenNode.id);


        ttdiv.innerHTML = ` 
            <div class='token_title'>${displayInfo.name}</div>
        `;

        if (tokenNode.id.startsWith("card_corp_")) {
          //Corp formatting
          const decor = this.createDivNode(null, "card_decor", tokenNode.id);
         // const texts = displayInfo.text.split(';');
          let card_initial=displayInfo.text || '';
          let card_effect =displayInfo.text_effect || '';

       //   if (texts.length>0) card_initial = texts[0];
        //  if (texts.length>1) card_effect= texts[1];
          decor.innerHTML = `
                <div class="card_bg"></div>
                <div class="card_initial">${card_initial}</div>
                <div class="card_effect">${card_effect}</div>
          `;
          ttdiv.innerHTML+='<div class="tt_intertitle">'+_('INITIAL')+'</div>';
          ttdiv.innerHTML+=`<div class="card_initial">${card_initial}</div>`;
          ttdiv.innerHTML+='<div class="tt_intertitle">'+_('EFFECT')+'</div>';
          ttdiv.innerHTML+=`<div class="card_effect">${card_effect}</div>`;

        } else if (tokenNode.id.startsWith("card_stanproj"))  {
          //standard project formatting:
          //cost -> action title
          //except for sell patents
          const decor = this.createDivNode(null, "stanp_decor", tokenNode.id);
          const parsedActions = CustomRenders.parseActionsToHTML(displayInfo.r);
          //const costhtm='<div class="stanp_cost">'+displayInfo.cost+'</div>';

          decor.innerHTML = `
             <div class='stanp_cost'>${displayInfo.cost!=0 ? displayInfo.cost : "X"}</div>
             <div class='standard_projects_title'>${displayInfo.name}</div>  
          `;
          ttdiv.innerHTML+=`<div class='card_effect'>${displayInfo.text}</div>`;
        }

        else {
          //tags

          let firsttag='';
          if (displayInfo.tags && displayInfo.tags != "") {
            for (let tag of displayInfo.tags.split(" ")) {
              tagshtm += '<div class="badge tag_' + tag + '"></div>';
              if (firsttag=="") firsttag = tag;
            }
          }
         // const parsedActions = CustomRenders.parseActionsToHTML(displayInfo.a ?? displayInfo.e ?? "");
          let parsedPre = displayInfo.pre ? CustomRenders.parsePrereqToHTML(displayInfo.expr.pre) :"";

          //specific card rendering
          if (displayInfo.num==2) {
            parsedPre='<div class="prereq_content mode_min">'+CustomRenders.parseActionsToHTML('pu')+'</div></div>';
          }
          if (displayInfo.num==61) {
            parsedPre='<div class="prereq_content mode_min">'+CustomRenders.parseActionsToHTML('ps')+'</div></div>';
          }
          if (displayInfo.num==135) {
            parsedPre='<div class="prereq_content mode_min">'+CustomRenders.parseActionsToHTML('tagPlant tagMicrobe tagAnimal')+'</div></div>';
          }
          const decor = this.createDivNode(null, "card_decor", tokenNode.id);
          let vp="";
          if (displayInfo.vp) {
            vp = parseInt(displayInfo.vp) ? '<div class="card_vp">'+displayInfo.vp+'</div>' : '<div class="card_vp">*</div>' ;
          } else {
            vp='';
          }
          const cn_binary = displayInfo.num ? parseInt(displayInfo.num).toString(2) : "";

          //rules+rules styling
          //let card_r = this.parseRulesToHtml(displayInfo.r, displayInfo.num || null );
          let card_r ="";
          let addeffclass="";
          if (displayInfo.r) {
            card_r =CustomRenders.parseExprToHtml(displayInfo.expr.r, displayInfo.num || null );
            addeffclass = card_r.includes('icono_prod') ? 'cols' : 'rows';
            const blocks = (card_r.match(/card_icono/g) || []).length;
            addeffclass+=' blocks_'+blocks;
            const cntLosses=(card_r.match(/cnt_losses/g) || []).length;
            const cntGains=(card_r.match(/cnt_gains/g) || []).length;
            const cntProds=(card_r.match(/cnt_media/g) || []).length;
            if (((cntLosses>0 && cntGains==0) || (cntGains>0 && cntLosses==0)) && (cntLosses+cntGains>1 || (cntLosses+cntGains==1 && cntProds>3))) {
              //exceptions
              if (displayInfo.num && displayInfo.num!=19) {
                card_r = '<div class="groupline">'+card_r+'</div>';
                addeffclass+=' oneline';
              }
            }
            if (vp!='') addeffclass+=' hasvp';
            //replaces some stuff in parsed rules
            card_r= card_r.replace('%card_number%',displayInfo.num);
            //special for "res"
            card_r = card_r.replaceAll('%badge%',firsttag.toLowerCase());
          }

          //card actions
          let card_a="";
          if (displayInfo.a) {
            card_a = CustomRenders.parseExprToHtml(displayInfo.expr.a, displayInfo.num || null,true );
          } else if (displayInfo.e) {
            card_a = CustomRenders.parseExprToHtml(displayInfo.expr.e, displayInfo.num || null,false ,true);
          }
          //special for "res"
          card_a = card_a.replaceAll('%badge%',firsttag.toLowerCase());
          let card_action_text="";
          if (displayInfo.text_action || displayInfo.text_effect) {
            card_action_text=`<div class="card_action_line card_action_text">${displayInfo.text_action || displayInfo.text_effect}</div>`;
          }
          decor.innerHTML = `
                <div class="card_illustration cardnum_${displayInfo.num}"></div>
                <div class="card_bg"></div>
                <div class='card_badges'>${tagshtm}</div>
                <div class='card_title'><div class='card_title_inner'>${displayInfo.name}</div></div>
                <div id='cost_${tokenNode.id}' class='card_cost'>${displayInfo.cost}</div> 
                <div class="card_outer_action"><div class="card_action"><div class="card_action_line card_action_icono">${card_a}</div>${card_action_text}</div><div class="card_action_bottomdecor"></div></div>
                <div class="card_effect ${addeffclass}">${card_r}<div class="card_tt">${displayInfo.text || ""}</div></div>           
                <div class="card_prereq">${parsedPre!=="" ? parsedPre : ""}</div>
                <div class="card_number">${displayInfo.num ?? ""}</div>
                <div class="card_number_binary">${cn_binary}</div>
                ${vp}
          `;

          const prereqText = displayInfo.pre ? CustomRenders.parsePrereqToText(displayInfo.expr.pre) : "";

          ttdiv.innerHTML+=`<div class="card_number">${displayInfo.num ?? ""}</div>`;
          if (prereqText!="") {
            ttdiv.innerHTML+='<div class="tt_intertitle">'+_('PRE-REQUISITES')+'</div>';
            ttdiv.innerHTML+=`<div class="card_effect">${prereqText}</div>`;
          }
          /*ttdiv.innerHTML+='<div class="tt_intertitle">'+_('PROPERTIES')+'</div>';
          ttdiv.innerHTML+=`<div class="tt_linegroup"><div class='card_cost'>${displayInfo.cost}</div>
                            <div class='card_badges'>${tagshtm}</div></div>`*/
          if (displayInfo.text_action && displayInfo.text_action!="") {
            ttdiv.innerHTML += '<div class="tt_intertitle">' + _('ACTION') + '</div>';
            ttdiv.innerHTML += `<div class="card_effect">${displayInfo.text_action}</div>`;
          }
          if (displayInfo.text_effect && displayInfo.text_effect!="") {
            ttdiv.innerHTML += '<div class="tt_intertitle">' + _('EFFECT') + '</div>';
            ttdiv.innerHTML += `<div class="card_effect">${displayInfo.text_effect}</div>`;
          }
          if (displayInfo.text && displayInfo.text!="") {
            ttdiv.innerHTML += '<div class="tt_intertitle">' + _('WHEN PLAYED') + '</div>';
            ttdiv.innerHTML += `<div class="card_effect">${displayInfo.text}</div>`;
          }

          if (displayInfo.text_vp && displayInfo.text_vp!="") {
            ttdiv.innerHTML += '<div class="tt_intertitle">' + _('VICTORY POINTS') + '</div>';
            ttdiv.innerHTML += `<div class="card_effect">${displayInfo.text_vp}</div>`;
          }

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
        //card tooltip
        tokenNode.appendChild(ttdiv);

        tokenNode.setAttribute("data-card-type", displayInfo.t);
      }
      this.connect(tokenNode, "onclick", "onToken");
    }
  }



  setDomTokenState(tokenId: ElementOrId, newState: any) {

    super.setDomTokenState(tokenId, newState);
    var node = $(tokenId);
    if (!node) return;
    if (!node.id) return;

    //intercept player passed state
    if (node.id.startsWith('tracker_passed_')) {
      this.darhflog('passes !',node.id,'newstate is ',newState);
      const plColor=node.id.replace('tracker_passed_','');
      const plId = this.getPlayerIdByColor(plColor);
      if (newState==1) {
        this.disablePlayerPanel(parseInt(plId));
      } else {
        this.enablePlayerPanel(parseInt(plId));
      }
    }

    //handle copies of trackers
    const trackerCopy = "alt_" + node.id;
    const nodeCopy = $(trackerCopy);
    if (nodeCopy) {
      nodeCopy.setAttribute("data-state", newState);
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
    if (id && location && this.custom_placement[id]) {
      location = this.custom_placement[id];
    }
    const div = super.createDivNode(id, classes, location);
    return div;
  }

  updateTokenDisplayInfo(tokenDisplayInfo: TokenDisplayInfo) {
    // override to generate dynamic tooltips and such

    if  (tokenDisplayInfo.mainType == "card") {
      //do nothing
     // this.darhflog('update card ',tokenDisplayInfo);
    }

    if (this.isLocationByType(tokenDisplayInfo.key)) {
      tokenDisplayInfo.imageTypes += " infonode";
    }
  }
  updateVisualsFromOp(opInfo: any, opId: number) {
    const opargs = opInfo.args;
    const paramargs = opargs.target ?? [];
    const ttype = opargs.ttype ?? "none";
    const type = opInfo.type ?? "none";
    const from = opInfo.mcount;
    const count = opInfo.count;

    if (type=="card") {
      const card_info = opInfo.args.info;
      for (let card_id in card_info) {

        //handle card discounts
         const displayInfo = this.getTokenDisplayInfo(card_id);
         const original_cost= parseInt(displayInfo.cost);
         const discount_cost = parseInt(card_info[card_id].payop.replace('nm',''));

         if (discount_cost!=original_cost) {
           $('cost_'+card_id).innerHTML=discount_cost.toString();
           $('cost_'+card_id).classList.add('discounted');
         }
      }
    }
  }
  updatePlayerLocalCounters(plColor:string):void {
    this.darhflog('update pl counters',this.local_counters[plColor]);
      for (let key of Object.keys(this.local_counters[plColor])) {
        this.darhflog('updating ','local_counter_'+plColor+'_'+key,'to ',this.local_counters[plColor][key]);
        $('local_counter_'+plColor+'_'+key).innerHTML=this.local_counters[plColor][key];
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
    } else if (tokenInfo.key=='starting_player'){
      result.location=tokenInfo.location.replace('tableau_','fpholder_');
    }
    else if (tokenInfo.key.startsWith("card_corp") && tokenInfo.location.startsWith("tableau")) {
      if (!this.isLayoutFull()) {
        result.location = tokenInfo.location+'_corp_effect';
      } else {
        result.location = tokenInfo.location+'_cards_4'; 
      }
      //also set property to corp logo div
      $(tokenInfo.location+'_corp_logo').dataset.corp=tokenInfo.key;
    } else if (tokenInfo.key.startsWith("card_main") && tokenInfo.location.startsWith("tableau")) {
      const t = this.getRulesFor(tokenInfo.key, "t");
      result.location = tokenInfo.location + "_cards_" + t;
     // if (this.isLayoutFull()) {
        if (this.getRulesFor(tokenInfo.key, "a")) {
          result.location = tokenInfo.location + "_cards_2a" ;
        }
     // }

      if (!this.isLayoutFull()) {
        if (t==1 || t==3) {
          if (this.getRulesFor(tokenInfo.key, "vp",'0')!='0') {
            result.location = tokenInfo.location + "_cards_"+t+'vp' ;
          }
        }
        const plcolor=tokenInfo.location.replace('tableau_','');
        this.local_counters[plcolor]['cards_'+t]++;
        this.updatePlayerLocalCounters(plcolor);

        //auto switch tabs here
        if (!this.isDoingSetup) {
          if ($(tokenInfo.location).dataset['visibility_' + t] == '0') {
            for (let i = 1; i <= 3; i++) {
              let btn = 'player_viewcards_' + i + '_' + tokenInfo.location.replace('tableau_', '');
              this.darhflog('btn is ', btn);
              if (i == t) {
                $(tokenInfo.location).dataset['visibility_' + i] = '1';
                $(btn).dataset.selected = '1';
              } else {
                $(btn).dataset.selected = '0';
                $(tokenInfo.location).dataset['visibility_' + i] = '0';
              }
            }
          }
        }
      }


    }
    if (!result.location)
      // if failed to find revert to server one
      result.location = tokenInfo.location;
    return result;
  }

  isLayoutVariant(num: number) {
    return this.prefs[100].value == num;
  }

  isLayoutFull() {
    return this.isLayoutVariant(2);
  }

  darhflog(...args: any) {
    if (!this.isLayoutFull()) {
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

  getDivForTracker(id: string, value: string | number="") {
    const res = getPart(id,1);
    const icon = `<div class="token_img tracker_${res}">${value}</div>`;
    return  icon; 
  }

  getTokenPresentaton(type: string, tokenKey: string | {log: string, args: any}): string {
    const isstr = typeof tokenKey == "string" ;
    if (isstr &&  tokenKey.startsWith('tracker'))  return this.getDivForTracker(tokenKey);
    if (type=='token_div_count' && !isstr) {
      const id = tokenKey.args['token_name'];
      const mod = tokenKey.args['mod'];
      if (id.startsWith('tracker_m_')) { // just m
         return this.getDivForTracker(id, mod);
      }
      return undefined; // process by parent
    }
    if (isstr) {
      return  this.getTokenName(tokenKey); // just a name for now
    }
    return undefined; // process by parent
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
        if (tid.startsWith('tracker_p_')) {
          tid= tid.replace('tracker_p_','playergroup_plants_');
        }
        if (tid.startsWith('tracker_h_')) {
          tid= tid.replace('tracker_h_','playergroup_heat_');
        }

        if (tid == "none") {
          if (single) {
            this.addActionButton("button_none", _("None"), () => {
              this.sendActionResolveWithTarget(opId, "none");
            });
          }
        } else if (tid.startsWith('tracker_p_')) {


        }
        else {
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
    //custom
    /*
    if (opInfo.type=="convp") {
      //convert plants
      let btnid='playerboard_group_plants';
      this.connect($(btnid),'onclick',()=>{
        this.sendActionResolve(opId);
      })

    }*/
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

      this.updateVisualsFromOp(opInfo,opId);
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
          this.addActionButton("button_skip", _("Done"), () => {
            this.sendActionSkip();
          });
      }
      i = i + 1;
    }
  }

  addUndoButton() {
    if (!$("button_undo")) {
      this.addActionButton("button_undo", _("Undo"), () => this.ajaxcallwrapper_unchecked("undo"), undefined, undefined, "red");
    }
  }

  onUpdateActionButtons_multiplayerChoice(args) {
    let operations = args.player_operations[this.player_id] ?? undefined;
    if (!operations) return;
    this.onUpdateActionButtons_playerTurnChoice(operations);
  }

  onEnteringState_multiplayerDispatch(args) {
    if (!this.isCurrentPlayerActive()) {
      this.addUndoButton();
    }
  }

  onUpdateActionButtons_multiplayerDispatch(args) {
    if (!this.isCurrentPlayerActive()) {
      this.addUndoButton();
    }
  }

  onUpdateActionButtons_after(stateName: string, args: any): void {
    if (this.isCurrentPlayerActive()) {
      // add undo on every state
      if (this.on_client_state) this.addCancelButton();
      else this.addUndoButton();
    }

    this.addActionButton("button_rcss", "Reload CSS", () => reloadCss());
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

  onShowTableauCardsOfColor(event: Event) {
    let id = (event.currentTarget as HTMLElement).id;
    // Stop this event propagation
    dojo.stopEvent(event); // XXX

    const node = $(id);
    const plcolor = node.dataset.player;
    const btncolor = node.dataset.cardtype;
    const tblitem = "visibility_" + btncolor;

    if (this.isLayoutFull()) {
      const selected = node.dataset.selected == "1";
      const value = !selected ? "1" : "0";

      $("tableau_" + plcolor).dataset[tblitem] = value;
      node.dataset.selected = value;
    } else {
      const value = "1";

      for (let i = 1; i <= 3; i++) {
        $("tableau_" + plcolor).dataset["visibility_" + i] = "0";
        $("player_viewcards_" + i + "_" + plcolor).dataset.selected = "0";
      }
      $("tableau_" + plcolor).dataset[tblitem] = value;
      node.dataset.selected = value;
    }
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
