class VLayout {
  constructor(public game: GameXBody) {}

  setupPlayer(playerInfo: any) {
    if (!this.game.isLayoutFull()) return;

    const div = $("main_area");
    const board = $(`player_area_${playerInfo.color}`);
    div.appendChild(board);
    $(`tableau_${playerInfo.color}`).setAttribute("data-visibility_3", "1");
    $(`tableau_${playerInfo.color}`).setAttribute("data-visibility_1", "1");

    dojo.destroy(`tableau_${playerInfo.color}_cards_3vp`);
    dojo.destroy(`tableau_${playerInfo.color}_cards_1vp`);
    dojo.place('tracker_gen','map_left');
    dojo.destroy('outer_generation');

    dojo.place('deck_main','decks_area');
    dojo.place('discard_main','decks_area');
    dojo.destroy('deck_holder');
    dojo.destroy('discard_holder');
  }
}
