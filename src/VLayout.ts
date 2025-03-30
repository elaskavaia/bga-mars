class VLayout {
  constructor(public game: GameXBody) {}

  setupPlayer(playerInfo: any) {
    if (!this.game.isLayoutFull()) return;
    const color = playerInfo.color;
    const name = playerInfo.name;
    const div = $("main_area");
    const board = $(`player_area_${color}`);
    //div.appendChild(board);

    dojo.place(`pboard_${color}`, `tableau_${color}_cards_0`);
    dojo.place(`tableau_${color}_corp`, `pboard_${color}`, "after");
    //dojo.place(`player_controls_${color}`, `player_board_header_${color}`, "first");

    //dojo.removeClass(`tableau_${color}_corp_effect`, "corp_effect");
    dojo.place(`player_area_name_${color}`, `player_board_header_${color}`, "first");


    dojo.place("alt_tracker_gen", "main_board");
    dojo.destroy("outer_generation");

    dojo.place("deck_main", "decks_area");
    dojo.place("discard_main", "decks_area");
    dojo.place("oceans_pile", "map_middle");
    $("deck_holder").style.display = "none";
    $("discard_holder").style.display = "none";

    // dojo.place(`player_controls_${color}`,`miniboardentry_${color}`);

    dojo.place(`fpholder_${color}`, `miniboardentry_${color}`);

    dojo.place(`counter_draw_${color}`, `limbo`);

    // var parent = document.querySelector(".debug_section"); // studio only
    // if (!parent)
    //     $(`pboard_${color}`).style.display  = 'none'; // disable for now
  }

  setupDone() {
    if (!this.game.isLayoutFull()) return;
    // const togglehtml = this.game.getTooltipHtml(_("Player board visibility toggle"), "", "*", _("Click to show or hide player board"));

    // document.querySelectorAll(".viewcards_button[data-cardtype='0']").forEach((node) => {
    //   // have to attach tooltip directly, this element does not have a game model
    //   this.game.addTooltipHtml(node.id, togglehtml, this.game.defaultTooltipDelay);
    // });
    // move player zones in the same order
    const div = $("main_area");
    document.querySelectorAll("#players_area > .player_area").forEach((board) => {
      div.appendChild(board);
    });
  }

  renderSpecificToken(tokenNode: HTMLElement) {
    if (!this.game.isLayoutFull()) return;
    if (tokenNode.id.startsWith("tracker_tr")) {
      // debugger;
      const marker = "marker_" + tokenNode.id;
      let markerNode = $(marker);
      const color = getPart(tokenNode.id, 2);
      if (!markerNode) {
        markerNode = this.game.createDivNode(marker, "marker marker_tr marker_" + color, "main_board");
        //this.convertInto3DCube(markerNode, color);
      }

      let state = parseInt(tokenNode.getAttribute("data-state"));
      //this.game.setDomTokenState(markerNode, state);
      let bp = 0;
      let lp = 0;
      state = state % 100;
      let off = state % 25;

      let mul = 100 / 25;
      if (state < 25) {
        lp = 0;
        bp = mul * off;
      } else if (state < 50) {
        lp = mul * off;
        bp = 100;
      } else if (state < 75) {
        lp = 100;
        bp = 100 - mul * off;
      } else {
        lp = 100 - mul * off;
        bp = 0;
      }
      markerNode.style.left = `calc(10px + ${lp}% * 0.95)`;
      markerNode.style.bottom = `calc(10px + ${bp}% * 0.95)`;
      return;
    }
    const ptrackers = this.game.productionTrackers;
    const rtrackers = this.game.resourceTrackers;

    if (tokenNode.id.startsWith("tracker_")) {
      const type = getPart(tokenNode.id, 1);
      if (ptrackers.includes(type)) {
        // production tracker
        const markerNode = this.getMarkerCube(tokenNode.id);
        const state = parseInt(tokenNode.getAttribute("data-state"));
        let coords = this.productionCoords(state);
        markerNode.style.marginLeft = `${coords.x * 3.7}%`;
        markerNode.style.marginTop = `${coords.y * 4}%`;
        // update tooltip
        this.updateCountTooltip(tokenNode.id, markerNode.id);
        for (let i = 10; i < 100; i += 10) {
          if (state < i) {
            let markerNode10 = this.getMarkerCube(tokenNode.id, i, false);
            if (markerNode10) dojo.destroy(markerNode10);
          }
        }

        for (let i = 10; i < state; i += 10) {
          let markerNode10 = this.getMarkerCube(tokenNode.id, i);
          let coords = { x: 5 + i / 10 / 2.0 - 0.5, y: 1 };
          markerNode10.style.marginLeft = `${coords.x * 3.7}%`;
          markerNode10.style.marginTop = `${coords.y * 4}%`;
          this.updateCountTooltip(tokenNode.id, markerNode10.id);
        }
      } else if (rtrackers.includes(type)) {
        const color = getPart(tokenNode.id, 2);
        const state = parseInt(tokenNode.getAttribute("data-state"));
        const areaId = `resarea_${type}_${color}`;
        new ScatteredResourceZone(this.game, areaId).setValue(state);
        // update tooltip
        this.updateCountTooltip(tokenNode.id, areaId);
      }
    }
  }

  getMarkerCube(tokenNodeId: string, num: number = 0, create: boolean = true) {
    // production tracker
    const color = getPart(tokenNodeId, 2);
    const marker = "marker_" + tokenNodeId + "_" + num;
    const type = getPart(tokenNodeId, 1);
    let markerNode = $(marker);

    if (!markerNode && create) {
      markerNode = this.game.createDivNode(marker, `marker marker_${type} marker_${color}`, `pboard_${color}`);
      //this.convertInto3DCube(markerNode, color);
    }
    return markerNode;
  }

  productionCoords(state: number) {
    const rem = state % 10;
    let x = rem;
    let y = 0;
    if (rem > 5) {
      x = rem - 5;
      y = 1;
    } else if (state < 0) {
      x = state + 6;
      y = -1;
    }
    return { x, y };
  }

  updateCountTooltip(tokenNodeId: string, attachTo: string) {
    var tokenDisplayInfo = this.game.getTokenDisplayInfo(tokenNodeId);
    const state = $(tokenNodeId).getAttribute("data-state");
    tokenDisplayInfo.tooltip = this.game.generateItemTooltip(tokenDisplayInfo);
    tokenDisplayInfo.tooltip += this.game.generateTooltipSection(_("Count"), state + "");
    const tt = this.game.getTooltipHtmlForTokenInfo(tokenDisplayInfo);
    this.game.addTooltipHtml(attachTo, tt);
  }

  convertInto3DCube(tokenNode: HTMLElement, color?: string) {
    dojo.addClass(tokenNode, "mcube");
    if (color) dojo.addClass(tokenNode, "mcube-" + color);
    for (let i = 0; i <= 5; i++) {
      dojo.place(`<div class="mcube-face  mcube-face-${i}"></div>`, tokenNode);
    }
  }

  createHtmlForToken(tokenNode: HTMLElement, displayInfo: TokenDisplayInfo) {
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
  }
}
