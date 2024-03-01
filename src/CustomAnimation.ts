class CustomAnimation {
  private animations = {};
  private slide_duration:number=800;

  constructor(public game: GameXBody) {

    this.animations['grow_appear'] =
      {
        name: 'grow_appear', duration: 500, easing: 'ease-in',
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
    this.animations['small_tingle'] =
      {
        name: 'small_tingle', duration: 500, easing: 'ease-in',
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
    this.animations['great_tingle'] =
      {
        name: 'great_tingle', duration: 500, easing: 'ease-in',
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
    this.animations['pop'] =
      {
        name: 'pop', duration: 300, easing: 'ease-in',
        keyframes: `   
                         0% {
                               transform:scale(1);
                            }
                         100% {
                               transform:scale(1.2);
                               
                            }
                    `
      };
    this.animations['depop'] =
      {
        name: 'depop', duration: 300, easing: 'ease-in',
        keyframes: `   
                         0% {
                               transform:scale(1.2);
                            }
                         100% {
                               transform:scale(1);
                               
                            }
                    `
      };
    this.animations['fadein_and_drop'] =
      {
        name: 'fadein_and_drop', duration: 800, easing: 'ease-out',
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
     this.animations['award_pop'] =
      {
        name: 'award_pop', duration: 800, easing: 'ease-in',
        keyframes: `   
                         0% {
                                transform: translateY(0) scale(1) rotateY(360deg);
                            }
                        100% {
                                transform: translateY(-200%) scale(1.2) rotateY(0deg);
                            }
                    `
      };
    this.animations['award_depop'] =
      {
        name: 'award_depop', duration: 800, easing: 'ease-in',
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

  getSlideDuration():number {
    if (!this.areAnimationsPlayed()) return 0;
    let ret= this.slide_duration * parseInt(this.game.getSetting('animationspeed')) / 100;
    console.log('anim is ',ret);
  }

  getWaitDuration(wait:number):number {
    let ret=0;
    if (!this.areAnimationsPlayed()) return 0;
    ret= wait * parseInt(this.game.getSetting('animationspeed')) / 100;
    return ret;
  }

  getAnimationAmount() {
    return parseInt(this.game.getSetting('animationamount'));
  }

  setOriginalStackView(tableau_elem:HTMLElement,value:string) {
    if (this.areAnimationsPlayed()) {
      this.wait(this.getWaitDuration(1500)).then(()=>{
        tableau_elem.dataset.currentview=value;
      });
    } else {
      tableau_elem.dataset.currentview=value;
    }
  }

  animateTilePop(token_id: string) {
    if (!this.areAnimationsPlayed() || this.getAnimationAmount()==2) return this.getImmediatePromise();
    return this.playCssAnimation(token_id, 'grow_appear', null, null);
  }

  animatetingle(counter_id:string) {
    if (!this.areAnimationsPlayed()) return this.getImmediatePromise();
    if (this.nodeExists('alt_'+counter_id)) this.playCssAnimation('alt_'+counter_id, 'small_tingle', null, null);
    return this.playCssAnimation(counter_id, 'small_tingle', null, null);
  }

  async animatePlaceResourceOnCard(resource_id:string, place_id:string):Promise<any> {
    if (!this.areAnimationsPlayed()) return this.getImmediatePromise();

    let animate_token = resource_id;
    if(!this.game.isLayoutFull()  && place_id.startsWith('card_main_') ) animate_token = place_id.replace('card_main_','resource_holder_');

    let anim_1:Promise<any>;
    if (this.getAnimationAmount()==2) {
      anim_1=this.getImmediatePromise();
    } else {
      anim_1 =   this.playCssAnimation(place_id, 'pop', ()=>{
        dojo.style(place_id,'filter','grayscale(0)');
      }, ()=>{
        dojo.style(place_id,'transform','scale(1.2)');
      });
    }


      const anim_2:Promise<any>= anim_1.then(()=>{
        return this.playCssAnimation(animate_token, 'great_tingle', ()=>{
          dojo.style(animate_token,'z-index','10');
        }, ()=>{
          dojo.style(animate_token,'z-index','');
        });
      });

    if (this.getAnimationAmount()==2) {
      return anim_2;
    } else {
      return anim_2.then(()=>{
        return this.playCssAnimation(place_id, 'depop', ()=>{
          dojo.style(place_id,'transform','');
        }, ()=>{
          dojo.style(place_id,'filter','');
        });
      });
    }

  }

  async animateRemoveResourceFromCard(resource_id:string, card_id?: string):Promise<any> {
    if (!this.areAnimationsPlayed()) return this.getImmediatePromise();
    const animate_token  = card_id ?? $(resource_id).parentElement.id;
    if (animate_token.includes("tableau")) {
      //too late, resource is not on card anymore
      return  this.getImmediatePromise();
    }
    return this.playCssAnimation(animate_token, 'great_tingle', ()=>{
      dojo.style(animate_token,'z-index','10');
    }, ()=>{
      dojo.style(animate_token,'z-index','');
    });
  }

  async animatePlaceMarker(marker_id:string, place_id:string):Promise<any> {
    if (!this.areAnimationsPlayed()) return this.getImmediatePromise();

    let unclip:string[]=[];
    if (place_id.startsWith('tile')) {
      unclip.push(place_id);
      unclip.push($(place_id).parentElement.id);
    }

    let p_start:Promise<any>;
    if ((place_id.startsWith('award_') || place_id.startsWith('milestone')) && !this.game.isLayoutFull() && this.getAnimationAmount()==3) {
      p_start= this.playCssAnimation(place_id,'award_pop',()=>{
        dojo.style(marker_id,'opacity','0');
        $(place_id).setAttribute('style', 'box-shadow: none !important;');
      },()=>{
        $(place_id).setAttribute('style', 'transform: translateY(-200%) scale(1.2); box-shadow: none !important;');
      });
    } else {
      p_start= this.getImmediatePromise();
    }
    let p_mid= p_start
      .then(()=>{return this.playCssAnimation(marker_id, 'fadein_and_drop', ()=>{
       dojo.style(marker_id,'z-index','10');
        dojo.style(marker_id,'opacity','');
      for (let item of unclip) {
        $(item).setAttribute('style', 'clip-path: none; outline: none; box-shadow: none !important; background-color: revert;');
      }

    }, ()=>{
      dojo.style(marker_id,'z-index','');
      for (let item of unclip) {
           $(item).setAttribute('style', '');
      }
    });});

    if ((place_id.startsWith('award_') || place_id.startsWith('milestone')) && !this.game.isLayoutFull() && this.getAnimationAmount()==3) {
        return p_mid.then( ()=>{
          return this.playCssAnimation(place_id,'award_depop',()=>{
            $(place_id).setAttribute('style', 'box-shadow: none !important;');
            }
          ,()=>{
              $(place_id).setAttribute('style', '');
                })
        });
    } else {
      return this.getImmediatePromise();
    }

  }

  async animateMapItemAwareness(item_id:string):Promise<any> {
    if (!$(item_id)) return this.getImmediatePromise();
    if (!this.areAnimationsPlayed() ||  this.getAnimationAmount()==2) return this.getImmediatePromise();


    const anim_1= this.playCssAnimation(item_id, 'pop', ()=>{
      dojo.style(item_id,'z-index','10000');
    }, ()=>{
      dojo.style(item_id,'transform','scale(1.2)');
    });

    return anim_1.then(()=>{return this.wait(this.getWaitDuration(800))}).then(()=>{
      return this.playCssAnimation(item_id, 'depop', ()=>{
        dojo.style(item_id,'transform','');
      }, ()=>{
        dojo.style(item_id,'z-index','');
      });
    })
  }

  async moveResources(tracker:string,qty:number):Promise<any> {
    if (!this.areAnimationsPlayed()) return this.getImmediatePromise();
    if (qty==undefined || qty==0) return this.getImmediatePromise();

    const trk_item = tracker.replace('tracker_','').split('_')[0];

    let delay=0;
    let mark="";
    if (Math.abs(qty)>3) {
      mark=String(Math.abs(qty));
      qty=-1;
    }
    const htm = '<div id="%t" class="resmover">'+CustomRenders.parseActionsToHTML(trk_item,mark)+'</div>';

    for (let i=0; i<Math.abs(qty);i++) {
      let tmpid='tmp_'+String(Math.random()*1000000000);

      let visiblenode="";
      if (dojo.style('gameaction_status_wrap',"display")!="none") {visiblenode='gameaction_status';}
      else if (dojo.style('pagemaintitle_wrap',"display")!="none") {visiblenode='pagemaintitletext';}

      let fnode=visiblenode!="" ? $(visiblenode).querySelector('.token_img.tracker_'+trk_item) : null;
      if (fnode) {
        dojo.place('<div id="move_from_'+tmpid+'" class="topbar_movefrom"></div>',fnode);
      } else {
        dojo.place('<div id="move_from_'+tmpid+'" class="topbar_movefrom"></div>','thething');
      }

      let origin= qty>0 ? 'move_from_'+tmpid : tracker.replace('tracker_','alt_tracker_');
      let destination = qty>0 ? tracker.replace('tracker_','alt_tracker_') : 'move_from_'+tmpid;

      if (!this.nodeExists(origin) && origin.startsWith('alt_')) origin=tracker;
      if (!this.nodeExists(destination) && destination.startsWith('alt_')) destination=tracker;


      dojo.place(htm.replace('%t',tmpid),origin);

      this.wait(delay).then(()=>{

        if (destination.startsWith('move_from_') && !dojo.byId(destination)) {
          dojo.place('<div id="move_from_'+tmpid+'" class="topbar_movefrom"></div>','thething');
        }
        this.game.slideAndPlace(tmpid,destination,this.getWaitDuration(500),undefined,()=>{
        if (dojo.byId(tmpid)) dojo.destroy(tmpid);
        if (dojo.byId('move_from_'+tmpid)) dojo.destroy('move_from_'+tmpid);
      }); });

      /*
      this.wait(delay).then(()=>{return this.slideToObjectAndAttach(tmpid,destination);}).then(()=>{
          dojo.destroy(tmpid);
        }
      );*/
      delay+=this.getWaitDuration(200);

    }
    return this.wait(delay+this.getWaitDuration(500));
  }

  addAnimationsToDocument(animations: any): void {
    if ($('css_animations')) return;
    const head = document.getElementsByTagName('head')[0];
    let s = document.createElement('style');
    s.setAttribute('type', 'text/css');
    s.setAttribute('id', 'css_animations')
    let css = "";
    for (let idx of Object.keys(animations)) {

      let anim = animations[idx];
      css = css + '.anim_' + anim.name + ' {\n';
    //  css = css + ' animation: key_anim_' + anim.name + ' ' + anim.duration + 'ms ' + anim.easing + ';\n'
      css = css + ' animation: key_anim_' + anim.name + ' calc(var(--localsetting_animationspeed) * ' + anim.duration/100 + 'ms) ' + anim.easing + ';\n'
      css = css + '}\n';

      css = css + '@keyframes key_anim_' + anim.name + ' {\n';
      css = css + anim.keyframes;
      css = css + '}\n';
    }
    s.innerHTML = css;
    head.appendChild(s);
  }


  areAnimationsPlayed(): boolean {
    //if(this.game.animated) return true;
    if (this.game.instantaneousMode) return false;
    if (this.getAnimationAmount()==1) return false;
    if (document.hidden || document.visibilityState === 'hidden') return false;

    return true;

  }

  //"fake" promise, made to use as functional empty default
  getImmediatePromise(): Promise<any> {
    return Promise.resolve('');
  }

  //return a timed promise
  wait(ms: number): Promise<any> {
    return new Promise((resolve, reject) => {
      setTimeout(() => resolve(""), ms);
    });
  }

  //Adds css class on element, plays it, executes onEnd and removes css class
  //a promise is returned for easy chaining
  async playCssAnimation(targetId: string, animationname: string, onStart: any, onEnd: any): Promise<any> {
    if (!$(targetId)) return this.getImmediatePromise();
    const animation = this.animations[animationname];

    return new Promise((resolve, reject) => {
      let cssClass = 'anim_' + animation.name;
      let timeoutId = null;
      let resolvedOK = false;
      let localCssAnimationCallback = (e) => {

        if (e.animationName != 'key_' + cssClass) {
          //  console.log("+anim",animationname,"animation name intercepted ",e.animationName);
          return;
        }
        resolvedOK = true;
        $(targetId).removeEventListener('animationend', localCssAnimationCallback);
        $(targetId).classList.remove(cssClass);
        if (onEnd) onEnd();
        //   this.log('+anim',animationname,'resolved with callback');
        resolve("");
      }

      if (onStart) onStart();
      $(targetId).addEventListener('animationend', localCssAnimationCallback);
      dojo.addClass(targetId, cssClass);

      // this.MAIN.log('+anim',animationname,'starting playing');

      //timeout security

      timeoutId = setTimeout(() => {
        if (resolvedOK) return;
        if (this.nodeExists(targetId)) {
          $(targetId).removeEventListener('animationend', localCssAnimationCallback);
          $(targetId).classList.remove(cssClass);
        }

        if (onEnd) onEnd();
        //this.MAIN.log('+anim',animationname,'resolved with timeout');
        resolve("");
      }, animation.duration * 1.5);
    });

  }

  slideToObjectAndAttach(movingId:string, destinationId:string,  rotation:number = 0,posX:number=undefined, posY:number=undefined) {
    const object =document.getElementById(movingId);
    const destination = document.getElementById(destinationId);
    const zoom = 1;

    if (destination.contains(object)) {
      return Promise.resolve(true);
    }

    return new Promise(resolve => {
      const originalZIndex = Number(object.style.zIndex);
      object.style.zIndex = '25';

      const objectCR = object.getBoundingClientRect();
      const destinationCR = destination.getBoundingClientRect();

      const deltaX = destinationCR.left - objectCR.left + (posX ?? 0) * zoom;
      const deltaY = destinationCR.top - objectCR.top + (posY ?? 0) * zoom;

      //When move ends
      const attachToNewParent = () => {
        object.style.top = posY !== undefined ? `${posY}px` : null;
        object.style.left = posX !== undefined ? `${posX}px` : null;
        object.style.position = (posX !== undefined || posY !== undefined) ? 'absolute' : null;
        object.style.zIndex = originalZIndex ? ''+originalZIndex : null;
        object.style.transform = rotation ? `rotate(${rotation}deg)` : null;
        object.style.transition = null;
        destination.appendChild(object);
      }

        object.style.transition = 'transform '+this.slide_duration+'ms ease-in';
        object.style.transform = `translate(${deltaX / zoom}px, ${deltaY / zoom}px) rotate(${rotation}deg)`;
        if (object.style.position!="absolute") object.style.position='relative';

        let securityTimeoutId = null;

        const transitionend = () => {
          attachToNewParent();
          object.removeEventListener('transitionend', transitionend);
          object.removeEventListener('transitioncancel', transitionend);
          resolve(true);

          if (securityTimeoutId) {
            clearTimeout(securityTimeoutId);
          }
        };

        object.addEventListener('transitionend', transitionend);
        object.addEventListener('transitioncancel', transitionend);

        // security check : if transition fails, we force tile to destination
        securityTimeoutId = setTimeout(() => {

          if (!destination.contains(object)) {

            attachToNewParent();
            object.removeEventListener('transitionend', transitionend);
            object.removeEventListener('transitioncancel', transitionend);
            resolve(true);
          }
        }, this.slide_duration*1.2);

    });
}

  nodeExists(node_id:string):boolean {
    var node = dojo.byId(node_id);
    if (!node) {
      return false;
    } else {
      return true;
    }
  }

}