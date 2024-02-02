/**
 * This represents ui zone that containers resource token usually randomly scattered
 * This normally can be represented by resouce count alone but doing the visual effect for shits and giggles
 */

class ScatteredResourceZone {
  value: number; // how many resources to display
  zoneId: string; // id of div holding resources
  resclass: string; //  class/prefix of resource (has to be both prefix of id and class set with same name)
  game: GameXBody; // game reference
  supplyId: string; // id of supply zone
  nominations = [10, 5, 1];
  nominationSize = {
    10: 30,
    5: 25,
    1: 10
  };

  public constructor(game: GameXBody, zoneId: string, resclass: string = "res") {
    this.game = game;
    this.resclass = resclass;
    this.zoneId = zoneId;
    this.supplyId = "main_board";
  }

  public setValue(value: number, redraw: boolean = true) {
    this.value = value;
    if (redraw) this.redraw();
  }

  public redraw() {
    const divZone = $(this.zoneId);
    if (!divZone) return;
    const prevValue = (divZone.getAttribute("data-state") as unknown as number) || 0;
    const newValue = this.value;
    let diff = newValue - prevValue;
    divZone.setAttribute("data-state", String(this.value));

    add: while (diff > 0) {
      for (let nom of this.nominations) {
        if (diff >= nom) {
          this.addResource(nom);
          diff -= nom;
          continue add;
        }
      }
    }

    rem: while (diff < 0) {
      for (let nom of this.nominations) {
        if (-diff >= nom) {
          if (this.removeResource(nom)) {
            diff += nom;
            continue rem;
          }
        }
      }
      // need to split
      for (let nom of this.nominations) {
        if (-diff < nom) {
          if (this.split(nom)) {
            continue rem;
          }
        }
      }
    }
  }

  public split(nomination: number) {
    if (nomination == 1) return false;
    if (this.removeResource(nomination)) {
      this.addResourceN(nomination, 1);
      return true;
    }
    return false;
  }

  public addResourceN(count: number, nomination: number = 1) {
    while (count--) {
      this.addResource(nomination);
    }
  }

  public addResource(nomination: number = 1) {
    //debugger;
    const supply = this.supplyId;
    const avail = $(supply).querySelector(`.${this.resclass}_n${nomination}`);
    if (avail) {
      var id = avail.id;
    } else {
      const all = document.querySelectorAll(`.${this.resclass}_n${nomination}`);
      const num = all.length + 1;
      var id = `${this.resclass}_n${nomination}_${num}`;
    }

    const parent = $(this.zoneId);
    const size = this.nominationSize[nomination] || 20; 

    let w = parent.offsetWidth;
    if (!w) w = 100; // XXX why its not working?
    let h = parent.offsetHeight;
    if (!h) h = 100;
    let x = Math.floor(Math.random() * (w - size)) + size / 2;
    let y = Math.floor(Math.random() * (h - size)) + size / 2;
    let pi: TokenMoveInfo = {
      location: this.zoneId,
      key: id,
      state: nomination,
      x: x,
      y: y,
      position: "absolute",
      from: this.supplyId
    };

    //console.log("adding res "+id+" on "+this.zoneId);
    this.game.placeTokenLocal(id, this.zoneId, nomination, { placeInfo: pi });
    $(id).classList.add(this.resclass);
    $(id).classList.add(`${this.resclass}_n${nomination}`);
  }

  public removeResource(nomination: number = 1) {
    const parent = $(this.zoneId);
    const cube = parent.querySelector(`.${this.resclass}_n${nomination}`);
    if (!cube) return false;

    const id = cube.id;

    //console.log("removing res "+id+" on "+this.zoneId);
    this.game.stripPosition(id);
    this.game.placeTokenLocal(id, this.supplyId);
    return true;
  }
}
