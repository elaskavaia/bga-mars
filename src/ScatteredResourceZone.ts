/**
 * This represents ui zone that containers resource token usually randomly scattered
 * This normally can be represented by resouce count alone but doing the visual effect for shits and giggles
 */

class ScatteredResourceZone {
  value: number; // how many resources to display
  zoneId: string; // id of div holding resources
  resclass: string; //  class/prefix of resource (has to be both prefix of id and class set with same name)
  game: GameXBody; // game reference

  public constructor(game: GameXBody, zoneId: string,  resclass: string = "res") {
    this.game = game;
    this.resclass = resclass;
    this.zoneId = zoneId;
  }

  public setValue(value: number, redraw: boolean = true) {
    this.value = value;
    if (redraw) this.redraw();
  }

  public redraw() {
    if (!$(this.zoneId)) return;
    const nom = 1;
    const divs = $(this.zoneId).querySelectorAll(`.${this.resclass}_n${nom}`);
    let curvalue = divs.length;
    while (curvalue < this.value) {
      this.addResource(nom);
      curvalue++;
    }
  }

  public addResource(nom: number = 1) {
    
    const all = document.querySelectorAll(`.${this.resclass}_n${nom}`);
    const num = all.length + 1;
    const id = `${this.resclass}_n${nom}_${num}`;
    const parent = $(this.zoneId);
    const size = 20; // XXX

    let w = parent.offsetWidth; if (!w) w = 100; // XXX why its not working?
    let h = parent.offsetHeight; if (!h) h = 100;
    let x = Math.floor((Math.random() * (w - size))) + size / 2;
    let y = Math.floor((Math.random() * (h - size))) + size / 2;
    let pi: TokenMoveInfo = {
      location: this.zoneId,
      key: id,
      state: nom,
      x: x,
      y: y,
      position: 'absolute',
      from: 'main_board'
    };
   
    //console.log("adding res "+id+" on "+this.zoneId);
    this.game.placeTokenLocal(id, this.zoneId, nom, { placeInfo: pi });
    $(id).classList.add(this.resclass);
    $(id).classList.add(`${this.resclass}_n${nom}`);
  }
}
