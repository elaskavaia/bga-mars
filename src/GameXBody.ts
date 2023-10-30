
class GameXBody extends GameTokens {
  private reverseIdLookup: Map<String, any>;
  private custom_pay: any;
  private local_counters: any;
  private isDoingSetup: boolean;
  private vlayout: VLayout;
  private localSettings:LocalSettings;
  private customAnimation:CustomAnimation;
  private zoneWidth:number;
  private zoneHeight:number;
  private previousLayout:string;
 // private parses:any;

  constructor() {
    super();
  }

  setup(gamedatas: any) {
    try {
      this.isDoingSetup = true;
      this.defaultTooltipDelay = 800;
      this.vlayout = new VLayout(this);
      this.custom_pay = undefined;
      this.local_counters = [];
      this.clearReverseIdMap();
      this.customAnimation = new CustomAnimation(this);

      //layout
      this.previousLayout='desktop';
      this.zoneWidth =0;
      this.zoneHeight =0;


      super.setup(gamedatas);
      // hexes are not moved so manually connect
      this.connectClass("hex", "onclick", "onToken");

      document.querySelectorAll(".hex").forEach((node) => {
        this.updateTooltip(node.id);
      });

      this.connectClass("viewcards_button", "onclick", "onShowTableauCardsOfColor");

      //view discard content
      this.setupDiscard();

      document.querySelectorAll("#player_config > #player_board_params").forEach((node) => {
        dojo.destroy(node); // on undo this remains but another one generated
      });

      //local settings
      this.localSettings = new LocalSettings("mars", [
        { key: "cardsize", label: _("Card size"), range: { min: 15, max: 200, inc: 5 }, default: 100 },
        { key: "mapsize", label: _("Map size"), range: { min: 15, max: 200, inc: 5, slider: true }, default: 100 },
        { key: "handplace", label: _("Hand placement"), choice: { ontop: _("On top"), floating: _("Floating") }, default: "ontop" },
        {
          key: "playerarea",
          label: _("Player zone placement"),
          choice: { before: _("Before Map"), after: _("After Map") },
          default: "after",
        },
        {
          key: "showbadges",
          label: _("Show Badges on minipanel"),
          choice: { "true": "true", "false": "false" },
          default: "true",
        },
      ]);
      this.localSettings.setup();
      //this.localSettings.renderButton('player_config_row');
      this.localSettings.renderContents('settings-controls-container');
      //floating hand stuff
      this.connect($('hand_area_button_pop'),'onclick', ()=>{
        $('hand_area').dataset.open= $('hand_area').dataset.open=="1" ? "0" : "1";
      });


     // dojo.place("player_board_params", "player_config", "last");    
     if(!$('player_config').innerHTML.includes("player_board_params"))  dojo.place("player_board_params", "player_config", "last");


      document.querySelectorAll(".mini_counter").forEach((node) => {
        const id  = node.id;
        if (id.startsWith('alt_')) {
          this.updateTooltip(id.substring(4), node);
        }
      });
      //update prereq on cards
      this.updateHandPrereqs();

      // card reference
      this.setupHelpSheets();

      this.isDoingSetup = false;
    } catch (e) {
      console.error(e);
      console.log("Ending game setup");
      this.isDoingSetup = false;
      this.showError("Error during game setup: " + e);
    }
  }

  setupPlayer(playerInfo: any) {
    super.setupPlayer(playerInfo);
    this.local_counters[playerInfo.color] = {
      cards_1: 0,
      cards_2: 0,
      cards_3: 0,
    };
    this.vlayout.setupPlayer(playerInfo);
    //move own player board in main zone
    if (playerInfo.id == this.player_id) {
      const board = $(`player_area_${playerInfo.color}`);
      dojo.place(board,'main_board','after');
      dojo.addClass(board,'thisplayer_zone');
    }

  }

  setupHelpSheets() {


    const cc = {main: 0, corp: 0};
    for (const key in this.gamedatas.token_types) {
      const info = this.gamedatas.token_types[key];
      if (key.startsWith('card')) {
        const num = getPart(key,2);
        const type = getPart(key,1);
        var helpnode = document.querySelector(`#allcards_${type} .expandablecontent`);
        if (!helpnode) continue;
        // XXX hook proper rendering
        //const div = dojo.place(`<div id='card_${type}_${num}_help' class='card token card_${type} card_${type}_${num}'></div>`, helpnode);

        const token = {
          key: `card_${type}_${num}_help`,
          location: helpnode.id,
          state: 0
        };
        const tokenNode = this.createToken(token);
        this.syncTokenDisplayInfo(tokenNode);
        this.renderSpecificToken(tokenNode);
        this.updateTooltip(`card_${type}_${num}`, tokenNode);
        cc[type]++;
      }
    }
    const ccmain = cc['main'];
    const cccorp = cc['corp'];
    $(`allcards_main_title`).innerHTML = _(`All Project Cards (${ccmain})`);
    $(`allcards_corp_title`).innerHTML = _(`All Corporate Cards (${cccorp})`);

    // clicks
    dojo.query(".expandablecontent > *").connect("onclick", this, (event) => {
      var id = event.currentTarget.id;
      this.showHelp(id, true);
    });
    dojo.query("#allcards .expandabletoggle").connect("onclick", this, "onToggleAllCards");
  }

  setupDiscard():void {
    this.connect($('discard_title'),'onclick', ()=>{
        let dlg = new ebg.popindialog();
        dlg.create("discard_dlg");
        dlg.setTitle( _("Discard pile contents") );
        const cards_htm = $('discard_main').innerHTML.replaceAll('id="','id="discard_');
        const html = '<div id="discard_dlg_content">'+cards_htm+'</div>';
        dlg.setContent(html);
        dlg.show();

    });
  }

  onScreenWidthChange() {
  //  super.onScreenWidthChange();
    const width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    const height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;

    if (this.zoneWidth!=width || this.zoneHeight!=height) {
   //   console.log("changed res w,h", width, height);

      this.zoneWidth = width;
      this.zoneHeight = height;

      if (dojo.hasClass('ebd-body','mobile_version') && this.previousLayout=='desktop' && width<height) {
        this.previousLayout = 'mobile';
        dojo.addClass('ebd-body', 'mobile_portrait');
      } else if (!dojo.hasClass('ebd-body','mobile_version') && this.previousLayout=='mobile' && width>height) {
        this.previousLayout = 'desktop';
        dojo.removeClass('ebd-body', 'mobile_portrait');
      }
    }
  }

  onToggleAllCards (event: any) {
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
    } else {
      dojo.style(content, "display", "none");
      dojo.removeClass(arrow, "icon20_collapse");
      dojo.addClass(arrow, "icon20_expand");
    }
  }

  onNotif(notif: Notif) {
    super.onNotif(notif);
    this.darhflog('playing notif ' + notif.type + ' with args ', notif.args);

    //Displays message in header while the notif is playing
    let msg = this.format_string_recursive(notif.log, notif.args);
    if (msg != '') {
      $('gameaction_status').innerHTML = msg;
      $('pagemaintitletext').innerHTML = msg;
    }

  }

  //make custom animations depending on situation
  notif_tokenMoved(notif: Notif):any {
    
    super.notif_tokenMoved(notif);
    //pop animation on Tiles
    if (notif.args.token_id && notif.args.token_id.startsWith('tile_')) {
      return this.customAnimation.animateTilePop(notif.args.token_id);
    } else if (notif.args.token_id && notif.args.token_id.startsWith('resource_') && notif.args.place_id.startsWith('card_main_')){
      return this.customAnimation.animatePlaceResourceOnCard(notif.args.token_id, notif.args.place_id);
    } else if (notif.args.token_id && notif.args.token_id.startsWith('resource_') && notif.args.place_id.startsWith('tableau_')){
      return this.customAnimation.animateRemoveResourceFromCard(notif.args.token_id);
    }
  }

  notif_counter(notif: Notif):any {
    super.notif_counter(notif);
    //move animation on main player board counters
    /*
    const counter_move=["m","pm","s","ps","u","pu","p","pp","e","pe","h","ph"].map((item)=>{
      return "tracker_"+item+"_";
    });*/
    const counter_move=["m","s","u","p","e","h","tr"].map((item)=>{
      return "tracker_"+item+"_";
    });

    if ((notif.args.inc) && counter_move.some(trk => notif.args.counter_name.startsWith(trk))) {
      this.customAnimation.animatetingle(notif.args.counter_name);
      return this.customAnimation.moveResources(notif.args.counter_name,notif.args.inc);
    } else {
      if ($(notif.args.counter_name)) {
        return this.customAnimation.animatetingle(notif.args.counter_name);
      } else {
        return this.customAnimation.wait(200);
      }

    }
  
  
  }


  getCardTypeById(type: number) {
    switch (type) {
        case 0: return _('Standard Project');
        case 1: return _('Green Card');
        case 3: return _('Event Card');
        case 2: return _('Blue Card');
        case 4: return _('Corporation');
        case 5: return _('Prelude');
        case 7: return _('Milestone');
        case 8: return _('Award');
        default: return '?';
    }
  }

  generateTooltipSection(label: string, body: string, optional: boolean = true, additional_class:string="") {
    if (optional && !body) return '';
    return `<div class="tt_section ${additional_class}"><div class="tt_intertitle">${label}</div><div class='card_tt_effect'>${body}</div></div>`;
  }

  generateCardTooltip_Compact(displayInfo: TokenDisplayInfo): string {
     const type = displayInfo.t;

      let htm= '<div class="compact_card_tt %adcl"><div class="card_tooltipimagecontainer">%c</div><div class="card_tooltipcontainer" data-card-type="'+type+'">'+ this.generateCardTooltip(displayInfo)+'</div></div>';

      let fullcardhtm="";
      let adClass="";

      if (type>=1 && type<=3) { //main cards
        if (displayInfo.num  &&  $('card_main_' + displayInfo.num)) {
          fullcardhtm = $('card_main_' + displayInfo.num).outerHTML.replaceAll('id="', 'id="tt_').replace('opacity: 0;','');
          if (fullcardhtm.includes('data-invalid_prereq="1"')) {
            adClass += 'invalid_prereq';
          }
        } else {
          fullcardhtm='<div>NOTFOUND</div>';
        }

      } else if (type==4) { //corp
        if (displayInfo.num && $('card_corp_' + displayInfo.num)) {
          fullcardhtm = $('card_corp_' + displayInfo.num).outerHTML.replaceAll('id="', 'id="tt_').replace('opacity: 0;','');
        }
      } else if (type==7 || type==8) { //milestones / awards
        const elem = type==7 ? 'milestone_'+displayInfo.num : 'award_'+displayInfo.num;
        adClass+='award_milestone';
        fullcardhtm = $(elem).outerHTML.replaceAll('id="','id="tt_');

      } else if (type==0) { //standard project
        adClass+='standard_project';
      }



      return htm.replace('%adcl',adClass).replace('%c',fullcardhtm);
  }

  generateCardTooltip(displayInfo: TokenDisplayInfo): string {
    if (!displayInfo) return "?";
    const type = displayInfo.t;
    let type_name = this.getCardTypeById(type);
    let card_id = '';
    if (type>0 && type<7) card_id+= " "+ _(displayInfo.deck) + " #" +  displayInfo.num ?? "";
    let res = '';

    let tags = "";
    if (displayInfo.tags) {
      for (let tag of displayInfo.tags.split(" ")) {
        tags+=_(tag)+" ";
      }
    }

    let vp = displayInfo.text_vp;
    if (!vp) vp = displayInfo.vp;

    res+=this.generateTooltipSection( type_name, card_id);
    if (type!=4) res+=this.generateTooltipSection( _('Cost'), displayInfo.cost);
    res+=this.generateTooltipSection( _('Tags'), tags);
    const prereqText = displayInfo.pre && displayInfo.expr ? CustomRenders.parsePrereqToText(displayInfo.expr.pre, this) : "";
    res+=this.generateTooltipSection( _('Pre-Requisites'), prereqText, true,'tt_prereq');
    res+=this.generateTooltipSection( _('When Played'), displayInfo.text);
    res+=this.generateTooltipSection( _('Effect'), displayInfo.text_effect);
    res+=this.generateTooltipSection( _('Action'), displayInfo.text_action);
    res+=this.generateTooltipSection( _('Holds'), _(displayInfo.holds));
    res+=this.generateTooltipSection( _('Victory Points'), vp);
    return res;
  }


  createHtmlForToken(tokenNode: HTMLElement){
    const displayInfo = this.getTokenDisplayInfo(tokenNode.id);
        // use this to generate some fake parts of card, remove this when use images
        if (displayInfo.mainType == "card") {
          let tagshtm = "";

          //removed custom tt
      /*    const ttdiv = this.createDivNode(null, "card_hovertt", tokenNode.id);
  
          ttdiv.innerHTML = `<div class='token_title'>${displayInfo.name}</div>`;
          ttdiv.innerHTML+=this.generateCardTooltip(displayInfo);
          */

          if (tokenNode.id.startsWith("card_corp_")) {
            //Corp formatting
            const decor = this.createDivNode(null, "card_decor", tokenNode.id);
            // const texts = displayInfo.text.split(';');
            let card_initial = displayInfo.text || "";
            let card_effect = displayInfo.text_effect || "";
  
            //   if (texts.length>0) card_initial = texts[0];
            //  if (texts.length>1) card_effect= texts[1];
            decor.innerHTML = `
                  <div class="card_bg"></div>
                  <div class="card_initial">${card_initial}</div>
                  <div class="card_effect">${card_effect}</div>
            `;
    
          } else if (tokenNode.id.startsWith("card_stanproj")) {
            //standard project formatting:
            //cost -> action title
            //except for sell patents
            const decor = this.createDivNode(null, "stanp_decor", tokenNode.id);
            const parsedActions = CustomRenders.parseActionsToHTML(displayInfo.r);
            //const costhtm='<div class="stanp_cost">'+displayInfo.cost+'</div>';
  
            decor.innerHTML = `
               <div class='stanp_cost'>${displayInfo.cost != 0 ? displayInfo.cost : "X"}</div>
               <div class='standard_projects_title'>${displayInfo.name}</div>  
            `;
          } else {
            //tags
  
            let firsttag = "";
            if (displayInfo.tags && displayInfo.tags != "") {
              for (let tag of displayInfo.tags.split(" ")) {
                tagshtm += '<div class="badge tag_' + tag + '"></div>';
                if (firsttag == "") firsttag = tag;
              }
            }
            // const parsedActions = CustomRenders.parseActionsToHTML(displayInfo.a ?? displayInfo.e ?? "");
            let parsedPre = displayInfo.pre ? CustomRenders.parsePrereqToHTML(displayInfo.expr.pre) : "";
  
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
            const decor = this.createDivNode(null, "card_decor", tokenNode.id);
            let vp = "";
            if (displayInfo.vp) {
              vp = parseInt(displayInfo.vp) ? '<div class="card_vp">' + displayInfo.vp + "</div>" : '<div class="card_vp">*</div>';
            } else {
              vp = "";
            }
            const cn_binary = displayInfo.num ? parseInt(displayInfo.num).toString(2).padStart(8,'0') : "";
  
            //rules+rules styling
            //let card_r = this.parseRulesToHtml(displayInfo.r, displayInfo.num || null );
            let card_r = "";
            let addeffclass = "";
            if (displayInfo.r) {
              card_r = CustomRenders.parseExprToHtml(displayInfo.expr.r, displayInfo.num || null);
              addeffclass = card_r.includes("icono_prod") ? "cols" : "rows";
              const blocks = (card_r.match(/card_icono/g) || []).length;
              addeffclass += " blocks_" + blocks;
              const cntLosses = (card_r.match(/cnt_losses/g) || []).length;
              const cntGains = (card_r.match(/cnt_gains/g) || []).length;
              const cntProds = (card_r.match(/cnt_media/g) || []).length;
              if (
                ((cntLosses > 0 && cntGains == 0) || (cntGains > 0 && cntLosses == 0)) &&
                (cntLosses + cntGains > 1 || (cntLosses + cntGains == 1 && cntProds > 3))
              ) {
                //exceptions
                if (displayInfo.num && displayInfo.num != 19) {
                  card_r = '<div class="groupline">' + card_r + "</div>";
                  addeffclass += " oneline";
                }
              }
              if (vp != "") addeffclass += " hasvp";
              //replaces some stuff in parsed rules
              card_r = card_r.replace("%card_number%", displayInfo.num);
              //special for "res"
               card_r = card_r.replaceAll("%res%",displayInfo.holds);
            }
  
            //card actions
            let card_a = "";
            if (displayInfo.a) {
              card_a = CustomRenders.parseExprToHtml(displayInfo.expr.a, displayInfo.num || null, true);
            } else if (displayInfo.e) {
               card_a = CustomRenders.parseExprToHtml(displayInfo.expr.e, displayInfo.num || null, false, true);
            }
            //card 71 has effect in rules
            if (displayInfo.num == 71) {
              card_a = CustomRenders.customcard_action_71();
            }
            //same for 153
            if (displayInfo.num==153) {
              card_a=card_r;
              card_r="";
            }
           //card 206 hads rules in action part
            if (displayInfo.num==206) {
              card_r=card_a;
              card_a='';
            }
  
            //special for "res"
            card_a = card_a.replaceAll("%res%", displayInfo.holds);
            let card_action_text = "";
            if (displayInfo.text_action || displayInfo.text_effect) {
              card_action_text = `<div class="card_action_line card_action_text">${displayInfo.text_action || displayInfo.text_effect}</div>`;
            }

            const holds=displayInfo.holds ?? "Generic"
            const htm_holds='<div class="card_line_holder"><div class="cnt_media token_img tracker_res'+holds+'"></div><div class="counter_sep">:</div><div id="resource_holder_counter_'+tokenNode.id.replace('card_main_','')+'" class="resource_counter"  data-resource_counter="0"></div></div>';


            decor.innerHTML = `
                  <div class="card_illustration cardnum_${displayInfo.num}"></div>
                  <div class="card_bg"></div>
                  <div class='card_badges'>${tagshtm}</div>
                  <div class='card_title'><div class='card_title_inner'>${displayInfo.name}</div></div>
                  <div id='cost_${tokenNode.id}' class='card_cost'>${displayInfo.cost}</div> 
                  <div class="card_outer_action"><div class="card_action"><div class="card_action_line card_action_icono">${card_a}</div>${card_action_text}</div><div class="card_action_bottomdecor"></div></div>
                  <div class="card_effect ${addeffclass}">${card_r}<div class="card_tt">${displayInfo.text || ""}</div></div>           
                  <div class="card_prereq">${parsedPre !== "" ? parsedPre : ""}</div>
                  <div class="card_number">${displayInfo.num ?? ""}</div>
                  <div class="card_number_binary">${cn_binary}</div>
                  <div id="resource_holder_${tokenNode.id.replace('card_main_','')}" class="card_resource_holder ${displayInfo.holds ?? ""}" data-resource_counter="0">${htm_holds}</div>
                  ${vp}
            `;
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
          //tokenNode.appendChild(ttdiv);

  
          tokenNode.setAttribute("data-card-type", displayInfo.t);
        }
  
        if (displayInfo.mainType=="award" || displayInfo.mainType=="milestone") {
          //custom tooltip on awards and milestones
          const dest= tokenNode.id.replace(displayInfo.mainType+'_',displayInfo.mainType+ '_label_');
          $(dest).innerHTML=_(displayInfo.name);

          /* Disabled custom tt
          const ttdiv = this.createDivNode(null, "card_hovertt", tokenNode.id);
          ttdiv.innerHTML = ` 
              <div class='token_title'>${displayInfo.name}</div>
              <div class='card_effect'>${displayInfo.text}</div>
          `;
          tokenNode.appendChild(ttdiv);
          */
        }
  }

  syncTokenDisplayInfo(tokenNode: HTMLElement) {
    if (!tokenNode.getAttribute("data-info")) {
      const displayInfo = this.getTokenDisplayInfo(tokenNode.id);
      const classes = displayInfo.imageTypes.split(/  */);
      tokenNode.classList.add(...classes);
      tokenNode.setAttribute("data-info", "1");
      this.connect(tokenNode, "onclick", "onToken");
      if (!this.isLayoutFull()) {
         this.createHtmlForToken(tokenNode);
      }
    }
  }

  setDomTokenState(tokenId: ElementOrId, newState: any) {
    super.setDomTokenState(tokenId, newState);
    var node = $(tokenId);
    if (!node) return;
    if (!node.id) return;

    //intercept player passed state
    if (node.id.startsWith("tracker_passed_")) {
      const plColor = node.id.replace("tracker_passed_", "");
      const plId = this.getPlayerIdByColor(plColor);
      if (newState == 1) {
        this.disablePlayerPanel(parseInt(plId));
      } else {
        this.enablePlayerPanel(parseInt(plId));
      }
    }

    //tracker w
    if (node.id.startsWith("tracker_w")) {
      $(node.id).dataset.calc = (9-parseInt(newState)).toString();
    }


    //handle copies of trackers
    const trackerCopy = "alt_" + node.id;
    const nodeCopy = $(trackerCopy);
    if (nodeCopy) {
      super.setDomTokenState(trackerCopy, newState);
    }
  }
  renderSpecificToken(tokenNode: HTMLElement) {
    this.vlayout.renderSpecificToken(tokenNode);
  }

  //finer control on how to place things
  createDivNode(id?: string | undefined, classes?: string, location?: string): HTMLDivElement {
    const div = super.createDivNode(id, classes, location);
    return div;
  }


  updateTokenDisplayInfo(tokenDisplayInfo: TokenDisplayInfo) {
    // override to generate dynamic tooltips and such
      if (this.isLayoutFull()) {
        tokenDisplayInfo.tooltip = this.generateCardTooltip(tokenDisplayInfo);
      } else {
        tokenDisplayInfo.tooltip = this.generateCardTooltip_Compact(tokenDisplayInfo);
      }


    // if (this.isLocationByType(tokenDisplayInfo.key)) {
    //   tokenDisplayInfo.imageTypes += " infonode";
    // }
  }

  updateHandPrereqs():void {
    if (!this.player_id) return;
    const nodes= dojo.query('#hand_area .card');
    for (let node of nodes) {

      // const card_id = node.id.replace('card_main_','');
      const displayInfo = this.getTokenDisplayInfo(node.id);
      if (!displayInfo) continue;
      if (!displayInfo.expr.pre) continue;

      let op = "";
      let what = "";
      let qty=0;

      if (typeof displayInfo.expr.pre === 'string') {
        op = ">=";
        what = displayInfo.expr.pre;
        qty=1;
      } else {
        if (displayInfo.expr.pre.length<3) {
          continue

        } else {
          op = displayInfo.expr.pre[0];
          what = displayInfo.expr.pre[1];
          qty=displayInfo.expr.pre[2];
        }
      }

      let tracker="";
      switch (what) {
        case "o":
          tracker='tracker_o';
          break;
        case "t":
          tracker='tracker_t';
          break;
        case "tagScience":
          tracker='tracker_tagScience_'+this.getPlayerColor(this.player_id);
          break;
        case "tagEnergy":
          tracker='tracker_tagEnergy_'+this.getPlayerColor(this.player_id);
          break;
        case "tagJovian":
          tracker='tracker_tagJovian_'+this.getPlayerColor(this.player_id);
          break;
        case "forest":
          tracker='tracker_tagForest_'+this.getPlayerColor(this.player_id);
          break;
        case "w":
          tracker='tracker_w';
          break;
        case "ps":
          tracker='tracker_ps_'+this.getPlayerColor(this.player_id);
          break;
        case "all_city":
         // global city tracker exists ?

          break;
      }

      if (tracker=="") {
        continue;
      }

      let valid=false;

      // const actual = this.getTokenInfoState(tracker);
      if (!$(tracker)) {
        continue;
      }
      if (!$(tracker).dataset.state) {
        continue;
      }
      const actual =parseInt($(tracker).dataset.state);

      if (op=="<=") {
        if (actual<=qty) valid= true;
      } else if (op=="<") {
        if (actual<qty) valid= true;
      } else if (op==">") {
        if (actual>qty) valid= true;
      } else if (op==">=") {
        if (actual>=qty) valid= true;
      }

      if (!valid) {
        node.dataset.invalid_prereq=1;
      } else {
        node.dataset.invalid_prereq=0;
      }
      //update TT too
      this.updateTooltip(node.id);
    }
  }

  updateVisualsFromOp(opInfo: any, opId: number) {
    const opargs = opInfo.args;
    const paramargs = opargs.target ?? [];
    const ttype = opargs.ttype ?? "none";
    const type = opInfo.type ?? "none";
    const from = opInfo.mcount;
    const count = opInfo.count;

    if (type == "card") {
      const card_info = opInfo.args.info;
      for (let card_id in card_info) {
        //handle card discounts
        const displayInfo = this.getTokenDisplayInfo(card_id);
        const original_cost = parseInt(displayInfo.cost);
        const payop = card_info[card_id].payop;
        const discount_cost = parseInt(payop.replace("nm", "").replace("nop",0)) || 0;

        if (discount_cost != original_cost) {
          $("cost_" + card_id).innerHTML = discount_cost.toString();
          $("cost_" + card_id).classList.add("discounted");
        }
      }
    }
  }
  updatePlayerLocalCounters(plColor: string): void {
    this.darhflog("update pl counters", this.local_counters[plColor]);
    for (let key of Object.keys(this.local_counters[plColor])) {
      //this.darhflog("updating ", "local_counter_" + plColor + "_" + key, "to ", this.local_counters[plColor][key]);
      $("local_counter_" + plColor + "_" + key).innerHTML = this.local_counters[plColor][key];
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
    } else if (tokenInfo.key=='starting_player'){
      result.location=tokenInfo.location.replace('tableau_','fpholder_');
    } else if (tokenInfo.key.startsWith("resource_") && !this.isLayoutFull()) {
      if (tokenInfo.location.startsWith('card_main_')) {
        //resource added to card
        result.location=tokenInfo.location.replace('card_main_','resource_holder_');
        const dest_holder:string = tokenInfo.location.replace('card_main_','resource_holder_');
        const dest_counter:string = tokenInfo.location.replace('card_main_','resource_holder_counter_');
        $(dest_holder).dataset.resource_counter=(parseInt($(dest_holder).dataset.resource_counter)+1).toString();
        $(dest_counter).dataset.resource_counter=(parseInt($(dest_counter).dataset.resource_counter)+1).toString();
      } else if (tokenInfo.location.startsWith('tableau_')) {
        //resource moved from card
        //which card ?
        const dest_holder = $(tokenInfo.key) ? $(tokenInfo.key).parentElement.id : "";
        if (dest_holder.includes("holder_")) {
          const dest_counter =dest_holder.replace('holder_','holder_counter_');
          if (dojo.byId(dest_holder)){
            $(dest_holder).dataset.resource_counter=(parseInt($(dest_holder).dataset.resource_counter)-1).toString();
            $(dest_counter).dataset.resource_counter=(parseInt($(dest_counter).dataset.resource_counter)-1).toString();
          }
        }


      }
    } else if (tokenInfo.key.startsWith("marker_")) {
      if (tokenInfo.location.startsWith('award')) {
        this.strikeNextAwardMilestoneCost('award');
      }
     else if (tokenInfo.location.startsWith('milestone')) {
        this.strikeNextAwardMilestoneCost('milestone');
      }
    }
     else if (tokenInfo.key.startsWith("card_corp") && tokenInfo.location.startsWith("tableau")) {
      
      result.location = tokenInfo.location + "_corp_effect";

      //also set property to corp logo div
      $(tokenInfo.location + "_corp_logo").dataset.corp = tokenInfo.key;
    } else if (tokenInfo.key.startsWith("card_main") && tokenInfo.location.startsWith("tableau")) {
      const t = this.getRulesFor(tokenInfo.key, "t");
      result.location = tokenInfo.location + "_cards_" + t;

      if (this.getRulesFor(tokenInfo.key, "a")) {
        result.location = tokenInfo.location + "_cards_2a";
      }

      const plcolor = tokenInfo.location.replace("tableau_", "");
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
            let original=0;
            for (let i = 1; i <= 3; i++) {
              if ($(tokenInfo.location).dataset["visibility_" + i] == "1") original =i;
            }
            for (let i = 1; i <= 3; i++) {
              let btn = "player_viewcards_" + i + "_" + tokenInfo.location.replace("tableau_", "");
              if (i == t) {
                $(tokenInfo.location).dataset["visibility_" + i] = "1";
                $(btn).dataset.selected = "1";
              } else {
                $(btn).dataset.selected = "0";
                $(tokenInfo.location).dataset["visibility_" + i] = "0";
              }
            }
            this.customAnimation.setOriginalFilter(tokenInfo.location,original,t);
          }
        }
      }
    }
    if (!result.location)
      // if failed to find revert to server one
      result.location = tokenInfo.location;
    return result;
  }

  strikeNextAwardMilestoneCost(kind:string) {
    for (let idx = 1; idx <= 3; idx++) {
      if ($(kind+'_cost_' + idx).dataset.striked != "1") {
        $(kind+'_cost_' + idx).dataset.striked = "1";
        break;
      }
    }
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

  getDivForTracker(id: string, value: string | number = "") {
    const res = getPart(id, 1);
    const icon = `<div class="token_img tracker_${res}">${value}</div>`;
    return icon;
  }
  
    getButtonColorForOperation(op: any) {
    if (op.type=="pass") return "red";
    if (op.type=="skipsec") return "orange";
    return "blue";
  }

  getTokenPresentaton(type: string, tokenKey: string | { log: string; args: any }): string {
    const isstr = typeof tokenKey == "string";
    if (isstr && tokenKey.startsWith("tracker")) return this.getDivForTracker(tokenKey);
    if (type == "token_div_count" && !isstr) {
      const id = tokenKey.args["token_name"];
      const mod = tokenKey.args["mod"];
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
        if (tid == "none") {
          if (single) {
            this.addActionButton("button_none", _("None"), () => {
              this.sendActionResolveWithTarget(opId, "none");
            });
          }
        } else {
          const divId = this.getActiveSlotRedirect(tid);
          this.setActiveSlot(divId);
          this.setReverseIdMap(divId, opId, tid);
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
      const args = this.gamedatas.gamestate.args ??  this.gamedatas.gamestate.private_state.args;
      const operations =  args.operations ?? args.player_operations[this.player_id].operations;
 
      paramargs.forEach((tid: string, i: number) => {
        if (single) {
          const detailsInfo = operations[opId].args?.info?.[tid];
          const sign = detailsInfo.sign; // 0 complete payment, -1 incomplete, +1 overpay
          //console.log("enum details "+tid,detailsInfo);
          let buttonColor = undefined;
          if (sign < 0) buttonColor = "gray";
          if (sign > 0) buttonColor = "red";
          const divId = "button_" + i;
          let title = '<div class="custom_paiement_inner">' + this.resourcesToHtml(detailsInfo.resources) + "</div>";

          if (tid == "payment") {
            //show only if options
            const opts = operations[opId].args.info?.[tid];
            if (
              Object.entries(opts.resources).reduce(
                (sum: number, [key, val]: [string, unknown]) =>
                  sum + (key !== "m" && typeof val === "number" && Number.isInteger(val) ? val : 0),
                0
              ) > 0
            ) {
              this.createCustomPayment(opId, opts);
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
                  this.sendActionResolveWithTargetAndPayment(opId, tid, operations[opId].args.info?.[first]?.resources);

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

  /** When server wants to activate some element, ui may adjust it */
  getActiveSlotRedirect(_node: string): string {
    let node = $(_node);
    if (!node) {
      this.showError("Not found " + _node);
      return _node;
    }
    const id = node.id;
    if (!id) return _node;
    let target: ElementOrId = id;
    if (id.startsWith("tracker_p_")) {
      target = id.replace("tracker_p_", "playergroup_plants_");
    }
    if (id.startsWith("tracker_h_")) {
      target = id.replace("tracker_h_", "playergroup_heat_");
    }
    return target;
  }

  //Adds the payment picker according to available alternative payment options
  createCustomPayment(opId, info) {
    this.custom_pay = {
      needed: info.count,
      selected: {},
      available: [],
      rate: [],
    };

    let items_htm = "";
    for (let res in info.resources) {
      this.custom_pay.selected[res] = 0;
      this.custom_pay.available[res] = info.resources[res];
      this.custom_pay.rate[res] = info.rate[res];

      //megacredits are spent automatically
      if (res == "m") {
        this.custom_pay.selected[res] = this.custom_pay.available[res];
        continue;
      }

      if (this.custom_pay.available[res] <= 0) continue;
      //add paiments buttons
      items_htm += `
        <div class="payment_group">
           <div class="token_img tracker_${res}"></div>
           <div class="item_worth">
               <div class="token_img tracker_m payment_item">${this.custom_pay.rate[res]}</div>
          </div>
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
    const txt = _("Custom:");
    const button_htm = this.resourcesToHtml(this.custom_pay.selected, true);

    const button_whole = "Pay %s".replace("%s", button_htm);
    const paiement_htm = `
      <div class="custom_paiement_inner">
        ${txt}
        ${items_htm}
        <div id="btn_custompay_send" class="action-button bgabutton bgabutton_blue">${button_whole}</div>
      </div>
    `;
    const node = this.createDivNode("custom_paiement", "", "generalactions");
    node.innerHTML = paiement_htm;

    //adds actions to button payments
    this.connectClass("btn_payment_item", "onclick", (event) => {
      const id = (event.currentTarget as HTMLElement).id;
      const direction = $(id).dataset.direction;
      const res = $(id).dataset.resource;
      dojo.stopEvent(event);

      if (direction == "minus") {
        if (this.custom_pay.selected[res] > 0) {
          this.custom_pay.selected[res]--;
        }
      }
      if (direction == "plus") {
        if (this.custom_pay.selected[res] < this.custom_pay.available[res]) {
          this.custom_pay.selected[res]++;
        }
      }
      $("payment_item_" + res).innerHTML = this.custom_pay.selected[res];

      let total_res = 0;
      // let values_htm='';
      for (let res in this.custom_pay.rate) {
        if (res != "m") {
          total_res = total_res + this.custom_pay.rate[res] * this.custom_pay.selected[res];
          //  values_htm+=`<div class="token_img tracker_${res}">${this.custom_pay.selected[res]}</div>`;
        }
      }
      let mc = this.custom_pay.needed - total_res;
      if (mc < 0) {
        mc = 0;
        $("btn_custompay_send").classList.add("overpay");
      } else {
        $("btn_custompay_send").classList.remove("overpay");
      }
      this.custom_pay.selected["m"] = mc;
      //   values_htm+=` <div class="token_img tracker_m payment_item">${mc}</div>`;
      const values_htm = this.resourcesToHtml(this.custom_pay.selected, true);

      $("btn_custompay_send").innerHTML = "Pay %s".replace("%s", values_htm);
    });

    //adds action to final payment button
    this.connect($("btn_custompay_send"), "onclick", () => {
      let pays = {};
      //backend doesn't accept 0 as paiment
      for (let res of Object.keys(this.custom_pay.selected)) {
        if (this.custom_pay.selected[res] > 0) pays[res] = parseInt(this.custom_pay.selected[res]);
      }
      this.sendActionResolveWithTargetAndPayment(opId, "payment", pays);
    });
  }

  resourcesToHtml(resources: any, show_zeroes: boolean = false): string {
    var htm = "";
    const allResources = ["m", "s", "u", "h"];

    allResources.forEach((item) => {
      if (resources[item] != undefined && (resources[item] > 0 || show_zeroes === true)) {
        htm += `<div class="token_img tracker_${item} payment_item">${resources[item]}</div>`;
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

      let name="";
      let contains_gfx=false;
      //if (opInfo.typeexpr && opInfo.data && opInfo.data!="" && !this.isLayoutFull()) {
       //  name= '<div class="innerbutton">'+CustomRenders.parseExprToHtml(opInfo.typeexpr)+'</div>';
       //  contains_gfx=true;
     // } else {
         name = this.getButtonNameForOperation(opInfo);
    //  }


      const color = this.getButtonColorForOperation(opInfo);
      const paramargs = opargs.target ?? [];
      const singleOrFirst = single || (ordered && i == 0);

      this.updateVisualsFromOp(opInfo, opId);
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
          },null,null,color);
        } else {
          this.addActionButton("button_" + opId, name, () => {
            this.sendActionResolve(opId);
          },null,null,color);


        }

        if (color!="blue" && color!="red") {
          $('button_'+opId).classList.remove('bgabutton_blue');
          $('button_'+opId).classList.add('bgabutton_'+color);
        }
        if (contains_gfx) {
          $('button_'+opId).classList.add('gfx');
          $('button_'+opId).setAttribute('title', this.getButtonNameForOperation(opInfo));
        }

        if (opargs.void) {
          dojo.addClass("button_" + opId, "disabled");
        }
      }
      // add done (skip) when optional
      if (singleOrFirst) {
        if (opInfo.mcount <= 0) {
          this.addActionButton("button_skip", _("Done"), () => {
            this.sendActionSkip();
          });
           $('button_skip').classList.remove('bgabutton_blue');
           $('button_skip').classList.add('bgabutton_orange');
        }
      }
      i = i + 1;
    }

    //refresh prereqs rendering on hand cards
    //TODO : check if this place is pertinent
    this.updateHandPrereqs();
  }

  addUndoButton() {
    if (!$("button_undo")) {
      this.addActionButton("button_undo", _("Undo"), () => this.ajaxcallwrapper_unchecked("undo"), undefined, undefined, "red");
    }
  }

  onUpdateActionButtons_multiplayerChoice(args) {
    let operations = args.player_operations[this.player_id] ?? undefined;
    if (!operations) {
      this.addUndoButton();
      return;
    }
    this.onUpdateActionButtons_playerTurnChoice(operations);
  }

  onEnteringState_multiplayerDispatch(args) {
    if (!this.isCurrentPlayerActive()) {
      this.addUndoButton();
    }
  }

  onUpdateActionButtons_multiplayerDispatch(args) {
    this.addUndoButton();
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
    //debugger;
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
