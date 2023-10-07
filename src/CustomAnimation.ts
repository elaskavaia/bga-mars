class CustomAnimation {

  animations = {};
  slide_duration=800;

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

    this.addAnimationsToDocument(this.animations);

  }


  animateTilePop(token_id: string) {
    return this.playCssAnimation(token_id, 'grow_appear', null, null);
  }


  moveResources(tracker:string,qty:number) {
    if (qty==0) return;

    const trk_item = tracker.replace('tracker_','').split('_')[0];

    let delay=0;
    let mark="";
    if (Math.abs(qty)>10) {
      mark=String(Math.abs(qty));
      qty=-1;
    }
    const htm = '<div id="%t" class="resmover">'+CustomRenders.parseActionsToHTML(trk_item,mark)+'</div>';

    debugger;
    for (let i=0; i<Math.abs(qty);i++) {
      let tmpid='tmp_'+String(Math.random()*1000000000);
      dojo.place('<div id="move_from_'+tmpid+'" class="topbar_movefrom"></div>','thething');

      let origin= qty>0 ? 'move_from_'+tmpid : tracker.replace('tracker_','alt_tracker_');
      let destination = qty>0 ? tracker.replace('tracker_','alt_tracker_') : 'move_from_'+tmpid;

      dojo.place(htm.replace('%t',tmpid),origin);

      this.wait(delay).then(()=>{
        this.game.slideAndPlace(tmpid,destination,500,undefined,()=>{
        if (dojo.byId(tmpid)) dojo.destroy(tmpid);
        if (dojo.byId('move_from_'+tmpid)) dojo.destroy('move_from_'+tmpid);
      }); });

      /*
      this.wait(delay).then(()=>{return this.slideToObjectAndAttach(tmpid,destination);}).then(()=>{
          dojo.destroy(tmpid);
        }
      );*/
      delay+=100;
    }
  }

  addAnimationsToDocument(animations: any): void {
    const head = document.getElementsByTagName('head')[0];
    let s = document.createElement('style');
    s.setAttribute('type', 'text/css');
    s.setAttribute('id', 'css_animations')
    let css = "";
    for (let idx of Object.keys(animations)) {

      let anim = animations[idx];
      css = css + '.anim_' + anim.name + ' {\n';
      css = css + ' animation: key_anim_' + anim.name + ' ' + anim.duration + 'ms ' + anim.easing + ';\n'
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
    if (document.hidden || document.visibilityState === 'hidden') return false;

    return true;

  }

  //"fake" promise, made to use as functional empty default
  getImmediatePromise(): Promise<any> {
    return new Promise((resolve, reject) => {
      resolve("");
    });
  }

  //return a timed promise
  wait(ms: number): Promise<any> {
    return new Promise((resolve, reject) => {
      setTimeout(() => resolve(""), ms);
    });
  }

  //Adds css class on element, plays it, executes onEnd and removes css class
  //a promise is returned for easy chaining
  playCssAnimation(targetId: string, animationname: string, onStart: any, onEnd: any): Promise<any> {

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

  slideToObjectAndAttach(movingId, destinationId,  rotation = 0,posX=undefined, posY=undefined) {
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

  nodeExists(node_id:string) {
    var node = dojo.byId(node_id);
    if (!node) {
      return false;
    } else {
      return true;
    }
  }

}