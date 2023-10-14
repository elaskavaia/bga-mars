class VLayout {
  constructor(public game: GameXBody) {}

  setupPlayer(playerInfo: any) {
    if (!this.game.isLayoutFull()) return;
    const color = playerInfo.color;
    const div = $("main_area");
    const board = $(`player_area_${color}`);
    div.appendChild(board);

    $(`tableau_${color}`).setAttribute("data-visibility_3", "1");
    $(`tableau_${color}`).setAttribute("data-visibility_1", "1");

    dojo.destroy(`tableau_${color}_cards_3vp`);
    dojo.destroy(`tableau_${color}_cards_1vp`);
    dojo.place(`tableau_${color}_corp`, `tableau_${color}`,'first');

    

    dojo.place("tracker_gen", "map_left");
    dojo.destroy("outer_generation");

    dojo.place("deck_main", "decks_area");
    dojo.place("discard_main", "decks_area");
    dojo.destroy("deck_holder");
    dojo.destroy("discard_holder");

    // dojo.place(`player_controls_${color}`,`miniboardentry_${color}`);
    dojo.place(`player_viewcards_2_${color}`, `miniboardentry_${color}`);
    dojo.place(`player_viewcards_1_${color}`, `miniboardentry_${color}`);
    dojo.place(`player_viewcards_3_${color}`, `miniboardentry_${color}`);
    dojo.place(`fpholder_${color}`, `miniboardentry_${color}`);
    dojo.place(`player_area_name_${color}`, `player_area_${color}`);
    dojo.place(`counter_draw_${color}`, `limbo`);

    for (let i = 1; i <= 3; i++) {
      $("tableau_" + color).dataset["visibility_" + i] = "1";
      $("player_viewcards_" + i + "_" + color).dataset.selected = "1";
    }
  }

  renderSpecificToken(tokenNode: HTMLElement) {
    if (!this.game.isLayoutFull()) return;
    if (tokenNode.id.startsWith("tracker_tr")) {
      // debugger;
      const marker = "marker_" + tokenNode.id;
      let markerNode = $(marker);
      if (!markerNode) {
        const color = getPart(tokenNode.id, 2);
        markerNode = this.game.createDivNode(marker, "marker marker_tr marker_" + color, "main_board");

        let state = parseInt(tokenNode.getAttribute("data-state"));
        //this.game.setDomTokenState(markerNode, state);
        let bp = 0;
        let lp = 0;
        state = state % 100;
        let off = state % 25;
        let mul = 100 / 25;
        if (state <= 25) {
          lp = 0;
          bp =  mul * off;
        } else if (state < 50) {
          lp = mul * off;
          bp = 100;
        } else if (state <=75) {
          lp = 100;
          bp = 100 - mul * off;
        } else if (state < 50) {
          lp = 100 - mul * off;
          bp = 0;
        }
        markerNode.style.left = `calc(10px + ${lp}% * 0.95)`;
        markerNode.style.bottom = `calc(10px + ${bp}% * 0.95)`;
      }
    }
  }
}
