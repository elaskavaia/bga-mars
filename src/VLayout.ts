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
    dojo.place('tracker_gen','map_left');
    dojo.destroy('outer_generation');

    dojo.place('deck_main','decks_area');
    dojo.place('discard_main','decks_area');
    dojo.destroy('deck_holder');
    dojo.destroy('discard_holder');

    
   // dojo.place(`player_controls_${color}`,`miniboardentry_${color}`);
    dojo.place(`player_viewcards_2_${color}`,`miniboardentry_${color}`);
    dojo.place(`player_viewcards_1_${color}`,`miniboardentry_${color}`);
    dojo.place(`player_viewcards_3_${color}`,`miniboardentry_${color}`);
    dojo.place(`fpholder_${color}`,`miniboardentry_${color}`);
    dojo.place(`player_area_name_${color}`,`player_area_${color}`);
    dojo.place(`counter_draw_${color}`,`limbo`);

    for (let i = 1; i <= 3; i++) {
      $("tableau_" + color).dataset["visibility_" + i] = "1";
      $("player_viewcards_" + i + "_" + color).dataset.selected = "1";
    }
  }
}
