const LAYOUT_PREF_ID = 100;

class GameXBody extends GameTokens {
  private reverseIdLookup: Map<String, any>;
  private custom_pay: any;
  private local_counters: any;
  private isDoingSetup: boolean;
  private vlayout: VLayout;
  private localSettings: LocalSettings;
  private customAnimation: CustomAnimation;
  private zoneWidth: number;
  private zoneHeight: number;
  private previousLayout: string;
  private CON: { [key: string]: string };
  public readonly productionTrackers = ["pm", "ps", "pu", "pp", "pe", "ph"];
  public readonly resourceTrackers = ["m", "s", "u", "p", "e", "h"];
  //score cache
  private cachedScoreMoveNbr: string = "0";
  private cachedScoreHtm: string = "";
  // private parses:any;

  constructor() {
    super();
    this.CON = {};
  }

  setup(gamedatas: any) {
    try {
      this.isDoingSetup = true;
      this.CON = gamedatas.CON; // PHP contants for game
      const theme = this.prefs[LAYOUT_PREF_ID].value ?? 1;
      const root = document.children[0]; // weird
      dojo.addClass(root, this.prefs[LAYOUT_PREF_ID].values[theme].cssPref);
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

      super.setup(gamedatas);

      // hex tooltips
      document.querySelectorAll(".hex").forEach((node) => {
        this.updateTooltip(node.id);
      });
      // hexes are not moved so manually connect
      this.connectClass("hex", "onclick", "onToken");

      //player controls
      this.connectClass("viewcards_button", "onclick", "onShowTableauCardsOfColor");

      //Give tooltips to alt trackers in player boards
      const togglehtml = this.getTooptipHtml(
        _("Card visibility toggle"),
        _("Shows number of cards of corresponding color on tableau"),
        "",
        _("Click to show or hide cards")
      );

      document.querySelectorAll(".player_controls .viewcards_button").forEach((node) => {
        // have to attach tooltip directly, this element does not have a game model
        this.addTooltipHtml(node.id, togglehtml, this.defaultTooltipDelay);
      });

      //view discard content
      this.setupDiscard();

      //floating hand stuff
      this.connect($("hand_area_button_pop"), "onclick", () => {
        $("hand_area").dataset.open = $("hand_area").dataset.open == "1" ? "0" : "1";
      });

      // fixed for undo in fake player panel
      document.querySelectorAll("#player_config > #player_board_params").forEach((node) => {
        dojo.destroy(node); // on undo this remains but another one generated
      });
      dojo.place("player_board_params", "player_config", "last");

      //give tooltips to params
      document.querySelectorAll("#player_config .params_line").forEach((node) => {
        this.updateTooltip(node.id, node);
      });

      //Give tooltips to trackers in mini boards
      document.querySelectorAll(".mini_counter").forEach((node) => {
        const id = node.id;
        if (id.startsWith("alt_")) {
          this.updateTooltip(id.substring(4), node);
        }
      });

      //Give tooltips to alt trackers in player boards
      document.querySelectorAll(".tracker").forEach((node) => {
        const id = node.id;
        if (id.startsWith("alt_")) {
          this.updateTooltip(id.substring(4), node);
        }
      });

      //translate some text set in .tpl
      if ($("generation_text")) $("generation_text").innerHTML = _("Gen");
      $("scoretracker_text").innerHTML = _("Score");
      $("milestones_title").innerHTML = _("Milestones");
      $("awards_title").innerHTML = _("Awards");

      //update prereq on cards
      this.updateHandInformation(this.gamedatas["card_info"], "card");

      if ($("hand_area").dataset.sort_type == "manual") {
        document.querySelectorAll(".handy .card").forEach((node: HTMLElement) => {
          this.enableDragOnCard(node);
        });
      }

      // card reference
      this.setupHelpSheets();

      this.connect($("zoom-out"), "onclick", () => {
        const ms = this.localSettings.getLocalSettingById("mapsize");
        this.localSettings.doAction(ms, "minus");
        const cs = this.localSettings.getLocalSettingById("cardsize");
        this.localSettings.doAction(cs, "minus");
      });
      this.connect($("zoom-in"), "onclick", () => {
        const ms = this.localSettings.getLocalSettingById("mapsize");
        this.localSettings.doAction(ms, "plus");
        const cs = this.localSettings.getLocalSettingById("cardsize");
        this.localSettings.doAction(cs, "plus");
      });

      this.setupResourceFiltering();

      if (!this.isSpectator && this.player_color) {
        this.loadLocalManualOrder($(`hand_${this.player_color}`));
        this.loadLocalManualOrder($(`draw_${this.player_color}`));
      }

      $(`outer_scoretracker`).addEventListener("click", () => {
        this.onShowScoringTable(0);
      });

      //2p specific
      if (Object.keys(gamedatas.players).length == 2) {
        $("ebd-body").classList.add("twoplayers");
      }

      this.vlayout.setupDone();
      //this.setupOneTimePrompt();
    } catch (e) {
      console.error(e);
      console.log("Ending game setup");
      this.showError("Error during game setup: " + e);
    } finally {
      this.isDoingSetup = false;
    }
  }

  setupPlayer(playerInfo: any) {
    super.setupPlayer(playerInfo);

    $(`player_score_${playerInfo.id}`).addEventListener("click", () => {
      this.onShowScoringTable(playerInfo.id);
    });

    this.local_counters[playerInfo.color] = {
      cards_1: 0,
      cards_2: 0,
      cards_3: 0
    };
    this.vlayout.setupPlayer(playerInfo);

    //attach sort buttons
    if (playerInfo.id == this.player_id) {
      //generate buttons
      //I wanted first to attach them to every handy area, but it prevents areas to hide (there is no way in css to evaluate the number of children of a node)
      //So I attached it to the hand area block.
      this.addSortButtonsToHandy($("hand_area"));

      this.enableManualReorder("hand_" + this.player_color);
      this.connectClass("hs_button", "onclick", (evt: Event) => {
        let btn = evt.currentTarget as HTMLElement;
        dojo.stopEvent(evt);
        const actual_dir: string = btn.dataset.direction;
        const new_dir: string = actual_dir == "" ? "increase" : actual_dir == "increase" && btn.dataset.type != "manual" ? "decrease" : "";
        const hand_block: string = btn.dataset.target;

        //deactivate sorting on other buttons
        dojo.query("#" + hand_block + " .hs_button").forEach((item) => {
          $(item).dataset.direction = "";
        });

        $(hand_block).dataset.sort_type = btn.dataset.type;
        $(hand_block).dataset.sort_direction = new_dir;
        btn.dataset.direction = new_dir;

        const localColorSetting = new LocalSettings(this.getLocalSettingNamespace("card_sort"));
        localColorSetting.writeProp("sort_direction", new_dir);
        localColorSetting.writeProp("sort_type", btn.dataset.type);

        if (btn.dataset.type == "manual" && new_dir == "increase") {
          this.loadLocalManualOrder($(`hand_${this.player_color}`));
          this.loadLocalManualOrder($(`draw_${this.player_color}`));

          document.querySelectorAll("#hand_area .card").forEach((card: any) => {
            this.enableDragOnCard(card);
          });
        } else {
          document.querySelectorAll("#hand_area .card").forEach((card: any) => {
            this.disableDragOnCard(card);
          });
        }
      });
    }

    //move own player board in main zone
    if (playerInfo.id == this.player_id || (!this.isLayoutFull() && this.isSpectator && !document.querySelector(".thisplayer_zone"))) {
      const board = $(`player_area_${playerInfo.color}`);
      dojo.place(board, "main_board", "after");
      dojo.addClass(board, "thisplayer_zone");
    }

    //read last saved value for filter in digital view
    if (!this.isLayoutFull()) {
      const localColorSetting = new LocalSettings(this.getLocalSettingNamespace(playerInfo.color + "_" + this.table_id));
      const selected = localColorSetting.readProp("digital_cardfilter", "0");

      for (let i = 0; i <= 3; i++) {
        $("tableau_" + playerInfo.color).dataset["visibility_" + i] = "0";
        $("player_viewcards_" + i + "_" + playerInfo.color).dataset.selected = "0";
      }

      $("tableau_" + playerInfo.color).dataset["visibility_" + selected] = "1";
      $("player_viewcards_" + selected + "_" + playerInfo.color).dataset.selected = "1";
    }
  }

  onShowScoringTable(playerId: number) {
    const mv: string = $("move_nbr").innerHTML;
    let finalhtm: string = "";

    const showFunc = (htm: string) => {
      let dlg = new ebg.popindialog();
      dlg.create("score_dlg");
      dlg.setTitle(_("Score Summary"));
      dlg.setContent(htm);
      dlg.show();
    };

    if (mv === this.cachedScoreMoveNbr && this.cachedScoreHtm != "") {
      showFunc(this.cachedScoreHtm);
    } else {
      let url = `/${this.game_name}/${this.game_name}/getRollingVp.html`;

      this.ajaxcall(url, [], this, (result) => {
        const tablehtm: string = `
             <div id="scoretable">
                <div class="scoreheader scorecol">
                      <div class="scorecell header">${_("Player Name")}</div>
                      <div class="scorecell header corp">${_("Corporation")}</div>
                      <div class="scorecell ">${_("Terraforming Rank")}</div>
                      <div class="scorecell ">${_("VP from cities")}</div>
                      <div class="scorecell ">${_("VP from greeneries")}</div>
                      <div class="scorecell ">${_("VP from Awards")}</div>
                      <div class="scorecell ">${_("VP from Milestones")}</div>
                      <div class="scorecell ">${_("VP from cards")}</div>
                      <div class="scorecell header total">${_("VP total")}</div>
                </div>
                %lines%
              </div>`;

        let lines: string = "";
        for (let plid in result.data.contents) {
          const entry: any = result.data.contents[plid];
          const plcolor: any = this.getPlayerColor(parseInt(plid));
          const corp: string = $("tableau_" + plcolor + "_corp_logo").dataset.corp;
          lines =
            lines +
            `
                <div class=" scorecol">
                      <div class="scorecell header name" style="color:#${plcolor};">${this.gamedatas.players[plid].name}</div>
                      <div class="scorecell header corp" ><div class="corp_logo" data-corp="${corp}"></div></div>
                      <div class="scorecell score">${entry.total_details.tr}</div>
                      <div class="scorecell score">${entry.total_details.cities}</div>
                      <div class="scorecell score">${entry.total_details.greeneries}</div>
                      <div class="scorecell score">${entry.total_details.awards}</div>
                      <div class="scorecell score">${entry.total_details.milestones}</div>
                      <div class="scorecell score">${entry.total_details.cards}</div>
                      <div class="scorecell score header total">${entry.total}</div>
                </div>`;
        }
        finalhtm = tablehtm.replace("%lines%", lines);
        this.cachedScoreMoveNbr = mv;
        this.cachedScoreHtm = finalhtm;
        showFunc(finalhtm);
      });
    }
  }

  getLocalSettingNamespace(extra: string | number = "") {
    return `${this.game_name}-${this.player_id}-${extra}`;
  }

  setupLocalSettings() {
    //local settings, include user id into setting string so it different per local player and theme
    const theme = this.prefs[LAYOUT_PREF_ID].value ?? 1;
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
        key: "hidebadges",
        label: _("Hide badges on minipanel"),
        choice: { hide: true },
        default: false,
        ui: "checkbox"
      },
      { key: "animationamount", label: _("Animations amount"), range: { min: 1, max: 3, inc: 1 }, default: 3, ui: "slider" },
      { key: "animationspeed", label: _("Animation time"), range: { min: 25, max: 200, inc: 5 }, default: 100, ui: "slider" }
    ]);
    this.localSettings.setup();
    //this.localSettings.renderButton('player_config_row');
    this.localSettings.renderContents("settings-controls-container");
  }

  /**
   * This asks to select the theme, only on for alpha
   */
  setupOneTimePrompt() {
    if (typeof g_replayFrom != "undefined" || g_archive_mode) return;
    const ls = new LocalSettings(this.getLocalSettingNamespace()); // need another instance to save once per machine not per user/theme like others

    if (ls.readProp("activated")) return;
    ls.writeProp("activated", "1");

    const dialog = new ebg.popindialog();
    dialog.create("theme_selector");
    const op1 = this.prefs[LAYOUT_PREF_ID].values[1];
    const op2 = this.prefs[LAYOUT_PREF_ID].values[2];
    // not translating this - will be removed after alpha
    const desc = `
    Please select a theme below - the user interface will look slightly different. You can change this later.<br>
    <ul>
    <li> ${op1.name}  - ${op1.description} 
    <li> ${op2.name}  - ${op2.description} 
    </ul>
    For theme and other settings, use the settings menu - Gear button <i class="fa fa-gear"></i> on the top right.
    If you find a bug, use the Send BUG button in the settings menu. This will automatically insert the table ID.
    `; // NO I18N

    var html = this.getThemeSelectorDialogHtml("theme_selector_area", "Welcome to Alpha Testing of Terraforming Mars!", desc); // NO I18N
    dialog.setContent(html);
    this.createCustomPreferenceNode(LAYOUT_PREF_ID, "pp" + LAYOUT_PREF_ID, "theme_selector_area");
    dialog.show();
  }

  getThemeSelectorDialogHtml(id: string, title: string, desc: string = "") {
    return `
    <div class="${id}_title">${title}</div>
    <div class="${id}_desc">${desc}</div>
    <div id="${id}" class="${id}"></div>
    `;
  }

  refaceUserPreference(pref_id: number, node: Element, prefDivId: string) {
    // can override to change apperance
    console.log("PREF", pref_id);
    if (pref_id == LAYOUT_PREF_ID || pref_id == 101) {
      const pp = $(prefDivId).parentElement;
      pp.removeChild($(prefDivId));
      this.createCustomPreferenceNode(pref_id, prefDivId, pp);
      return true;
    }
    return false; // return false to hook defaut listener, other return true and you have to hook listener yourself
  }

  createCustomPreferenceNode(pref_id: number, prefDivId: string, pp?: ElementOrId) {
    const pref = this.prefs[pref_id];
    const pc = this.createDivNode(prefDivId, "custom_pref " + prefDivId, pp);
    pc.setAttribute("data-pref-id", pref_id + "");
    for (const v in pref.values) {
      const optionValue = pref.values[v];
      const option = this.createDivNode(`${prefDivId}_v${v}`, `custom_pref_option pref_${optionValue.cssPref ?? ""}`, pc);
      option.setAttribute("value", v);
      option.innerHTML = optionValue.name;
      option.setAttribute("data-pref-id", pref_id + "");
      if (optionValue.description) this.addTooltip(option.id, optionValue.description, "");
      if (pref.value == v) {
        option.setAttribute("selected", "selected");
      }
      dojo.connect(option, "onclick", (e: any) => {
        pc.querySelectorAll(".custom_pref_option").forEach((node) => node.removeAttribute("selected"));
        e.target.setAttribute("selected", "selected");
        this.onChangePreferenceCustom(e);
      });
    }
    return pc;
  }

  addMoveToLog(log_id, move_id) {
    this.inherited(arguments);
    const node = $("log_" + log_id);
    let i = 1;
    node.querySelectorAll(".card_hl_tt").forEach((node) => {
      const card_id = node.getAttribute("data-clicktt");
      node.id = card_id + "_log_" + log_id + "_" + i++; // tooltip API needs id
      this.updateTooltip(card_id, node);
    });
    // add move #
    var prevmove = document.querySelector('[data-move-id="' + move_id + '"]');
    if (!prevmove) {
      const tsnode = document.createElement("div");
      tsnode.classList.add("movestamp");
      tsnode.innerHTML = _("Move #") + move_id;
      node.appendChild(tsnode);

      tsnode.setAttribute("data-move-id", move_id);
    }
  }

  setupHelpSheets() {
    const cc = { main: 0, corp: 0 };
    for (const key in this.gamedatas.token_types) {
      const info = this.gamedatas.token_types[key];
      if (key.startsWith("card")) {
        const num = getPart(key, 2);
        const type = getPart(key, 1);
        var helpnode = document.querySelector(`#allcards_${type} .expandablecontent_cards`);
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
        this.updateTooltip(`card_${type}_${num}`, tokenNode);
        cc[type]++;
      }
    }
    const ccmain = cc["main"];
    const cccorp = cc["corp"];
    $(`allcards_main_title`).innerHTML = _("All Project Cards") + ` (${ccmain})`;
    $(`allcards_corp_title`).innerHTML = _("All Corporate Cards") + ` (${cccorp})`;

    // clicks
    dojo.query(".expandablecontent_cards > *").connect("onclick", this, (event) => {
      var id = event.currentTarget.id;
      this.showHelp(id, true);
    });
    dojo.query("#allcards .expandabletoggle").connect("onclick", this, "onToggleAllCards");
    // filter controls
    const refroot = $("allcards");

    refroot.querySelectorAll(".filter-text").forEach((node) => {
      node.addEventListener("input", (event) => {
        const fnode = event.target as any;
        this.applyCardFilter(fnode.parentNode.parentNode);
      });
      node.setAttribute("placeholder", _("Search..."));
    });
    refroot.querySelectorAll(".filter-text-clear").forEach((clearButton) => {
      clearButton.addEventListener("click", (event) => {
        const cnode = event.target as any;
        const expandableNode = cnode.parentNode.parentNode;
        const fnode = expandableNode.querySelector(".filter-text") as HTMLInputElement;
        fnode.value = "";
        this.applyCardFilter(expandableNode);
      });
    });
  }

  applyCardFilter(expandableNode: Element) {
    const hiddenOpacity = "none";
    const fnode = expandableNode.querySelector(".filter-text") as HTMLInputElement;
    const text = fnode.value.trim().toLowerCase();
    const contentnode = expandableNode.querySelector(".expandablecontent_cards");
    contentnode.querySelectorAll(".card").forEach((card: any) => {
      card.style.removeProperty("display");
    });
    contentnode.querySelectorAll(".card").forEach((card: any) => {
      const cardtext = this.getTooptipHtmlForToken(card.id);
      if (!cardtext.toLowerCase().includes(text)) {
        card.style.display = hiddenOpacity;
      }
    });
  }

  setupDiscard(): void {
    /*
    this.connect($("discard_title"), "onclick", () => {
      this.showHiddenContent("discard_main", _("Discard pile contents"));
    });*/
  }

  setupResourceFiltering(): void {
    const exclude_compact: string[] = [
      "full/cards1.jpg",
      "full/cards2.jpg",
      "full/cards3.jpg",
      "full/cardsC.jpg",
      "full/pboard.jpg",
      "full/TMgameboard.jpg",
      "full/tooltipbg.jpg"
    ];
    const exclude_full: string[] = [
      "cards_illustrations.jpg",
      "awards_back.png",
      "cards_bg.png",
      "cards_bg_2_blue_action_bottom.png",
      "cards_bg_2_blue_action_texture.jpg",
      "corporations.jpg",
      "map.png",
      "milestones_awards.png",
      "oxygen.png",
      "space.jpg",
      "stanproj_hold.png",
      "temperature.png"
    ];

    const exclude_list: string[] = this.isLayoutFull() ? exclude_full : exclude_compact;

    for (let item of exclude_list) {
      this.dontPreloadImage(item);
    }
  }

  showHiddenContent(id: ElementOrId, title: string, selectedId?: string) {
    let dlg = new ebg.popindialog();
    dlg.create("cards_dlg");
    dlg.setTitle(title);
    const cards_htm = this.cloneAndFixIds(id, "_tt", true).innerHTML;
    const html = `<div id="card_pile_selector" class="card_pile_selector"></div>
    <div id="card_dlg_content" class="card_dlg_content">${cards_htm}</div>`;
    dlg.setContent(html);
    $("card_dlg_content")
      .querySelectorAll(".token")
      .forEach((node) => {
        node.addEventListener("click", (e) => {
          const selected_html = this.getTooptipHtmlForToken((e.currentTarget as any).id);
          $("card_pile_selector").innerHTML = selected_html;
        });
      });
    if (selectedId) {
      const selected_html = this.getTooptipHtmlForToken(selectedId);
      $("card_pile_selector").innerHTML = selected_html;
    }
    dlg.show();
    return dlg;
  }

  onScreenWidthChange() {
    if (this.isLayoutFull()) {
      super.onScreenWidthChange();
    } else {
      const width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
      const height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;

      dojo.style("page-content", "zoom", "");

      if (this.zoneWidth != width || this.zoneHeight != height) {
        //   console.log("changed res w,h", width, height);

        this.zoneWidth = width;
        this.zoneHeight = height;

        if (dojo.hasClass("ebd-body", "mobile_version") && this.previousLayout == "desktop" && width < height) {
          this.previousLayout = "mobile";
          dojo.addClass("ebd-body", "mobile_portrait");
        } else if (!dojo.hasClass("ebd-body", "mobile_version") && this.previousLayout == "mobile" && width > height) {
          this.previousLayout = "desktop";
          dojo.removeClass("ebd-body", "mobile_portrait");
        }
      }
    }
    //disable hand sort on mobile
    if (dojo.hasClass("ebd-body", "mobile_version") && dojo.hasClass("ebd-body", "touch-device")) {
    }
  }

  onToggleAllCards(event: any) {
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

  gameStatusCleanup() {
    //general cleanup of temp stuff put in the header gamestatus bar
    if ($("draft_info")) $("draft_info").remove();
    if ($("custom_paiement")) $("custom_paiement").remove();
  }

  //Expands for cleanup
  ajaxuseraction(action: string, args?: any, handler?: (err: any) => void) {
    this.gameStatusCleanup();
    super.ajaxuseraction(action, args, handler);
  }

  onNotif(notif: Notif) {
    super.onNotif(notif);
    this.darhflog("playing notif " + notif.type + " with args ", notif.args);

    //header cleanup
    this.gameStatusCleanup();

    //Displays message in header while the notif is playing
    //deactivated if animations aren't played
    if (this.customAnimation.areAnimationsPlayed() == true) {
      if (!this.instantaneousMode && notif.log) {
        if ($("gameaction_status_wrap").style.display != "none") {
          let msg = this.format_string_recursive(notif.log, notif.args);
          if (msg != "") {
            $("gameaction_status").innerHTML = msg;
          }
        } else {
          // XXX this is very bad in multiple player all yout buttons dissapear
          // currently gameaction_status should be visible
          this.setDescriptionOnMyTurn(notif.log, notif.args);
        }
      }
    }
  }

  //make custom animations depending on situation
  notif_tokenMoved(notif: Notif): any {
    super.notif_tokenMoved(notif);
    //pop animation on Tiles
    if (notif.args.token_id && notif.args.token_id.startsWith("tile_")) {
      return this.customAnimation.animateTilePop(notif.args.token_id);
    } else if (notif.args.token_id && notif.args.token_id.startsWith("resource_") && notif.args.place_id.startsWith("card_main_")) {
      return this.customAnimation.animatePlaceResourceOnCard(notif.args.token_id, notif.args.place_id);
    } else if (notif.args.token_id && notif.args.token_id.startsWith("resource_") && notif.args.place_id.startsWith("tableau_")) {
      return this.customAnimation.animateRemoveResourceFromCard(notif.args.token_id);
    } else if (
      notif.args.token_id &&
      notif.args.token_id.startsWith("marker_") &&
      (notif.args.place_id.startsWith("tile_") || notif.args.place_id.startsWith("award_") || notif.args.place_id.startsWith("milestone_"))
    ) {
      return this.customAnimation.animatePlaceMarker(notif.args.token_id, notif.args.place_id);
    }
  }

  notif_counter(notif: Notif): any {
    super.notif_counter(notif);
    //move animation on main player board counters
    const counter_move = ["m", "s", "u", "p", "e", "h", "tr"].map((item) => {
      return "tracker_" + item + "_";
    });

    //temperature & oxygen - compact only as full doesn't have individual rendered elements
    if (!this.isLayoutFull()) {
      if (notif.args.counter_name == "tracker_t") {
        this.customAnimation.animateMapItemAwareness("temperature_map");
      } else if (notif.args.counter_name == "tracker_o") {
        this.customAnimation.animateMapItemAwareness("oxygen_map");
      }
    }
    //ocean's pile
    if (notif.args.counter_name == "tracker_w") {
      this.customAnimation.animateMapItemAwareness("oceans_pile");
    } else if (notif.args.counter_name == "tracker_gen") {
      this.customAnimation.animateMapItemAwareness("outer_generation");
    }

    if (notif.args.inc && counter_move.some((trk) => notif.args.counter_name.startsWith(trk))) {
      if (!this.isLayoutFull()) {
        // cardboard layout animating cubes on playerboard instead
        this.customAnimation.animatetingle(notif.args.counter_name);
        return this.customAnimation.moveResources(notif.args.counter_name, notif.args.inc);
      }
    } else {
      if ($(notif.args.counter_name)) {
        return this.customAnimation.animatetingle(notif.args.counter_name);
      } else {
        return this.customAnimation.wait(this.customAnimation.getWaitDuration(200));
      }
    }
  }

  getCardTypeById(type: number) {
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
  }

  generateTooltipSection(label: string, body: string, optional: boolean = true, additional_class: string = "") {
    if (optional && !body) return "";
    return `<div class="tt_section ${additional_class}"><div class="tt_intertitle">${label}</div><div class='card_tt_effect'>${body}</div></div>`;
  }

  generateCardTooltip_Compact(displayInfo: TokenDisplayInfo): string {
    const type = displayInfo.t;

    let htm =
      '<div class="compact_card_tt %adcl" style="%adstyle"><div class="card_tooltipimagecontainer">%c</div><div class="card_tooltipcontainer" data-card-type="' +
      type +
      '">%t</div></div>';

    let fullitemhtm: string = "";
    let fulltxt: string = "";
    let adClass: string = "";
    let adStyle: string = "";

    let elemId = displayInfo.key;
    // XXX this function not suppose to look for js element in the DOM because it may not be there
    if (!$(elemId) && $(`${elemId}_help`)) {
      elemId = `${elemId}_help`;
    }

    if (type !== undefined) {
      fulltxt = this.generateCardTooltip(displayInfo);

      if (type >= 1 && type <= 3) {
        //main cards
        const div = this.cloneAndFixIds(elemId, "_tt", true);
        fullitemhtm = div.outerHTML;
        if (div.getAttribute("data-invalid_prereq") == "1") {
          adClass += " invalid_prereq";
        }
        if (div.getAttribute("data-discounted") == "true") {
          adClass += " discounted";
          adStyle += `--discount-val:'${div.getAttribute("data-discount_cost")}';`;
        }
        ["cannot_resolve", "cannot_pay"].forEach((item: string) => {
          if (div.getAttribute("data-" + item) != null && div.getAttribute("data-" + item) != "0") {
            adClass += " " + item;
          }
        });
      } else if (type == this.CON.MA_CARD_TYPE_CORP) {
        fullitemhtm = this.cloneAndFixIds(elemId, "_tt", true).outerHTML;
      } else if (type == this.CON.MA_CARD_TYPE_MILESTONE || type == this.CON.MA_CARD_TYPE_AWARD) {
        fullitemhtm = this.cloneAndFixIds(elemId, "_tt", true).outerHTML;
      } else if (type == this.CON.MA_CARD_TYPE_STAN) {
        adClass += "standard_project";
      }
    } else {
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
  }

  generateItemTooltip(displayInfo: TokenDisplayInfo): string {
    if (!displayInfo) return "?";
    let txt = "";
    const key = displayInfo.typeKey;
    const tokenId = displayInfo.tokenId;

    switch (key) {
      case "tracker_tr":
        return this.generateTooltipSection(
          _(displayInfo.name),
          _(
            "Terraform Rating (TR) is the measure of how much you have contributed to the terraforming process. Each time you raise the oxygen level, the temperature, or place an ocean tile, your TR increases as well. Each step of TR is worth 1 VP at the end of the game, and the Terraforming Committee awards you income according to your TR. You start at 20."
          )
        );
      case "tracker_m":
        return this.generateTooltipSection(
          _(displayInfo.name),
          _(
            "The MegaCredit (M€) is the general currency used for buying and playing cards and using standard projects, milestones, and awards."
          )
        );

      case "tracker_pm":
        return this.generateTooltipSection(
          _(displayInfo.name),
          _(
            "Resource icons inside brown boxes refer to production of that resource. Your M€ income is the sum of your M€ production and your TR (Terraform Rating). M€ production is the only production that can be negative, but it may never be lowered below -5"
          )
        );
      case "tracker_s":
        return this.generateTooltipSection(
          _(displayInfo.name),
          _(
            "Steel represents building material on Mars. Usually this means some kind of magnesium alloy. Steel is used to pay for building cards, being worth 2 M€ per steel."
          )
        );
      case "tracker_u":
        return this.generateTooltipSection(
          _(displayInfo.name),
          _(
            "Titanium represents resources in space or for the space industry. Titanium is used to pay for space cards, being worth 3 M€ per titanium."
          )
        );
      case "tracker_p":
        return this.generateTooltipSection(
          _(displayInfo.name),
          _(
            "Plants use photosynthesis. As an action, 8 plant resources can be converted into a greenery tile that you place on the board. This increases the oxygen level (and your TR) 1 step. Each greenery is worth 1 VP and generates 1 VP to each adjacent city tile."
          )
        );
      case "tracker_e":
        return this.generateTooltipSection(
          _(displayInfo.name),
          _(
            "Energy is used by many cities and industries. This usage may either be via an action on a blue card, or via a decrease in energy production. Leftover energy is converted into heat"
          )
        );
      case "tracker_h":
        return this.generateTooltipSection(
          _(displayInfo.name),
          _(
            "Heat warms up the Martian atmosphere. As an action, 8 heat resources may be spent to increase temperature (and therefore your TR) 1 step."
          )
        );
      case "tracker_passed":
        return this.generateTooltipSection(
          _("Player passed"),
          _(
            "If you take no action at all (pass), you are out of the round and may not take any anymore actions this generation. When everyone has passed, the action phase ends."
          )
        );
      case "tracker_gen":
        return this.generateTooltipSection(
          _("Generations"),
          _(
            "Because of the long time spans needed for the projects, this game is played in a series of generations. A generation is a game round."
          )
        );

      case "tracker_w":
        return this.generateTooltipSection(
          _(displayInfo.name),
          _("This global parameter starts with 9 Ocean tiles in a stack, to be placed on the board during the game.")
        );
      case "tracker_o":
        return this.generateTooltipSection(
          _(displayInfo.name),
          _("This global parameter starts with 0% and ends with 14% (This percentage compares to Earth's 21% oxygen)")
        );
      case "tracker_t":
        return this.generateTooltipSection(
          _(displayInfo.name),
          _("This global parameter (mean temperature at the equator) starts at -30 ˚C.")
        );
      case "starting_player":
        return this.generateTooltipSection(_(displayInfo.name), _("Shifts clockwise each generation."));
      case "tracker_tagEvent":
        return this.generateTooltipSection(
          _("Events"),
          _(
            "Number of event cards played by the player. Unlike other tags, this is not a number of visible event tags, it a number of cards in event pile."
          )
        );
    }

    if (key.startsWith("hex")) {
      txt += this.generateTooltipSection(_("Coordinates"), `${displayInfo.x},${displayInfo.y}`);
      if (displayInfo.ocean == 1) txt += this.generateTooltipSection(_("Reserved For"), _("Ocean"));
      else if (displayInfo.reserved == 1) txt += this.generateTooltipSection(_("Reserved For"), _(displayInfo.name));

      if (displayInfo.expr.r) {
        txt += this.generateTooltipSection(_("Bonus"), CustomRenders.parseExprToHtml(displayInfo.expr.r));
      }
      return txt;
    }
    if (key.startsWith("tracker_tag")) {
      txt += this.generateTooltipSection(
        _("Tags"),
        _(
          "Number of tags played by the player. A tag places the card in certain categories, which can affect or be affected by other cards, or by the player board (e.g. you can pay with steel when playing a building tag)."
        )
      );
    } else if (key.startsWith("tracker_forest") || key.startsWith("tracker_land")) {
      txt += this.generateTooltipSection(_("Tiles on Mars"), _("Number of corresponding tiles played on Mars."));
    } else if (key.startsWith("tracker_pdelta")) {
      txt += this.generateTooltipSection(
        _("Global parameters delta"),
        _("Your temperature, oxygen, and ocean requirements are +X or -X steps, your choice in each case.")
      );
    } else if (key.startsWith("tracker_p")) {
      txt += this.generateTooltipSection(
        _("Resource Production"),
        _(
          "Resource icons inside brown boxes refer to production of that resource. During the production phase you add resources equal to your production."
        )
      );
    } else if (tokenId.startsWith("counter_hand_")) {
      txt += this.generateTooltipSection(_("Hand count"), _("Amount of cards in player's hand."));
    } else if (key.startsWith("tile_")) {
      if (displayInfo.tt == 3) {
        txt += this.generateTooltipSection(
          _("Ocean"),
          _(
            "Ocean tiles may only be placed on areas reserved for ocean (see map). Placing an ocean tile increases your TR 1 step. Ocean tiles are not owned by any player. Each ocean tile on the board provides a 2 M€ placement bonus for any player later placing a tile, even another ocean, next to it."
          )
        );
      } else if (displayInfo.tt == 2) {
        txt += this.generateTooltipSection(
          _("City"),
          _(
            "May not be placed next to another city. Each city tile is worth 1 VP for each adjacent greenery tile (regardless of owner) at the end of the game."
          )
        );
      } else if (displayInfo.tt == 1) {
        txt += this.generateTooltipSection(
          _("Greenery"),
          _(
            "If possible, greenery tiles must be placed next to another tile that you own. If you have no available area next to your tiles, or if you have no tile at all, you may place the greenery tile on any available area. When placing a greenery tile, you increase the oxygen level, if possible, and also your TR. If you can’t raise the oxygen level you don’t get the increase in TR either. Greenery tiles are worth 1 VP at the end of the game, and also provide 1 VP to any adjacent city."
          )
        );
      } else {
        txt += this.generateTooltipSection(
          _("Special Tile"),
          _(
            "Some cards allow you to place special tiles. Any function or placement restriction is described on the card. Place the tile, and place a player marker on it."
          )
        );
      }
    }
    if (!txt && displayInfo.tooltip) return displayInfo.tooltip;
    return txt;
  }

  generateTokenTooltip_Full(displayInfo: TokenDisplayInfo): string {
    if (!displayInfo) return "?";

    if (displayInfo.t === undefined) {
      return this.generateItemTooltip(displayInfo);
    }

    const tt = this.generateCardTooltip(displayInfo);
    let classes = "";
    const discount_cost = displayInfo.card_info?.discount_cost ?? displayInfo.cost;
    if (displayInfo.card_info) {
      if (displayInfo.cost != discount_cost) classes += " discounted";
      if (displayInfo.card_info.pre ?? 0 > 0) {
        classes += " invalid_prereq";
      }
      if (displayInfo.card_info.m ?? 0 > 0) {
        classes += " cannot_resolve";
      }
      if (displayInfo.card_info.c ?? 0 > 0) {
        classes += " cannot_pay";
      }
    }

    const res = `<div class="full_card_tt ${classes}" style="--discount-val:'${discount_cost}'">${tt}</div>`;
    return res;
  }

  generateCardTooltip(displayInfo: TokenDisplayInfo): string {
    if (!displayInfo) return "?";

    if (displayInfo.t === undefined) {
      return this.generateItemTooltip(displayInfo);
    }

    const type = displayInfo.t;

    let type_name = this.getCardTypeById(type);
    let card_id = "";
    if (type > 0 && type < 7) card_id += " " + _(displayInfo.deck) + " #" + displayInfo.num ?? "";
    let res = "";

    let tags = "";
    if (displayInfo.tags) {
      for (let tag of displayInfo.tags.split(" ")) {
        tags += _(tag) + " ";
      }
    }

    let vp = displayInfo.text_vp;
    if (!vp) vp = displayInfo.vp;

    res += this.generateTooltipSection(type_name, card_id);
    if (type != this.CON.MA_CARD_TYPE_CORP && type != this.CON.MA_CARD_TYPE_AWARD)
      res += this.generateTooltipSection(_("Cost"), displayInfo.cost, true, "tt_cost");
    res += this.generateTooltipSection(_("Tags"), tags);

    let prereqText = "";

    if (displayInfo.key == "card_main_135") prereqText = _("Requires 1 plant tag, 1 microbe tag and 1 animal tag."); //special case
    else if (displayInfo.expr?.pre) prereqText = CustomRenders.parsePrereqToText(displayInfo.expr.pre, this);

    if (prereqText != "")
      prereqText += '<div class="prereq_notmet">' + _("(You cannot play this card now because pre-requisites are not met.)") + "</div>";

    res += this.generateTooltipSection(_("Requirement"), prereqText, true, "tt_prereq");

    if (type == this.CON.MA_CARD_TYPE_MILESTONE) {
      const text = _(`If you meet the criteria of a milestone, you may
claim it by paying 8 M€ and placing your player marker on
it. A milestone may only be claimed by one player, and only
3 of the 5 milestones may be claimed in total, so there is a
race for these! Each claimed milestone is worth 5 VPs at the
end of the game.`);

      res += this.generateTooltipSection(_("Criteria"), displayInfo.text);
      res += this.generateTooltipSection(_("Victory Points"), vp);
      res += this.generateTooltipSection(_("Info"), text);
    } else if (type == this.CON.MA_CARD_TYPE_AWARD) {
      res += this.generateTooltipSection(
        _("Cost"),
        `The first player to fund an award pays 8 M€ and
places a player marker on it. The next player to fund an
award pays 14 M€, the last pays 20 M€.`,
        true,
        "tt_cost"
      );
      res += this.generateTooltipSection(_("Condition"), displayInfo.text);
      const text = _(` Only three awards
may be funded. Each award can only be funded once.<p>
In the final scoring, each award is checked, and 5
VPs are awarded to the player who wins that category - it
does not matter who funded the award! The second place
gets 2 VPs (except in a 2-player game where second place
does not give any VPs). Ties are friendly: more than one
player may get the first or second place bonus.
If more than one player gets 1st place bonus, no 2nd place is
awarded.`);
      res += this.generateTooltipSection(_("Info"), text);
    } else {
      const errors = this.getPotentialErrors(displayInfo.key);

      res += this.generateTooltipSection(_("Immediate Effect"), displayInfo.text);
      res += this.generateTooltipSection(_("Effect"), displayInfo.text_effect);
      res += this.generateTooltipSection(_("Action"), displayInfo.text_action);
      res += this.generateTooltipSection(_("Holds"), _(displayInfo.holds));
      res += this.generateTooltipSection(_("Victory Points"), vp);
      res += this.generateTooltipSection(_("Playability"), errors, true, "tt_error");
    }

    return res;
  }

  getPotentialErrors(card_id: string): string {
    if (!$(card_id)) return "";
    const ds = $(card_id).dataset;

    let msg = "";
    if (ds.cannot_pay && ds.cannot_pay != "0") {
      msg = msg + this.getTokenName(`err_${ds.cannot_pay}`) + "<br/>";
    }
    if (ds.cannot_resolve && ds.cannot_resolve !== "0") {
      msg = msg + this.getTokenName(`err_${ds.cannot_resolve}`) + "<br/>";
    }

    if (ds.op_code == ds.cannot_pay) return msg;
    if (ds.op_code == ds.cannot_resolve) return msg;
    if (ds.op_code == "0" || ds.op_code === undefined) return msg;

    msg = msg + this.getTokenName(`err_${ds.op_code}`) + "<br/>";
    return msg;
  }

  createHtmlForToken(tokenNode: HTMLElement, displayInfo: TokenDisplayInfo) {
    // use this to generate some fake parts of card, remove this when use images
    if (displayInfo.mainType == "card") {
      let tagshtm = "";

      if (tokenNode.id.startsWith("card_corp_")) {
        //Corp formatting
        const decor = this.createDivNode(null, "card_decor", tokenNode.id);
        // const texts = displayInfo.text.split(';');
        const card_initial = displayInfo.text || "";
        const card_effect = displayInfo.text_effect || displayInfo.text_action || "";
        const card_title = displayInfo.name || "";
        //   if (texts.length>0) card_initial = texts[0];
        //  if (texts.length>1) card_effect= texts[1];
        decor.innerHTML = `
                  <div class="card_bg"></div>
                  <div class="card_title">${card_title}</div>
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

        if (tokenNode.id == "card_stanproj_7") {
          decor.innerHTML = `
               <div class="bg_gray"></div>  
               <div class='stanp_cost token_img tracker_m'>${displayInfo.cost != 0 ? displayInfo.cost : "X"}</div>
               <div class="action_arrow"></div>
               <div class="token_img tracker_tr"></div>
               <div class='standard_projects_title'>${displayInfo.name}</div>  
            `;
        } else {
          decor.innerHTML = `
               <div class='stanp_cost'>${displayInfo.cost != 0 ? displayInfo.cost : "X"}</div>
               <div class='standard_projects_title'>${displayInfo.name}</div>  
            `;
        }
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

        let sort_vp: string = "0";
        if (displayInfo.vp) {
          if (CustomRenders["customcard_vp_" + displayInfo.num]) {
            vp = '<div class="card_vp vp_custom">' + CustomRenders["customcard_vp_" + displayInfo.num]() + "</div></div>";
            sort_vp = "1";
          } else {
            vp = parseInt(displayInfo.vp)
              ? '<div class="card_vp"><div class="number_inside">' + displayInfo.vp + "</div></div>"
              : '<div class="card_vp"><div class="number_inside">*</div></div>';

            sort_vp = parseInt(displayInfo.vp) ? displayInfo.vp : "1";
          }
        } else {
          vp = "";
        }
        const cn_binary = displayInfo.num ? parseInt(displayInfo.num).toString(2).padStart(8, "0") : "";

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
          card_r = card_r.replaceAll("%res%", displayInfo.holds);
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
        let card_action_text = "";
        if (displayInfo.text_action || displayInfo.text_effect) {
          card_action_text = `<div class="card_action_line card_action_text">${displayInfo.text_action || displayInfo.text_effect}</div>`;
        }

        const holds = displayInfo.holds ?? "Generic";
        const htm_holds =
          '<div class="card_line_holder"><div class="cnt_media token_img tracker_res' +
          holds +
          '"></div><div class="counter_sep">:</div><div id="resource_holder_counter_' +
          tokenNode.id.replace("card_main_", "") +
          '" class="resource_counter"  data-resource_counter="0"></div></div>';

        decor.innerHTML = `
                  <div class="card_illustration cardnum_${displayInfo.num}"></div>
                  <div class="card_bg"></div>
                  <div class='card_badges'>${tagshtm}</div>
                  <div class='card_title'><div class='card_title_inner'>${displayInfo.name}</div></div>
                  <div id='cost_${tokenNode.id}' class='card_cost'><div class="number_inside">${displayInfo.cost}</div></div> 
                  <div class="card_outer_action"><div class="card_action"><div class="card_action_line card_action_icono">${card_a}</div>${card_action_text}</div><div class="card_action_bottomdecor"></div></div>
                  <div class="card_effect ${addeffclass}">${card_r}<div class="card_tt">${displayInfo.text || ""}</div></div>           
                  <div class="card_prereq">${parsedPre !== "" ? parsedPre : ""}</div>
                  <div class="card_number">${displayInfo.num ?? ""}</div>
                  <div class="card_number_binary">${cn_binary}</div>
                  <div id="resource_holder_${tokenNode.id.replace("card_main_", "")}" class="card_resource_holder ${
                    displayInfo.holds ?? ""
                  }" data-resource_counter="0">${htm_holds}</div>
                  ${vp}
            `;

        tokenNode.style.setProperty("--sort_cost", displayInfo.cost);
        tokenNode.style.setProperty("--sort_vp", sort_vp);
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

    if (displayInfo.mainType == "award" || displayInfo.mainType == "milestone") {
      //custom tooltip on awards and milestones
      const dest = tokenNode.id.replace(displayInfo.mainType + "_", displayInfo.mainType + "_label_");
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

    if (displayInfo.mainType == "marker" && tokenNode.id && !this.isLayoutFull()) {
      this.vlayout.convertInto3DCube(tokenNode, displayInfo.color);
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
        this.createHtmlForToken(tokenNode, displayInfo);
      } else {
        this.vlayout.createHtmlForToken(tokenNode, displayInfo);
      }
    }
    if (tokenNode.id?.startsWith("card_")) {
      if ($("hand_area").dataset.sort_type == "manual") this.enableDragOnCard(tokenNode);
      else this.disableDragOnCard(tokenNode);
    }
  }

  setDomTokenState(tokenId: ElementOrId, newState: any) {
    super.setDomTokenState(tokenId, newState);
    var node = $(tokenId);
    if (!node) return;
    if (!node.id) return;

    // to show + signs in some cases
    if (node.id.startsWith("tracker_")) {
      if (newState > 0) {
        node.setAttribute("data-sign", "+");
      } else {
        node.removeAttribute("data-sign");
      }
    }

    //intercept player passed state
    if (node.id.startsWith("tracker_passed_")) {
      const plColor = node.id.replace("tracker_passed_", "");
      const plId = this.getPlayerIdByColor(plColor);
      if (newState == 1) {
        this.disablePlayerPanel(plId);
      } else {
        this.enablePlayerPanel(plId);
      }
    }

    //local : number of cities on mars
    if (node.id.startsWith("tracker_city_")) {
      this.local_counters["game"].cities = 0;
      for (let plid in this.gamedatas.players) {
        this.local_counters["game"].cities =
          this.local_counters["game"].cities + parseInt($("tracker_city_" + this.gamedatas.players[plid].color).dataset.state);
      }
    }

    this.vlayout.renderSpecificToken(node);

    //handle copies of trackers
    const trackerCopy = "alt_" + node.id;
    const nodeCopy = $(trackerCopy);
    if (nodeCopy) {
      super.setDomTokenState(trackerCopy, newState);

      //alt_tracker_w (on the map)
      if (node.id.startsWith("tracker_w")) {
        $(nodeCopy.id).dataset.calc = (9 - parseInt(newState)).toString();
      }
    }
  }

  //finer control on how to place things
  createDivNode(id?: string | undefined, classes?: string, location?: ElementOrId): HTMLDivElement {
    const div = super.createDivNode(id, classes, location);
    return div;
  }

  updateTokenDisplayInfo(tokenDisplayInfo: TokenDisplayInfo) {
    // override to generate dynamic tooltips and such

    if (this.isLayoutFull()) {
      tokenDisplayInfo.tooltip = this.generateTokenTooltip_Full(tokenDisplayInfo);
    } else {
      tokenDisplayInfo.tooltip = this.generateCardTooltip_Compact(tokenDisplayInfo);
    }

    // if (this.isLocationByType(tokenDisplayInfo.key)) {
    //   tokenDisplayInfo.imageTypes += " infonode";
    // }
  }

  updateHandInformation(info: any, opInfoType: string): void {
    if (!info) return;
    for (const cardId in info) {
      if (!this.gamedatas.token_types[cardId]) continue; // not a token
      const card_info = info[cardId];

      // update token display info
      const original_cost = parseInt(this.gamedatas.token_types[cardId].cost);
      let discount_cost = 0;
      const payop = card_info.payop;
      if (payop) {
        discount_cost = parseInt(payop.replace("nm", "").replace("nop", "0")) || 0;
      } else {
        discount_cost = original_cost;
      }
      card_info.discount_cost = discount_cost;
      this.gamedatas.token_types[cardId].card_info = card_info;

      // update node attrs
      const node = $(cardId) as HTMLElement;
      if (!node) continue; // not visible?

      const prereqMet = (card_info.pre ?? "0") == 0;
      node.dataset.invalid_prereq = prereqMet ? "0" : "1";

      node.dataset.cannot_resolve = card_info.m ?? "0";
      node.dataset.cannot_pay = card_info.c ?? "0";

      node.dataset.op_code = card_info.q;

      const discounted = discount_cost != original_cost;
      if (discounted) {
        node.dataset.discounted = String(discounted);
        node.dataset.discount_cost = String(discount_cost);
      }

      node.dataset.in_hand = node.parentElement.classList.contains("handy") ? "1" : "0";

      let costDiv = $("cost_" + cardId);

      if (costDiv) {
        if (discounted) {
          costDiv.dataset.discounted_cost = node.dataset.discount_cost;
          costDiv.classList.add("discounted");
        } else {
          costDiv.dataset.discounted_cost = "";
          costDiv.classList.remove("discounted");
        }
      }

      // card num is last sort disambiguator
      const num = parseInt(this.gamedatas.token_types[cardId].num);

      const sort_cost = discount_cost * 1000 + num;

      node.style.setProperty("--sort_cost", String(sort_cost));

      let sort_playable: number = 0;
      if (node.dataset.invalid_prereq !== "0") sort_playable += 1;
      sort_playable = sort_playable * 2;
      if (node.dataset.cannot_resolve !== "0") sort_playable += 1;
      sort_playable = sort_playable * 2;
      if (node.dataset.cannot_pay !== "0") sort_playable += 1;
      sort_playable = sort_playable * 100 + discount_cost;
      sort_playable = sort_playable * 1000 + num;

      node.style.setProperty("--sort_playable", String(sort_playable));

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

    if (type == "draft") {
      const next_color = opargs.args.next_color ?? "";
      const next_name = next_color != "" ? this.getPlayerName(this.getPlayerIdByColor(next_color)) : "";
      if (next_color != "" && !$("draft_info")) {
        const txt = _("Draft Direction ⤇ %s").replace("%s", `<span class="draft_info" style="color:#${next_color};">${next_name}</span>`);
        $("gameaction_status").insertAdjacentHTML("afterend", `<span id="draft_info">${txt}</span>`);
      }
    }
  }
  updatePlayerLocalCounters(plColor: string): void {
    for (let key of Object.keys(this.local_counters[plColor])) {
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
    } else if (tokenInfo.key == "starting_player") {
      result.location = tokenInfo.location.replace("tableau_", "fpholder_");
    } else if (tokenInfo.key.startsWith("resource_")) {
      if (this.isLayoutFull()) {
      } else {
        if (tokenInfo.location.startsWith("card_main_")) {
          //resource added to card
          result.location = tokenInfo.location.replace("card_main_", "resource_holder_");
          const dest_holder: string = tokenInfo.location.replace("card_main_", "resource_holder_");
          const dest_counter: string = tokenInfo.location.replace("card_main_", "resource_holder_counter_");
          $(dest_holder).dataset.resource_counter = (parseInt($(dest_holder).dataset.resource_counter) + 1).toString();
          $(dest_counter).dataset.resource_counter = (parseInt($(dest_counter).dataset.resource_counter) + 1).toString();
        } else if (tokenInfo.location.startsWith("tableau_")) {
          //resource moved from card
          //which card ?
          const dest_holder = $(tokenInfo.key) ? $(tokenInfo.key).parentElement.id : "";
          if (dest_holder.includes("holder_")) {
            const dest_counter = dest_holder.replace("holder_", "holder_counter_");
            if (dojo.byId(dest_holder)) {
              $(dest_holder).dataset.resource_counter = (parseInt($(dest_holder).dataset.resource_counter) - 1).toString();
              $(dest_counter).dataset.resource_counter = (parseInt($(dest_counter).dataset.resource_counter) - 1).toString();
            }
          }
        }
      }
    } else if (tokenInfo.key.startsWith("marker_")) {
      if (tokenInfo.location.startsWith("award")) {
        this.strikeNextAwardMilestoneCost("award");
      } else if (tokenInfo.location.startsWith("milestone")) {
        this.strikeNextAwardMilestoneCost("milestone");
      }
    } else if (tokenInfo.key.startsWith("card_corp") && tokenInfo.location.startsWith("tableau")) {
      result.location = tokenInfo.location + "_corp_effect";

      //also set property to corp logo div
      $(tokenInfo.location + "_corp_logo").dataset.corp = tokenInfo.key;
      $(tokenInfo.location.replace("tableau_", "miniboard_corp_logo_")).dataset.corp = tokenInfo.key;
    } else if (tokenInfo.key.startsWith("card_main") && tokenInfo.location.startsWith("tableau")) {
      const t = this.getRulesFor(tokenInfo.key, "t");
      result.location = tokenInfo.location + "_cards_" + t;

      if (this.getRulesFor(tokenInfo.key, "a")) {
        result.location = tokenInfo.location + "_cards_2a";
      }

      if ($(tokenInfo.location).querySelector("#" + tokenInfo.key) == null) {
        const plcolor = tokenInfo.location.replace("tableau_", "");
        this.local_counters[plcolor]["cards_" + t]++;
        this.updatePlayerLocalCounters(plcolor);
      }

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
            let original = 0;
            for (let i = 0; i <= 3; i++) {
              if ($(tokenInfo.location).dataset["visibility_" + i] == "1") original = i;
            }
            if (original != 0) {
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
  }

  strikeNextAwardMilestoneCost(kind: string) {
    for (let idx = 1; idx <= 3; idx++) {
      if ($(kind + "_cost_" + idx).dataset.striked != "1") {
        $(kind + "_cost_" + idx).dataset.striked = "1";
        break;
      }
    }
  }

  isLayoutVariant(num: number) {
    return this.prefs[LAYOUT_PREF_ID].value == num;
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
      ops: [{ op: op, ...args }]
    });
  }

  sendActionDecline(op: number) {
    this.ajaxuseraction("decline", {
      ops: [{ op: op }]
    });
  }
  sendActionSkip() {
    this.ajaxuseraction("skip", {});
  }

  getButtonNameForOperation(op: any) {
    const baseName = op.args.button
      ? this.format_string_recursive(op.args.button, op.args.args)
      : this.getButtonNameForOperationExp(op.type);

    const opTargets = op.args?.target ?? [];
    if (opTargets.length == 1 && !op.type.startsWith("conv")) {
      const argname = this.getTokenName(opTargets[0]);
      return `${baseName} (${argname})`;
    }

    return baseName;
  }

  getDivForTracker(id: string, value: string | number = "") {
    const res = getPart(id, 1);
    const icon = `<div class="token_img tracker_${res}">${value}</div>`;
    return icon;
  }

  getButtonColorForOperation(op: any) {
    if (op.type == "pass") return "red";
    if (op.type == "skipsec") return "orange";
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
      if (tokenKey.startsWith("card_main_")) {
        /* const htm = this.cloneAndFixIds(tokenKey,'_log',true);
        return '<div class="card_hl_preview"  data-clicktt="'+tokenKey+'">'+htm.outerHTML+'</div>';*/
        return '<div class="card_hl_tt"  data-clicktt="' + tokenKey + '">' + this.getTokenName(tokenKey) + "</div>";
      }

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
      target: target
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
    const paramInfo = opargs.info;

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
                count: from
              });
            });
          if (from == 0 && count > 1) {
            this.addActionButton("button_" + opId + "_1", "1", () => {
              this.sendActionResolve(opId, {
                count: 1
              });
            });
          }

          if (count >= 1)
            this.addActionButton("button_" + opId + "_max", count + " (max)", () => {
              // XXX
              this.sendActionResolve(opId, {
                count: count
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
            if (paramargs.length <= 6) {
              // new magic number is 6 - which is also number of standard project, which is for some reason one of top voted bugs that people want buttons
              this.addActionButton("button_" + tid, this.getTokenName(tid), () => {
                this.sendActionResolveWithTarget(opId, tid);
              });
            }
          }
        }
      });
    } else if (ttype == "player") {
      if (paramInfo) {
        for (let tid in paramInfo) {
          this.activatePlayerSlot(tid, opId, single, paramInfo[tid]);
        }
      } else
        paramargs.forEach((tid: string) => {
          this.activatePlayerSlot(tid, opId, single, paramInfo?.[tid]);
        });
    } else if (ttype == "enum") {
      const args = this.gamedatas.gamestate.args ?? this.gamedatas.gamestate.private_state.args;
      const operations = args.operations ?? args.player_operations[this.player_id].operations;

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

  /**
   * Activate player for the operation
   * @param color - player color or word 'none'
   * @param opId - operation id to map
   * @param single - if signle is true add button also
   * @param info - extra data about the player (i.e. why its not applicable)
   */
  activatePlayerSlot(color: string, opId: number, single: boolean, info?: any) {
    // color is player color or word 'none'
    const playerId = this.getPlayerIdByColor(color);
    // here divId can be like player name on miniboard
    const divId = `player_name_${playerId}`;

    const valid = info ? info.q == 0 : true; // if info passed its only valid when q is 0
    if (valid && playerId) this.setReverseIdMap(divId, opId, color);

    if (!single) return;
    const buttonId = "button_" + color;
    const name = this.gamedatas.players[playerId]?.name;

    this.addActionButtonColor(
      buttonId,
      name ?? _(color),
      () => {
        this.onSelectTarget(opId, color);
      },
      "gray",
      color,
      !valid
    );
    // if name is not set its not a real player
    if (!playerId || !name) return;

    const corp_id = $(`miniboard_corp_logo_${color}`).dataset.corp;
    const faction_name = this.getTokenName(corp_id);
    // count of resources
    if (info?.max !== undefined) {
      $(buttonId).innerHTML = this.format_string_recursive("${player_name} [${faction_name}] (max. ${res_count})", {
        res_count: info.max,
        player_name: name,
        faction_name: faction_name
      });
    }
    // player is protected from attack
    if (info?.q == this.gamedatas.CON.MA_ERR_PROTECTED) {
      $(buttonId).innerHTML = this.format_string_recursive("${player_name} [${faction_name}] (protected)", {
        player_name: name,
        faction_name: faction_name
      });
    }
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
      rate: []
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
    const node = this.createDivNode("custom_paiement", "", "gameaction_status_wrap"); //was general_actions
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
      target: target ?? divId
    });
  }

  addActionButtonColor(
    buttonId: string,
    name: string,
    handler: eventhandler,
    buttonColor: string = "blue",
    playerColor: string = undefined,
    disabled: boolean = false
  ) {
    this.addActionButton(buttonId, name, handler);
    const buttonDiv = $(buttonId);
    if (playerColor && playerColor != this.player_color) buttonDiv.classList.add("otherplayer", "plcolor_" + playerColor);

    if (buttonColor && buttonColor != "blue") {
      buttonDiv.classList.remove("bgabutton_blue");
      buttonDiv.classList.add("bgabutton_" + buttonColor);
    }

    if (disabled) {
      buttonDiv.classList.add("disabled");
    }

    return buttonDiv;
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
    const chooseorder = xop == "+" && !single;
    if (chooseorder) this.setDescriptionOnMyTurn("${you} must choose order of operations");

    let i = 0;
    for (const opIdS in operations) {
      const opId = parseInt(opIdS);
      const opInfo = operations[opId];
      const opArgs = opInfo.args;

      let name = this.getButtonNameForOperation(opInfo);

      const opTargets = opArgs.target ?? [];
      const singleOrFirst = single || (ordered && i == 0);

      this.updateVisualsFromOp(opInfo, opId);
      if (singleOrFirst || !ordered) {
        this.activateSlots(opInfo, opId, singleOrFirst);
        this.updateHandInformation(opInfo.args.info, opInfo.type);
      }

      const buttonId = `button_${opId}`;
      if (!single && !ordered) {
        // xxx add something for remaining ops in ordered case?
        let handler = null;
        if (opTargets.length > 0) {
          // operations with targets
          handler = () => {
            if (opInfo.mcount > 0 && opTargets.length == 1) {
              // mandatory and only one choice
              this.sendActionResolveWithTarget(opId, opTargets[0]);
            } else
              this.setClientStateUpdOn(
                "client_collect",
                (args) => {
                  // on update action buttons
                  this.clearReverseIdMap();
                  this.activateSlots(opInfo, opId, true);
                },
                (id: string) => {
                  // onToken
                  this.onSelectTarget(opId, id, true);
                }
              );
          };
        } else {
          // operations without targets
          handler = () => {
            if (opInfo.type == "pass" && !single) {
              // add confirmation
              this.confirmationDialog(_("Are you sure you want to Pass for this Generation?"), () => {
                this.sendActionResolve(opId);
              });
            } else this.sendActionResolve(opId);
          };
        }
        const butcolor = this.getButtonColorForOperation(opInfo);
        this.addActionButtonColor(buttonId, name, handler, butcolor, opInfo.owner, opArgs.void);
      }

      // add done (skip) when optional
      if (singleOrFirst) {
        if (opInfo.mcount <= 0) {
          let name = _("Done");

          switch (opInfo.type) {
            case "buycard":
              if (single) {
                if (opTargets.length <= 1) {
                  name = _("Discard Card");
                } else {
                  name = _("Discard Remaining");
                }
              }
              break;
            default:
              break;
          }

          this.addActionButtonColor(
            "button_skip",
            name,
            () => {
              this.sendActionSkip();
            },
            "orange"
          );
        }
      }
      i = i + 1;
    }

    if (chooseorder)
      this.addActionButtonColor(
        "button_whatever",
        _('Whatever'),
        () => {
          this.ajaxuseraction("whatever", {});
        },
        "orange"
      );
  }

  addUndoButton() {
    if (!$("button_undo")) {
      this.addActionButton(
        "button_undo",
        _("Undo"),
        () => {
          this.gameStatusCleanup();
          this.ajaxcallwrapper_unchecked("undo");
        },
        undefined,
        undefined,
        "red"
      );
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
    var parent = document.querySelector(".debug_section"); // studio only
    if (parent) this.addActionButton("button_rcss", "Reload CSS", () => reloadCss());
  }
  onSelectTarget(opId: number, target: string, checkActive: boolean = false) {
    // can add prompt
    if ($(target) && checkActive && !this.checkActiveSlot(target)) return;
    return this.sendActionResolveWithTarget(opId, target);
  }

  // on click hooks
  onToken_playerTurnChoice(tid: string) {
    //debugger;
    if (!tid) return;
    const info = this.reverseIdLookup.get(tid);
    if (info && info !== "0") {
      const opId = info.op;
      if (info.param_name == "target") this.onSelectTarget(opId, info.target ?? tid);
      else this.showError("Not implemented");
    } else if (tid.endsWith("discard_main") || tid.endsWith("deck_main")) {
      this.showError(_("Cannot inspect deck or discard content - not allowed by the rules"));
    } else if (tid.startsWith("card_")) {
      if (tid.endsWith("help")) return;
      this.showHiddenContent($(tid).parentElement.id, _("Pile contents"), tid);
    } else if (tid.startsWith("marker_")) {
      // propagate to parent
      this.onToken_playerTurnChoice(($(tid).parentNode as HTMLElement).id);
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

    if (!this.isLayoutFull()) {
      const localColorSetting = new LocalSettings(this.getLocalSettingNamespace("mcompact_colorfilter"));
      localColorSetting.writeProp("selected", btncolor);
    }

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
    let value = "1";

    if (this.isLayoutFull()) {
      // toggle
      value = node.dataset.selected == "0" ? "1" : "0";
      const perColorSettings = new LocalSettings(this.getLocalSettingNamespace(plcolor));
      perColorSettings.writeProp(tblitem, value);
    } else {
      // unselec others (why?)
      for (let i = 0; i <= 3; i++) {
        $("tableau_" + plcolor).dataset["visibility_" + i] = "0";
        $("player_viewcards_" + i + "_" + plcolor).dataset.selected = "0";
      }
      //save as local setting (per table) XXX should should not be stored per table, its user setting and who will just grow unbounded with every game?
      const localColorSetting = new LocalSettings(this.getLocalSettingNamespace(plcolor + "_" + this.table_id));
      localColorSetting.writeProp("digital_cardfilter", btncolor);
    }
    $("tableau_" + plcolor).dataset[tblitem] = value;
    node.dataset.selected = value;
    return true;
  }

  handleStackedTooltips(attachNode: Element) {
    if (attachNode.childElementCount > 0) {
      if (attachNode.id.startsWith("hex")) {
        this.removeTooltip(attachNode.id);
        return;
      }
    }
    const parentId = attachNode.parentElement.id;
    if (parentId) {
      if (parentId.startsWith("hex")) {
        // remove tooltip from parent, it will likely just collide
        this.removeTooltip(parentId);
      }
    }
  }

  addSortButtonsToHandy(attachNode: Element): void {
    const id = attachNode.id;
    const htm = `
        <div id="hs_button_${id}_cost" class="hs_button" data-target="${id}" data-type="cost" data-direction=""><div class="hs_picto hs_cost"><i class="fa fa-eur" aria-hidden="true"></i></div><div class="hs_direction"></div></div>
        <div id="hs_button_${id}_playable" class="hs_button" data-target="${id}" data-type="playable" data-direction=""><div class="hs_picto hs_playable"><i class="fa fa-arrow-down" aria-hidden="true"></i></div><div class="hs_direction"></div></div>
        <div id="hs_button_${id}_vp" class="hs_button" data-target="${id}" data-type="vp" data-direction=""><div class="hs_picto hs_vp">VP</div><div class="hs_direction"></div></div>
        <div id="hs_button_${id}_manual" class="hs_button" data-target="${id}" data-type="manual" data-direction=""><div class="hs_picto hs_manual"><i class="fa fa-hand-paper-o" aria-hidden="true"></i></div></div>
       `;
    const node = this.createDivNode("", "hand_sorter", attachNode.id);
    node.innerHTML = htm;

    const localColorSetting: LocalSettings = new LocalSettings(this.getLocalSettingNamespace("card_sort"));
    let sort_dir: string = localColorSetting.readProp("sort_direction", "");
    let sort_type: string = localColorSetting.readProp("sort_type", "");

    if (sort_type == "") {
      sort_type = "manual";
      sort_dir = "increase";
    }
    if (sort_type != "") {
      let bnode = dojo.query(".hs_button[data-type='" + sort_type + "']")[0];
      bnode.dataset.direction = sort_dir;
      $(id).dataset.sort_direction = sort_dir;
      $(id).dataset.sort_type = sort_type;
    }

    const msg = _("Sort cards by %s");
    this.addTooltip(`hs_button_${id}_cost`, _("Card Sort"), msg.replace("%s", _("cost")));
    this.addTooltip(`hs_button_${id}_playable`, _("Card Sort"), msg.replace("%s", _("playability")));
    this.addTooltip(`hs_button_${id}_vp`, _("Card Sort"), msg.replace("%s", _("VP")));
    this.addTooltip(`hs_button_${id}_manual`, _("Card Sort"), _("Manual sorting (drag n drop)"));
  }

  /* Manual reordering of cards via drag'n'drop */
  enableManualReorder(idContainer: string) {
    //$(idContainer).style.border = "red 1px dashed";
    $(idContainer).addEventListener("drop", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    $(idContainer).addEventListener("dragover", (event) => {
      event.preventDefault();
    });
    $(idContainer).addEventListener("dragenter", (event) => {
      event.preventDefault();
    });
  }
  enableDragOnCard(node: HTMLElement) {
    if (node.draggable) return;
    //disable on mobile for now
    if ($("ebd-body").classList.contains("mobile_version")) return;
    node.draggable = true;
    node.addEventListener("dragstart", onDragStart);
    node.addEventListener("dragend", onDragEnd);
  }
  disableDragOnCard(node: HTMLElement) {
    if (!node.draggable) return;
    node.draggable = false;
    node.removeEventListener("dragstart", onDragStart);
    node.removeEventListener("dragend", onDragEnd);
  }

  saveLocalManualOrder(containerNode: HTMLElement) {
    let svOrder: string = "";
    //query should return in the same order as the DOM
    dojo.query("#" + containerNode.id + " .card").forEach((card) => {
      svOrder += card.id + ",";
    });
    svOrder = svOrder.substring(0, svOrder.length - 1);
    const localOrderSetting: LocalSettings = new LocalSettings(this.getLocalSettingNamespace(this.table_id + "_" + containerNode.id));
    localOrderSetting.writeProp("custo_order", svOrder);
  }

  loadLocalManualOrder(containerNode: HTMLElement | undefined) {
    if (!containerNode) return;
    const localOrderSetting: LocalSettings = new LocalSettings(this.getLocalSettingNamespace(this.table_id + "_" + containerNode.id));
    const svOrder = localOrderSetting.readProp("custo_order", "");
    if (svOrder == "") return;

    const cards: string[] = svOrder.split(",");
    cards.reverse().forEach((card_id) => {
      if ($(card_id) && $(card_id).parentElement == containerNode) {
        containerNode.insertAdjacentElement("afterbegin", $(card_id));
      }
    });
  }

  // notifications
  setupNotifications(): void {
    super.setupNotifications();
  }

  //get settings
  getSetting(key: string): string {
    //doesn't work.
    // return this.localSettings.readProp(key);
    return $("ebd-body").dataset["localsetting_" + key];
  }

  //Prevent moving parts when animations are set to none
  phantomMove(
    mobileId: ElementOrId,
    newparentId: ElementOrId,
    duration?: number,
    mobileStyle?: StringProperties,
    onEnd?: (node?: HTMLElement) => void
  ) {
    if (!this.customAnimation.areAnimationsPlayed()) {
      return super.phantomMove(mobileId, newparentId, -1, mobileStyle, onEnd);
    } else {
      return super.phantomMove(mobileId, newparentId, duration, mobileStyle, onEnd);
    }
  }
}

class Operation {
  type: string;
}

function onDragStart(event: DragEvent) {
  const selectedItem = event.target as HTMLElement;
  if (!selectedItem.parentElement.classList.contains("handy")) return;
  if (
    $("hand_area").dataset.sort_type != "manual" ||
    ($("ebd-body").classList.contains("touch-device") && $("ebd-body").classList.contains("mobile_version"))
  ) {
    return;
  }

  $("ebd-body").classList.add("drag_inpg");
  selectedItem.classList.add("drag-active");

  //prevent container from changing size
  const rect = selectedItem.parentElement.getBoundingClientRect();
  selectedItem.parentElement.style.setProperty("width", String(rect.width) + "px");
  selectedItem.parentElement.style.setProperty("height", String(rect.height) + "px");

  /*
  event.dataTransfer.setData("text/plain", "card"); // not sure if needed
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.dropEffect = "move";*/

  selectedItem.classList.add("hide");

  dojo.query("#" + selectedItem.parentElement.id + " .dragzone").forEach(dojo.destroy);
  dojo.query("#" + selectedItem.parentElement.id + " .card").forEach((card) => {
    //prevent
    if (card.id == selectedItem.id) return;

    if (card.nextElementSibling == null) {
      const righthtm: string = `<div class="dragzone outsideright"><div id="dragright_${card.id}" class="dragzone_inside dragright"></div></div>`;
      card.insertAdjacentHTML("afterend", righthtm);
      $("dragright_" + card.id).addEventListener("dragover", (event) => {
        event.preventDefault();
        $("dragright_" + card.id).parentElement.classList.add("over");
      });
      $("dragright_" + card.id).addEventListener("dragleave", (event) => {
        event.preventDefault();
        $("dragright_" + card.id).parentElement.classList.remove("over");
      });
    }
    if ((card.previousElementSibling != null && card.previousElementSibling.id != selectedItem.id) || card.previousElementSibling == null) {
      const lefthtm: string = `<div class="dragzone"><div id="dragleft_${card.id}" class="dragzone_inside dragleft"></div></div>`;
      card.insertAdjacentHTML("beforebegin", lefthtm);
      $("dragleft_" + card.id).addEventListener("dragover", (event) => {
        event.preventDefault();
        $("dragleft_" + card.id).parentElement.classList.add("over");
      });
      $("dragleft_" + card.id).addEventListener("dragleave", (event) => {
        event.preventDefault();
        $("dragleft_" + card.id).parentElement.classList.remove("over");
      });
    }
  });
}

function onDragEnd(event: DragEvent) {
  const selectedItem = event.target as HTMLElement;

  let x = event.clientX;
  let y = event.clientY;

  const containerNode: HTMLElement = selectedItem.parentElement;
  const pointsTo = document.elementFromPoint(x, y);

  if (pointsTo === selectedItem || pointsTo === null) {
    // do nothing
  } else if (containerNode === pointsTo) {
    //dropped in empty space on container
    containerNode.append(selectedItem);
  } else if (
    pointsTo.parentElement != undefined &&
    pointsTo.parentElement.parentElement != undefined &&
    pointsTo.parentElement.parentElement == selectedItem.parentElement &&
    pointsTo.classList.contains("dragzone_inside")
  ) {
    containerNode.insertBefore(selectedItem, pointsTo.parentElement);
  } else if (containerNode === pointsTo.parentNode) {
    containerNode.insertBefore(pointsTo, selectedItem);
  } else {
    console.error("Cannot determine target for drop", pointsTo.id);
  }

  selectedItem.classList.remove("drag-active");
  $("ebd-body").classList.remove("drag_inpg");
  containerNode.style.setProperty("width", "");
  containerNode.style.setProperty("height", "");

  dojo.query("#" + selectedItem.parentElement.id + " .dragzone").forEach(dojo.destroy);
  (gameui as GameXBody).saveLocalManualOrder(containerNode);
}
