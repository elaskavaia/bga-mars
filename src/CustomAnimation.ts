const BIG_ANIMATION = 3;
const SMALL_ANIMATION = 2;
const NO_ANIMATION = 1;

class CustomAnimation {
  private animations = {};
  private slide_duration: number = 800;

  constructor(public game: GameXBody) {
    this.animations["grow_appear"] = {
      name: "grow_appear",
      duration: 500,
      easing: "ease-in",
      keyframes: `   
                         0% {
                               transform:scale(0);
                            }
                         80% {
                               transform:scale(1.1);
                            }
                         100% {
                               transform:scale(1);

                            }
                    `
    };
    this.animations["small_tingle"] = {
      name: "small_tingle",
      duration: 500,
      easing: "ease-in",
      keyframes: `   
                         0% {
                               color:white;            
                               transform:scale(1);
                            }
                         80% {
                               color:red;
                               transform:scale(1.1);
                            }
                         100% {
                               color:white;
                               transform:scale(1);

                            }
                    `
    };
    this.animations["great_tingle"] = {
      name: "great_tingle",
      duration: 500,
      easing: "ease-in",
      keyframes: `   
                         0% {
                               transform:scale(1);
                               color:white;
                            }
                         80% {
                               color:red;
                               transform:scale(2);
                            }
                         100% {
                              color:white;
                               transform:scale(1);

                            }
                    `
    };
    this.animations["pop"] = {
      name: "pop",
      duration: 250,
      easing: "ease-in",
      keyframes: `   
                         0% {
                               transform:scale(1);
                            }
                         100% {
                               transform:scale(1.2);
                               
                            }
                    `
    };
    this.animations["depop"] = {
      name: "depop",
      duration: 250,
      easing: "ease-in",
      keyframes: `   
                         0% {
                               transform:scale(1.2);
                            }
                         100% {
                               transform:scale(1);
                               
                            }
                    `
    };
    this.animations["fadein_and_drop"] = {
      name: "fadein_and_drop",
      duration: 800,
      easing: "ease-out",
      keyframes: `   
                         0% {
                                 transform: translateY(-1000%);
                                 opacity:0;
                            }
                        50% {
                                 opacity:1;
                            }
                         100% {
                                 transform: translateY(0);
                                 opacity:1;
                            }
                    `
    };
    this.animations["award_pop"] = {
      name: "award_pop",
      duration: 800,
      easing: "ease-in",
      keyframes: `   
                         0% {
                                transform: translateY(0) scale(1) rotateY(360deg);
                            }
                        100% {
                                transform: translateY(-200%) scale(1.2) rotateY(0deg);
                            }
                    `
    };
    this.animations["award_depop"] = {
      name: "award_depop",
      duration: 800,
      easing: "ease-in",
      keyframes: `   
                        0% {
                                transform: translateY(-200%) scale(1.2)  rotateY(0deg);
                            }
                        100% {
                                transform: translateY(0) scale(1) rotateY(360deg);
                            }
                    `
    };

    this.addAnimationsToDocument(this.animations);
  }

  getSlideDuration(): number {
    if (!this.areAnimationsPlayed()) return 0;
    let ret = (this.slide_duration * parseInt(this.game.getSetting("animationspeed"))) / 100;
    console.log("anim is ", ret);
  }

  getWaitDuration(wait: number): number {
    let ret = 0;
    if (!this.areAnimationsPlayed()) return 0;
    ret = (wait * parseInt(this.game.getSetting("animationspeed"))) / 100;
    return ret;
  }

  getAnimationAmount() {
    return parseInt(this.game.getSetting("animationamount"));
  }

  setOriginalStackView(tableau_elem: HTMLElement, value: string) {
    if (this.areAnimationsPlayed()) {
      this.waitAdjusted(1000).then(() => {
        tableau_elem.dataset.currentview = value;
      });
    } else {
      tableau_elem.dataset.currentview = value;
    }
  }

  async animateTilePop(token_id: string) {
    return this.playCssAnimation(token_id, "grow_appear", null, null, BIG_ANIMATION);
  }

  async animateTingle(counter_id: string) {
    void this.playCssAnimation("alt_" + counter_id, "small_tingle", null, null, SMALL_ANIMATION);
    return this.playCssAnimation(counter_id, "small_tingle", null, null, SMALL_ANIMATION);
  }

  async animatePlaceResourceOnCard(resource_id: string, place_id: string): Promise<any> {
    if (!this.areAnimationsPlayed()) return;

    let animate_token = resource_id;
    if (!this.game.isLayoutFull()) animate_token = `resource_holder_${place_id}`;

    const div = $(place_id);
    const divToken = $(place_id);
    return Promise.allSettled([
      // first animation
      this.playCssAnimation(
        place_id,
        "pop",
        () => {
          div.style.setProperty("filter", "grayscale(0)");
        },
        () => {
          div.style.setProperty("transform", "scale(1.2)");
        },
        BIG_ANIMATION
      ).finally(() =>
        this.playCssAnimation(
          place_id,
          "depop",
          () => {
            div.style.setProperty("transform", "scale(1.2)");
          },
          () => {
            div.style.removeProperty("filter");
            div.style.removeProperty("transform");
          },
          BIG_ANIMATION
        )
      ),
      // second animation
      this.playCssAnimation(
        animate_token,
        "great_tingle",
        () => {
          divToken.style.setProperty("z-index", "1000");
        },
        () => {
          divToken.style.removeProperty("z-index");
        },
        SMALL_ANIMATION
      )
    ]);
  }

  async animateRemoveResourceFromCard(resource_id: string, card_id?: string): Promise<any> {
    if (!this.areAnimationsPlayed()) return;
    const animate_token = card_id ?? $(resource_id).parentElement.id;
    if (animate_token.includes("tableau")) {
      //too late, resource is not on card anymore
      return;
    }
  }

  async animatePlaceMarker(marker_id: string, place_id: string): Promise<void> {
    if (!this.areAnimationsPlayed()) return;

    let unclip: string[] = [];
    if (place_id.startsWith("tile")) {
      unclip.push(place_id);
      unclip.push($(place_id).parentElement.id);
    }

    let p_start: Promise<any>;
    if ((place_id.startsWith("award_") || place_id.startsWith("milestone")) && !this.game.isLayoutFull()) {
      p_start = this.playCssAnimation(
        place_id,
        "award_pop",
        () => {
          dojo.style(marker_id, "opacity", "0");
          $(place_id).setAttribute("style", "box-shadow: none !important;");
        },
        () => {
          $(place_id).setAttribute("style", "transform: translateY(-200%) scale(1.2); box-shadow: none !important;");
        },
        BIG_ANIMATION
      );
    } else {
      p_start = this.getImmediatePromise();
    }
    let p_mid = p_start.then(() => {
      return this.playCssAnimation(
        marker_id,
        "fadein_and_drop",
        () => {
          dojo.style(marker_id, "z-index", "10");
          dojo.style(marker_id, "opacity", "");
          for (let item of unclip) {
            $(item).setAttribute("style", "clip-path: none; outline: none; box-shadow: none !important; background-color: revert;");
          }
        },
        () => {
          dojo.style(marker_id, "z-index", "");
          for (let item of unclip) {
            $(item).setAttribute("style", "");
          }
        },
        SMALL_ANIMATION
      );
    });

    if ((place_id.startsWith("award_") || place_id.startsWith("milestone")) && !this.game.isLayoutFull()) {
      return p_mid.then(() => {
        return this.playCssAnimation(
          place_id,
          "award_depop",
          () => {
            $(place_id).setAttribute("style", "box-shadow: none !important;");
          },
          () => {
            $(place_id).setAttribute("style", "");
          },
          BIG_ANIMATION
        );
      });
    }
  }

  async animateMapItemAwareness(item_id: string): Promise<void> {
    const div = $(item_id);
    return this.playCssAnimation(
      item_id,
      "pop",
      () => {
        div.style.setProperty("z-index", "1000");
      },
      () => {
        div.style.setProperty("transform", "scale(1.2)");
      },
      BIG_ANIMATION
    ).finally(() =>
      this.playCssAnimation(
        item_id,
        "depop",
        () => {
          div.style.setProperty("transform", "scale(1.2)");
        },
        () => {
          div.style.removeProperty("z-index");
          div.style.removeProperty("transform");
        },
        BIG_ANIMATION
      )
    );
  }

  async moveResources(tracker: string, qty: number): Promise<any> {
    if (!this.areAnimationsPlayed()) return;
    if (qty == undefined || qty == 0) return;

    const trk_item = tracker.replace("tracker_", "").split("_")[0];

    let delay = 0;
    let mark = "";
    if (Math.abs(qty) > 3) {
      mark = String(Math.abs(qty));
      qty = -1;
    }
    const htm = '<div id="%t" class="resmover">' + CustomRenders.parseActionsToHTML(trk_item, mark) + "</div>";
    const singleDur = this.getWaitDuration(500);
    const sequenceDur = this.getWaitDuration(200);

    for (let i = 0; i < Math.abs(qty); i++) {
      let tmpid = "tmp_" + String(Math.random() * 1000000000);

      let visiblenode = "";
      if (dojo.style("gameaction_status_wrap", "display") != "none") {
        visiblenode = "gameaction_status";
      } else if (dojo.style("pagemaintitle_wrap", "display") != "none") {
        visiblenode = "pagemaintitletext";
      }

      let fnode = visiblenode != "" ? $(visiblenode).querySelector(".token_img.tracker_" + trk_item) : null;
      if (fnode) {
        dojo.place('<div id="move_from_' + tmpid + '" class="topbar_movefrom"></div>', fnode);
      } else {
        dojo.place('<div id="move_from_' + tmpid + '" class="topbar_movefrom"></div>', "thething");
      }

      let origin = qty > 0 ? "move_from_" + tmpid : tracker.replace("tracker_", "alt_tracker_");
      let destination = qty > 0 ? tracker.replace("tracker_", "alt_tracker_") : "move_from_" + tmpid;

      if (!$(origin) && origin.startsWith("alt_")) origin = tracker;
      if (!$(destination) && destination.startsWith("alt_")) destination = tracker;

      dojo.place(htm.replace("%t", tmpid), origin);

      this.wait(delay).then(() => {
        if ($(tmpid)) {
          if (destination.startsWith("move_from_") && !dojo.byId(destination)) {
            dojo.place('<div id="move_from_' + tmpid + '" class="topbar_movefrom"></div>', "thething");
          }
          this.game.slideAndPlace(tmpid, destination, singleDur, undefined, () => {
            dojo.destroy(tmpid);
            dojo.destroy("move_from_" + tmpid);
          });
        }
      });

      delay += sequenceDur;
    }
    return this.wait(Math.max(delay + singleDur, 900)); // no more than 900ms to not cause timeout
  }

  addAnimationsToDocument(animations: any): void {
    if ($("css_animations")) return;
    const head = document.getElementsByTagName("head")[0];
    let s = document.createElement("style");
    s.setAttribute("type", "text/css");
    s.setAttribute("id", "css_animations");
    let css = "";
    for (let idx of Object.keys(animations)) {
      let anim = animations[idx];
      css = css + ".anim_" + anim.name + " {\n";
      //  css = css + ' animation: key_anim_' + anim.name + ' ' + anim.duration + 'ms ' + anim.easing + ';\n'
      css =
        css +
        " animation: key_anim_" +
        anim.name +
        " calc(var(--localsetting_animationspeed) * " +
        anim.duration / 100 +
        "ms) " +
        anim.easing +
        ";\n";
      css = css + "}\n";

      css = css + "@keyframes key_anim_" + anim.name + " {\n";
      css = css + anim.keyframes;
      css = css + "}\n";
    }
    s.innerHTML = css;
    head.appendChild(s);
  }

  areAnimationsPlayed(): boolean {
    //if(this.game.animated) return true;
    if (this.game.instantaneousMode) return false;
    if (this.game.isDoingSetup) return false;
    if (this.getAnimationAmount() < SMALL_ANIMATION) return false;
    if (document.hidden || document.visibilityState === "hidden") return false;

    return true;
  }

  //"fake" promise, made to use as functional empty default
  getImmediatePromise(): Promise<any> {
    return Promise.resolve("");
  }

  //return a timed promise
  wait(ms: number): Promise<any> {
    return new Promise((resolve, reject) => {
      setTimeout(() => resolve(""), ms);
    });
  }

  waitAdjusted(ms: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const msa = this.getWaitDuration(ms);
      setTimeout(() => resolve(""), msa);
    });
  }
  //Adds css class on element, plays it, executes onEnd and removes css class
  //a promise is returned for easy chaining
  async playCssAnimation(targetId: string, animationname: string, onStart: any, onEnd: any, minLevel: number = 2): Promise<any> {
    if (!$(targetId)) return;
    if (!this.areAnimationsPlayed()) return;
    if (this.getAnimationAmount() < minLevel) return;
    const animation = this.animations[animationname];

    let cssClass = "anim_" + animation.name;
    let resolvedOK = false;
    const adjDuration = this.getWaitDuration(animation.duration);
    // console.log(`*** anim ${animationname} started for ${targetId} of ${animation.duration} ms (${adjDuration} ms)`);
    if (adjDuration <= 0) return;

    const cleanUp = function (e: Event, kind: string = "callback") {
      if (resolvedOK) return;
      resolvedOK = true;
      if ($(targetId)) {
        $(targetId).removeEventListener("animationend", cleanUp);
        $(targetId).classList.remove(cssClass);
      }
      //console.log(`*** anim ${animationname} for ${targetId} onEnd`);
      safeCall(onEnd);
      //console.log(`*** anim ${animationname} for ${targetId} resolved with ${kind}`);
    };
    //console.log(`*** anim ${animationname} for ${targetId} onStart`);
    safeCall(onStart);

    $(targetId).addEventListener("animationend", cleanUp);
    $(targetId).classList.add(cssClass);

    // this.MAIN.log('+anim',animationname,'starting playing');

    //timeout security

    setTimeout(() => cleanUp(undefined, "timeout"), adjDuration * 1.5);

    return this.wait(adjDuration);
  }
}

function safeCall(handler: any) {
  if (handler) {
    try {
      handler();
    } catch (e) {
      console.error(e);
    }
  }
}
