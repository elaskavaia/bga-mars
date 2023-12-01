
/* Module for rendering  card effects, powers , etc
*
*/
 class CustomRenders {
    public static parses = {
      forest: { classes: "tracker tracker_forest" },
      all_city: { classes: "tracker tracker_city", redborder: 'hex' },
      all_cityonmars: { classes: "tracker tracker_city", redborder: 'hex',after: '*' },
      all_tagEvent: { classes: "tracker badge tracker_tagEvent",after: '*' },
      play_cardEvent: { classes: "tracker badge tracker_tagEvent"},
      city: { classes: "tracker micon tracker_city" },
      ocean: { classes: "token_img tracker_w" },
      discard: { classes: "token_img cardback",before:'-' },
      draw: { classes: "token_img cardback",before:'+' },
      tile: { classes: "tracker micon tile_%card_number%" },
      tagScience: { classes: "tracker badge tracker_tagScience" },
      tagEnergy: { classes: "tracker badge tracker_tagEnergy" },
      tagMicrobe: { classes: "tracker badge tracker_tagMicrobe" },
      tagPlant: { classes: "tracker badge tracker_tagPlant" },
      tagAnimal: { classes: "tracker badge tracker_tagAnimal" },
      tagJovian: { classes: "tracker badge tracker_tagJovian" },
      tagBuilding: { classes: "tracker badge tracker_tagBuilding" },
      opp_tagSpace: { classes: "tracker badge tracker_tagSpace",redborder: 'resource' },
      tagSpace: { classes: "tracker badge tracker_tagSpace" },
      tagEvent: { classes: "tracker badge tracker_tagEvent" },
      onPay_tagEarth: { classes: "tracker badge tracker_tagEarth" },
      tagEarth: { classes: "tracker badge tracker_tagEarth" },
      "[1,](sell)": { classes: "" },
      onPay_cardSpace: { classes: "tracker badge tracker_tagSpace" },
      onPay_card: { classes: "empty" },
      twopoints: { classes: "txtcontent", content: ':' },
      play_stan: { classes: "txtcontent", content: 'Standard projects' },
      star: { classes: "txtcontent", content: '*' },

      res_Science: { classes: "token_img tracker_resScience" },
      res_Animal: { classes: "token_img tracker_resAnimal" },
      res_Microbe: { classes: "token_img tracker_resMicrobe" },

      nores_Animal: { classes: "token_img tracker_resAnimal", redborder: 'resource', norepeat: true },
      nores_Microbe: { classes: "token_img tracker_resMicrobe", redborder: 'resource', norepeat: true },

      ores_Microbe: { classes: "token_img tracker_resMicrobe", after: '*', norepeat: true },
      ores_Animal: { classes: "token_img tracker_resAnimal", after: '*', norepeat: true },

      special_tagmicrobe_half: { classes: "tracker badge tracker_tagMicrobe", content: "2", norepeat: true },

      res: { classes: "token_img tracker_res%res%", norepeat: true },
      nres: { classes: "token_img tracker_res%res%", norepeat: true },
      nmu: { classes: "token_img tracker_m nmu", negative: true, content: "1", exp: "token_img tracker_u" },
      nms: { classes: "token_img tracker_m nms", negative: true, content: "1", exp: "token_img tracker_s" },

      npe: { classes: "token_img tracker_e", negative: true, production: true },
      npm: { classes: "token_img tracker_m", negative: true, production: true, content: "1" },
      npu: { classes: "token_img tracker_u", negative: true, production: true },
      nps: { classes: "token_img tracker_s", negative: true, production: true },
      npp: { classes: "token_img tracker_p", negative: true, production: true },
      nph: { classes: "token_img tracker_h", negative: true, production: true },


      ne: { classes: "token_img tracker_e", negative: true },
      nm: { classes: "token_img tracker_m", negative: true, content: "1" },
      nu: { classes: "token_img tracker_u", negative: true },
      ns: { classes: "token_img tracker_s", negative: true },
      np: { classes: "token_img tracker_p", negative: true },
      nh: { classes: "token_img tracker_h", negative: true },

      pe: { classes: "token_img tracker_e", production: true },
      pm: { classes: "token_img tracker_m", production: true, content: "1" },
      pu: { classes: "token_img tracker_u", production: true },
      ps: { classes: "token_img tracker_s", production: true },
      pp: { classes: "token_img tracker_p", production: true },
      ph: { classes: "token_img tracker_h", production: true },
      tr: { classes: "token_img tracker_tr" },
      e: { classes: "token_img tracker_e" },
      m: { classes: "token_img tracker_m", content: "1" },
      u: { classes: "token_img tracker_u" },
      s: { classes: "token_img tracker_s" },
      p: { classes: "token_img tracker_p" },
      h: { classes: "token_img tracker_h" },
      t: { classes: "token_img temperature_icon" },
      w: { classes: "token_img tracker_w" },
      o: { classes: "token_img oxygen_icon" },
      ":": { classes: "action_arrow" },
    };

    public static parseExprToHtml(expr: any, card_num?: number, action_mode: boolean = false, effect_mode: boolean = false): string {

      let rethtm = '';


      if (!expr || expr.length < 1) return '';

      if (!action_mode && !effect_mode) {
        if (card_num && this['customcard_rules_'+card_num]) {
          return this['customcard_rules_'+card_num]();
        }
      }
      else if (action_mode==true) {
        if (card_num && this['customcard_action_'+card_num]) {
          return this['customcard_action_'+card_num]();
        }
      }
      else if (effect_mode==true) {
        if (card_num && this['customcard_effect_'+card_num]) {
          return this['customcard_effect_'+card_num]();
        }
      }

      //patch
      let items = this.parseExprItem(expr,0);
      let prodgains = [];
      let prodlosses = [];
      let gains = [];
      let losses = [];


      for (let parse of items) {
        //group by type
        if (parse != null) {
          if (action_mode == true || effect_mode == true) {
            //simpler : gains -> losses
            if (parse.group == "ACTION_SPEND") {
              losses.push({ item: parse, qty: parse.qty });
            } else {
              //card patches
              if (card_num == 20) parse.qty = -1;
              if (card_num == 105) parse.qty = -3;
              if ([70,79,94,150,166].includes(card_num)) parse.qty = -2;

              gains.push({ item: parse, qty: parse.qty });
            }
          } else {
            //card patches
            if (card_num == 19) parse.norepeat=true;
            if (card_num == 152) parse.qty = -99;

            if (parse.negative && parse.production) {
              prodlosses.push({ item: parse, qty: parse.qty });
            } else if (!parse.negative && parse.production) {
              prodgains.push({ item: parse, qty: parse.qty });
            } else if (parse.negative && !parse.production) {
              losses.push({ item: parse, qty: parse.qty });
            } else if (!parse.negative && !parse.production) {
              gains.push({ item: parse, qty: parse.qty });
            }
          }


        }
      }




      if (action_mode==true || effect_mode==true) {
        rethtm+='<div class="card_icono icono_losses cnt_losses"><div class="outer_gains">';
        rethtm+=this.parseRulesToHtmlBlock(losses);
        rethtm+='</div></div>'
        if (action_mode==true) rethtm+='<div class="action_arrow"></div>'; else rethtm+='<div class="effect_separator">:</div>';
        rethtm+='<div class="card_icono icono_gains cnt_gains"><div class="outer_gains">';
        rethtm+=this.parseRulesToHtmlBlock(gains);
        rethtm+='</div></div>'
      } else {
        //rules mode
        let blocks=0;

        //losses first
        if (losses.length>0) {
          rethtm+='<div class="card_icono icono_losses cnt_losses"><div class="outer_gains"><div class="plusminus">-</div>';
          rethtm+=this.parseRulesToHtmlBlock(losses);
          rethtm+='</div></div>'
          blocks++;
        }

        if (prodgains.length>0 || prodlosses.length>0){
          rethtm+='<div class="card_icono icono_prod"><div class="outer_production">';
          if (prodlosses.length>0) {
            rethtm+='<div class="production_line cnt_losses"><div class="plusminus">-</div>';
            rethtm+=this.parseRulesToHtmlBlock(prodlosses);
            rethtm+='</div>'
          }
          if (prodgains.length>0) {
              rethtm+='<div class="production_line cnt_gains">';
              if (prodlosses.length>0 && !action_mode) rethtm+='<div class="plusminus">+</div>';
              rethtm+=this.parseRulesToHtmlBlock(prodgains);
              rethtm+='</div>'
         }
          rethtm+='</div></div>'
          blocks++;
        }

        if (gains.length>0) {
          rethtm+='<div class="card_icono icono_gains cnt_gains"><div class="outer_gains">';
          if (losses.length>0) rethtm+='<div class="plusminus">+</div>';
          rethtm+=this.parseRulesToHtmlBlock(gains);
          rethtm+='</div></div>'
          blocks++;
        }



      }

      return rethtm;

    }

    public static parseExprItem(expr: any,depth:number): any {
      if (!expr) return [];

      if (!Array.isArray(expr)) {
        expr = [expr];
      }
      let items = [];

      const op = expr[0];
      const min = (expr.length > 1) ? expr[1] : "";
      const max = (expr.length > 2) ? expr[2] : "";
      const arg1 = (expr.length > 3) ? expr[3] : "";

      //simple op, one resource gain
      if (expr.length == 1) {

        //special patch
        if (op == "play_cardSpaceEvent") {
          items.push(this.getParse('tagSpace',depth));
          items.push(this.getParse('tagEvent',depth));
        } else if (op == "acard5") {
          items.push(this.getParse('tagMicrobe',depth));
          items.push(this.getParse('star',depth));
          items.push(this.getParse('twopoints',depth));
          items.push(this.getParse('res_Science',depth));

        } else {
          items.push(this.getParse(op,depth));
        }


      } else if (op == '!') {
        if (arg1 != "") {
          let item = this.getParse(arg1,depth);
          if (item != null) {
            item.qty = max;
            items.push(item);
          }

        }
      } else if (op == ',' && arg1.includes('counter(')) {
        let retSrcs = this.parseExprItem(expr[3],depth+1);
        let retGains = this.parseExprItem(expr[4],depth+1);
        let isProd = false;
        for (let retGain of retGains) {
          if (retGain.production == true) isProd = true;
          items.push(retGain);
        }
        for (let retSrc of retSrcs) {
          retSrc.group = "FOREACH";
          if (isProd) retSrc.production = true;
          items.push(retSrc);
        }
      } else if (op == "," || op == ";") {
        for (let i = 3; i < expr.length; i++) {
          for (let ret of this.parseExprItem(expr[i],depth+1)) items.push(ret);
        }
      } else if (op == "/") {
        for (let i = 3; i < expr.length; i++) {
          //    items.push(this.parseExprItem(expr[i],true));
          for (let ret of this.parseExprItem(expr[i],depth+1)) {
            if (ret != null) {
              ret.divider = "OR";
              items.push(ret);
            }

          }
        }
      } else if (op == ":") {
        let retSrcs = this.parseExprItem(expr[3],depth+1);
        let retGains = this.parseExprItem(expr[4],depth+1);
        for (let retSrc of retSrcs) {
          retSrc.group = "ACTION_SPEND";
          items.push(retSrc);
        }
        for (let retGain of retGains) {
          retGain.group = "ACTION_GAIN";
          items.push(retGain);
        }

      }

      return items;
    }

    public static getParse(item: string,depth:number=0): any {
      let parse = null;

      if (item.includes('counter(')) {
        item = item.replace('counter(', '').replace(')', '');
      }

      item = item.replace('ores(Microbe)', 'ores_Microbe');
      item = item.replace('ores(Animal)', 'ores_Animal');


      item = item.replace("counter('(tagPlant>=3)*4')", 'special_tagplant_sup3');
      item = item.replace("tagMicrobe/2", 'special_tagmicrobe_half');
      item = item.replace("ph,0", 'ph');


      item = item.replace(/\([^)]*\)/g, '(*)');

      if (this.parses[item]) {
        parse = Object.assign({}, this.parses[item]);
      } else if (this.parses[item.replace('_Any', '')]) {
        parse = Object.assign({}, this.parses[item.replace('_Any', '')]);
        parse.redborder = "resource";
      } else if (this.parses[item.replace('play_', '')]) {
        parse = Object.assign({}, this.parses[item.replace('play_', '')]);
      } else if (this.parses[item.replace('place_', '')]) {
        parse = Object.assign({}, this.parses[item.replace('place_', '')]);
        parse.redborder = 'hex';
      } else if (this.parses[item.replace('(*)', '')]) {
        parse = Object.assign({}, this.parses[item.replace('(*)', '')]);
        parse.after = '*';
      } else {
        //unknown parse
        //this.darhflog('UNKNOWN PARSE :',item);
        parse = { class: 'unknown', content: item };
      }
      parse.depth=depth;
      return parse;
    }

    public static parseRulesToHtmlBlock(items:any):string {
      let rethtm='';
      let foundor=false;
      for (let n of items) {
        if (n.item.divider && n.item.divider=="OR") {
          if (!foundor) {
            foundor=true;
          //  rethtm+='<div class="breaker"></div>';
          } else {
            rethtm+=_('OR')+'&nbsp;';
          }
        }
        //if (n.qty>1) rethtm+=n.qty+'&nbsp;';
        if (n.item.group && n.item.group=="FOREACH" && items[0]!=n) rethtm+='&nbsp;/&nbsp;';
        rethtm+=this.parseSingleItemToHTML(n.item,n.qty);
      }
      return rethtm;
    }

    public static parseSingleItemToHTML(item:any,qty?:number):string {
      let ret="";
      let content = item.content != undefined ? item.content : "";

      if (item.content!="" && item.classes=="txtcontent") item.content=_(item.content);

      if (content=="1" && qty!=null) {
        content=qty;
        if (qty==-99) content='X';
      } else if (qty!=null && (qty>3 || item.norepeat==true)) {
        ret=qty+'&nbsp;';
      } else if (qty==-99) {
        ret=ret+'X&nbsp;';
      }


      let before = item.before!= undefined ? '<div class="before">'+item.before+'</div>&nbsp;' : "";
      let after = item.after!= undefined ? item.after : "";
      //little resource for nmu & nms
      if (item.exp) {
        after='<div class="resource_exponent"><div class="' + item.exp + '"></div></div>';
      }

      let resicon=  before+'<div class="cnt_media ' + item.classes + ' depth_'+item.depth+'">'+content+'</div>'+after;
      if (item.redborder) {
        const redborderclass=item.classes.includes('tile') || item.classes.includes('city') || item.classes.includes('forest') || item.classes.includes('tracker_w')  ? 'hex' : 'resource';
        resicon = '<div class="outer_redborder redborder_'+redborderclass+'">'+resicon+'</div>';
      }
      if (item.production === true) {
        resicon = '<div class="outer_production">'+resicon+'</div>';
      }
      ret =ret+resicon;

      /*
      if (item.production === true) {
         ret =ret+ '<div class="outer_production"><div class="cnt_media ' + item.classes + '">' + content + "</div>"+after+"</div>";
      } else if (item.redborder) {
        const redborderclass=item.classes.includes('tile') || item.classes.includes('city') || item.classes.includes('forest') ? 'hex' : 'resource';
        ret =ret+  '<div class="outer_redborder redborder_'+redborderclass+'"><div class="cnt_media ' + item.classes + '">' + content + "</div>"+after+"</div>";
      } else {
        ret =ret+  '<div class="cnt_media ' + item.classes + '">'+content+'</div>'+after;
      }

       */
      if (qty!=null && qty>1 &&  qty<=3 && item.content!="1" && !item.norepeat) {
        ret = ret.repeat(qty)
      }

      return ret;
    }

    public static  parseActionsToHTML(actions: string,optional_content?:string) {
      let ret = actions;
      let idx = 0;
      let finds = [];
      for (let key in this.parses) {
        let item = this.parses[key];

        if (ret.includes(key)) {
          ret = ret.replace(key, "%" + idx + "%");
          let content = item.content != undefined ? item.content : "";
          if (optional_content) content=optional_content;
          let after = item.after!= undefined ? item.after : "";

          if (item.production === true) {
            finds[idx] = '<div class="outer_production"><div class="' + item.classes + '">' + content + "</div>"+after+"</div>";
          } else if (item.redborder) {
            finds[idx] = '<div class="outer_redborder redborder_'+item.redborder+'"><div class="' + item.classes + '">' + content + "</div>"+after+"</div>";
          } else {
            finds[idx] = '<div class="' + item.classes + '">'+ content +'</div>'+after;
          }

          idx++;
        }
      }

      //remove ";" between icons
      ret = ret.replace("%;%", "%%");

      //replaces
      for (let key in finds) {
        let htm = finds[key];
        ret = ret.replace("%" + key + "%", htm);
      }

      return ret;
    }


   public static parsePrereqToHTML(pre: any) {
     if (!pre) return "";
     let op = "";
     let what = "";
     let qty=0;

     if (typeof pre === "string") {
       op = ">=";
       what = pre;
       qty = 1;
     } else if (Array.isArray(pre)) {
       if (pre.length < 3) {
         return "?";
       } else {
         op = pre[0];
         what = pre[1];
         qty = pre[2];
       }
       if (typeof what !== "string") {
         what = this.parsePrereqToHTML(what);
       }
     } else if (!pre) {
       return "";
     } else {
       return "?";
     }



     let suffix="";
     let icon=CustomRenders.parseActionsToHTML(what);
     switch (what) {
       case "o":
         suffix="%";
         break;
       case "t":
         suffix="°C";
         break;
       case "tagScience":
         break;
       case "tagEnergy":
         break;
       case "forest":
         break;
       case "w":
         break;
     }

     let mode="min";
     let prefix="";

     if (op=="<=") {
       mode="max";
       prefix="max ";
     }


     let qtys:string;
     qtys=qty.toString();
     if (qty==0 && what!="o" && what!="t") qtys="";
     let htm='<div class="prereq_content mode_'+mode+'">'+prefix+qtys+suffix+icon+'</div></div>';

     return  htm;

   }


   public static parsePrereqToText(pre: any, game: GameXBody) {
     if (!pre) return "";
     let op = "";
     let what = "";
     let qty=0;

     if (typeof pre === "string") {
       op = ">=";
       what = pre;
       qty = 1;
     } else if (Array.isArray(pre)){
       if (pre.length < 3) {
         return "?";
       } else {
         op = pre[0];
         what = pre[1];
         qty = pre[2];
       }
       if (typeof what !== "string") {
         what = this.parsePrereqToText(what, game);
       }
     } else if (!pre) {
        return "";
     } else {
        return "?";
     }

     let mode = "min";
     if (op == "<=") {
       mode = "max";
     }
     let ret='';
     switch (what) {
       case "o":
         ret = mode == "min" ? _("Requires $v% Oxygen.") : _("Oxygen must be $v% or less.");
         break;
       case "t":
         ret = mode == "min" ? _("Requires $v°C or warmer.") : _("It must be $v°C or colder.");
         break;
       case "w":
         ret = mode == "min" ? _("Requires $v ocean/s tiles.") : _("$v ocean/s tiles or less.");
         break;
       case "forest":
         if (qty==0) qty=1;
         ret = _("Requires $v forest/s tiles.");
         break;
       case "all_city":
         ret = _("Requires $v citie/s in play.");
         break;
       case "ps":
         ret = _("Requires that you have steel production.");
         break;
       case "pu":
         ret = _("Requires that you have titanium production.");
         break;
       default:
         if (what.startsWith("tag")) {
           if (qty == 1) {
             ret = _("Requires a $tag tag.");
           } else {
             ret = _("Requires $v $tag tags.");
           }

           ret = ret.replace("$tag", game.getTokenName(what));
           break;
         } else {
           ret = "NOT FOUND :" + what;
         }
         break;
     }
     ret =ret.replace('$v',String(qty));
     return  ret;
   }



   //custom card stuff
   private static customcard_vp_5() {
     return this.parseSingleItemToHTML(this.getParse('res_Science',0),1)+'<div class="vp_qty">*:3</div>';
   }

   private static customcard_action_6() {
     return '<div class="groupline">'+this.parseSingleItemToHTML(this.getParse(':',0),1)+_('ACTION:LOOK AT THE TOP CARD AND EITHER BUY IT OR DISCARD IT')+'</div>';
   }


   private static customcard_action_7() {
    return  '<div class="card_icono icono_losses cnt_losses"><div class="outer_gains"><div class="cnt_media token_img tracker_e depth_1"></div></div></div><div class="action_arrow"></div><div class="card_icono icono_gains cnt_gains"><div class="outer_gains"><div class="cnt_media token_img tracker_m depth_2">1</div> / <div class="outer_redborder redborder_hex"><div class="cnt_media tracker tracker_city depth_2"></div></div>*</div></div>'
   }

   private static customcard_vp_8() {
     return '<div class="vp_qty">1/</div>'+this.parseSingleItemToHTML(this.getParse('w',0),1)+'<div class="vp_qty">*</div>';
   }
   private static customcard_vp_12() {
     return '<div class="vp_qty">1/</div>'+this.parseSingleItemToHTML(this.getParse('tagJovian',0),1);
   }
   private static customcard_vp_24() {
     return '<div class="vp_qty">1/</div>'+this.parseSingleItemToHTML(this.getParse('res_Animal',0),1);
   }

   private static customcard_effect_25() {
     return '<div class="card_icono icono_losses cnt_losses"><div class="outer_gains"><div class="cnt_media tracker badge tracker_tagSpace depth_1"></div></div></div><div class="effect_separator">:</div><div class="card_icono icono_gains cnt_gains"><div class="outer_gains"><div class="cnt_media token_img tracker_m depth_1">-2</div></div></div>';
   }

   private static customcard_vp_28() {
     return '<div class="vp_qty">1/</div><div class="cnt_media token_img tracker_resFighter depth_1"></div>';
   }

   private static customcard_action_33() {
      return '<div class="groupline">'+this.parseSingleItemToHTML(this.getParse(':'),1)+this.parseSingleItemToHTML(this.getParse('res_Microbe'),1)+'</div>'
        +'<div class="groupline">OR&nbsp;'+this.parseSingleItemToHTML(this.getParse('res_Microbe'),2)+this.parseSingleItemToHTML(this.getParse(':'),1)+this.parseSingleItemToHTML(this.getParse('o'),1)+'</div>'
   }

   private static customcard_action_34() {
     return '<div class="groupline">'+this.parseSingleItemToHTML(this.getParse(':',0),1)+this.parseSingleItemToHTML(this.getParse('res_Microbe',0),1)+'</div>'
       +'<div class="groupline">OR&nbsp;'+this.parseSingleItemToHTML(this.getParse('res_Microbe',1),2)+this.parseSingleItemToHTML(this.getParse(':',0),1)+this.parseSingleItemToHTML(this.getParse('t',0),1)+'</div>'
   }

   private static customcard_vp_35() {
     return '<div class="vp_qty">1/2</div>'+this.parseSingleItemToHTML(this.getParse('res_Microbe',0),1);
   }

   private static customcard_rules_37() {
     return '<div class="card_icono icono_prod">' +
       '<div class="outer_production">'
       +'<div class="groupline">'
          +this.parseSingleItemToHTML(this.getParse('pp',),1)+'&nbsp;OR'
       +'</div>'
       +'<div class="groupline">'
        +'3&nbsp;'+this.parseSingleItemToHTML(this.getParse('tagPlant'),1)+':'+this.parseSingleItemToHTML(this.getParse('pp',0),4)
       +'</div>'
       +'</div>'
       +'</div>'
       +'<div class="card_icono icono_gains cnt_gains">'
         +'<div class="outer_gains">'+this.parseSingleItemToHTML(this.getParse('tr',0),2)+this.parseSingleItemToHTML(this.getParse('t',0),1)
        +'</div>'
       +'</div>'
   }

   private static customcard_vp_49() {
     return '<div class="vp_qty">1/4</div>'+this.parseSingleItemToHTML(this.getParse('res_Microbe',0),1);
   }

   private static customcard_rules_50() {
     return  '<div class="card_icono icono_gains cnt_gains">' +
                  '<div class="outer_gains">' +
       '              <div class="plusminus">-</div>' +
       '              2&nbsp;<div class="outer_redborder redborder_resource">' +
       '                        <div class="cnt_media token_img tracker_resAnimal depth_1"></div>' +
       '                     </div>' +
       '&nbsp;0R&nbsp;' +
         '            <div class="plusminus">-</div>' +
         '            5&nbsp;' +
         '            <div class="outer_redborder redborder_resource">' +
         '                <div class="cnt_media token_img tracker_p depth_1"></div>' +
         '            </div>' +
       '          </div>'+
       '     </div>' ;
     //  '<div class="card_tt">'+_('Remove up to 2 animals or 5 plants from any player.')+'</div>';

   }
   private static customcard_vp_52() {
     return '<div class="vp_qty">1/</div>'+this.parseSingleItemToHTML(this.getParse('res_Animal',0),1);
   }
   private static customcard_vp_54() {
     return '<div class="vp_qty">1/2</div>'+this.parseSingleItemToHTML(this.getParse('res_Animal',0),1);
   }

   private static customcard_action_69() {
    return '<div class="card_action_line card_action_icono"><div class="card_icono icono_losses cnt_losses"><div class="outer_gains">'+this.parseSingleItemToHTML(this.getParse('p',0),1)+'&nbsp;/&nbsp;'+this.parseSingleItemToHTML(this.getParse('s',0),1)+'</div></div><div class="action_arrow"></div><div class="card_icono icono_gains cnt_gains"><div class="outer_gains">'+this.parseSingleItemToHTML(this.getParse('m',0),7)+'</div></div></div>';
   }

   static customcard_action_71() {
     return '<div class="card_action_line card_action_icono"><div class="card_icono">' +
       '<div class="outer_gains">'+this.parseSingleItemToHTML(this.getParse('u',0),1)+'&nbsp;:&nbsp;+'+this.parseSingleItemToHTML(this.getParse('m',0),1)+'</div>' +
       '<div class="outer_gains">'+this.parseSingleItemToHTML(this.getParse('s',0),1)+'&nbsp;:&nbsp;+'+this.parseSingleItemToHTML(this.getParse('m',0),1)+'</div>' +
       '</div></div>';
   }

   private static customcard_vp_72() {
     return '<div class="vp_qty">1/</div>'+this.parseSingleItemToHTML(this.getParse('res_Animal',0),1);
   }


   private static  customcard_effect_74() {
     return '<div class="groupline">'
       +this.parseSingleItemToHTML(this.getParse('tagPlant',0),1) +'/'+this.parseSingleItemToHTML(this.getParse('tagMicrobe',0),1)+'/'+this.parseSingleItemToHTML(this.getParse('tagAnimal',0),1)
       +'&nbsp;:&nbsp;'
       +this.parseSingleItemToHTML(this.getParse('p',0),1)+'/'+this.parseSingleItemToHTML(this.getParse('res_Microbe',0),1)+'<div class="resource_exponent">*</div>/'+this.parseSingleItemToHTML(this.getParse('res_Animal',0),1)+'<div class="resource_exponent">*</div>'
       +'</div>';
   }
   private static customcard_vp_81() {
     return '<div class="vp_qty">1/</div>'+this.parseSingleItemToHTML(this.getParse('tagJovian',0),1);
   }
   private static customcard_vp_85() {
     return '<div class="vp_qty">1/</div><div class="outer_redborder redborder_hex"><div class="cnt_media tracker tracker_city depth_2"></div></div>'+'<div class="vp_qty">*</div>';
   }
   private static  customcard_rules_86() {
     return  '<div class="groupline">'+_('COPY A %i').replace('%i',
       '<div class="card_icono icono_prod"><div class="outer_production"><div class="production_line cnt_gains"><div class="outer_production"><div class="badge tag_Building"></div></div></div></div></div>')
     +'</div>';
   }

   private static customcard_vp_92() {
     return '<div class="vp_qty">1/</div>'+this.parseSingleItemToHTML(this.getParse('tagJovian',0),1);
   }
   private static customcard_vp_95() {
     return '<div class="vp_qty">2/</div>'+this.parseSingleItemToHTML(this.getParse('res_Science',0),1);
   }

   private static  customcard_rules_102() {
     return '<div class="groupline"><div class="card_icono icono_prod"><div class="outer_production"><div class="production_line cnt_gains"><div class="outer_production">'+this.parseSingleItemToHTML(this.getParse('e',0),1)+'&nbsp;/&nbsp;'+this.parseSingleItemToHTML(this.getParse('tagEnergy',0),1)+'</div></div></div></div></div>';
   }
   private static  customcard_action_110() {
     return '<div class="action_arrow"></div><div class="outer_gains">' +
       _('ACTION : LOOK AT THE TOP CARD AND EITHER BUY IT OR DISCARD IT') +
       '</div>';
   }

   private static customcard_rules_121() {
     return '<div class="card_icono icono_losses cnt_losses"><div class="outer_gains"><div class="plusminus">-</div>3<div class="outer_redborder redborder_resource">'+this.parseSingleItemToHTML(this.getParse('u',0),1)+'</div>&nbsp;OR&nbsp;4&nbsp;<div class="outer_redborder redborder_resource">'+this.parseSingleItemToHTML(this.getParse('s',0),1)+'</div>OR&nbsp;<div class="plusminus">-</div><div class="outer_redborder redborder_resource">'+this.parseSingleItemToHTML(this.getParse('m',0),7)+'</div></div></div><div class="card_icono icono_gains cnt_gains"></div>';
   }

   private static customcard_rules_124() {
     return '<div class="card_icono icono_losses cnt_losses"><div class="outer_gains">'+_('STEAL')+'&nbsp;2&nbsp;<div class="outer_redborder redborder_resource">'+this.parseSingleItemToHTML(this.getParse('s',0),1)+'</div></div><div class="outer_gains">'+_('OR STEAL ')+'&nbsp;<div class="outer_redborder redborder_resource">'+this.parseSingleItemToHTML(this.getParse('m',0),3)+'</div></div></div>';
   }
   private static customcard_effect_128() {
     return '<div class="groupline">'
       +this.parseSingleItemToHTML(this.getParse('tagPlant',0),1) +'&nbsp;/&nbsp;'+this.parseSingleItemToHTML(this.getParse('tagAnimal',0),1)
       +'&nbsp;:&nbsp;'
       +this.parseSingleItemToHTML(this.getParse('res_Animal',0),1)
       +'</div>'
   }

   private static customcard_vp_128() {
     return '<div class="vp_qty">1/2</div>'+this.parseSingleItemToHTML(this.getParse('res_Animal',0),1);
   }


   private static customcard_effect_131() {
     return '<div class="groupline">'
       +this.parseSingleItemToHTML(this.getParse('tagPlant',0),1) +'&nbsp;/&nbsp;'+this.parseSingleItemToHTML(this.getParse('tagAnimal',0),1)+'&nbsp;/&nbsp;'+this.parseSingleItemToHTML(this.getParse('tagMicrobe',0),1)
       +'&nbsp;:&nbsp;'
       +this.parseSingleItemToHTML(this.getParse('res_Microbe',0),1)
       +'</div>'
   }

   private static customcard_vp_131() {
     return '<div class="vp_qty">1/3</div>'+this.parseSingleItemToHTML(this.getParse('res_Microbe',0),1);
   }


   private static customcard_rules_143() {
     return '<div class="card_icono icono_gains cnt_gains">'
       +this.parseSingleItemToHTML(this.getParse('w'),1)
       +this.parseSingleItemToHTML(this.getParse('draw'),2)
       +'&nbsp;&nbsp;'
       +this.parseSingleItemToHTML(this.getParse('p',0),5)+'&nbsp;/&nbsp;'+this.parseSingleItemToHTML(this.getParse('res_Animal',0),4)+'*'
       +'</div>'
   }

   private static customcard_vp_147() {
     return '<div class="vp_qty">1/2</div>'+this.parseSingleItemToHTML(this.getParse('res_Animal',0),1);
   }


   private static customcard_rules_152() {
     return '<div class="card_icono icono_prod"><div class="outer_production"><div class="production_line cnt_losses"><div class="plusminus">-</div>X&nbsp;<div class="outer_production">'+this.parseSingleItemToHTML(this.getParse('h',0),1)+'</div><div class="plusminus">+</div><div class="outer_production"><div class="cnt_media token_img tracker_m depth_2">X</div></div></div></div></div>';
   }

   private static customcard_rules_153() {
     return '<div class="groupline">'
       +'<div class="prereq_content mode_min">'
       +this.parseSingleItemToHTML(this.getParse('o',0),1) +'&nbsp;/&nbsp;'+this.parseSingleItemToHTML(this.getParse('w',0),1)+'&nbsp;/&nbsp;'+this.parseSingleItemToHTML(this.getParse('t',0),1)
       +'</div>'
       +'&nbsp;:&nbsp;'
       +'+/-2'
       +'</div>'
   }


   private static customcard_action_157() {
     return '<div class="groupline">'+this.parseSingleItemToHTML(this.getParse(':',0),1)+this.parseSingleItemToHTML(this.getParse('res_Microbe',0),1)+'</div>'
       +'<div class="groupline">OR&nbsp;3&nbsp;'+this.parseSingleItemToHTML(this.getParse('res_Microbe',1),1)+this.parseSingleItemToHTML(this.getParse(':',0),1)+this.parseSingleItemToHTML(this.getParse('tr',0),1)+'</div>'
   }

   private static customcard_vp_172() {
     return '<div class="vp_qty">1/2</div>'+this.parseSingleItemToHTML(this.getParse('res_Animal',0),1);
   }


   private static customcard_effect_173() {
     return '<div class="groupline">'+_('OPPONENTS MAT NOT REMOVE YOUR')+'</div>'
     +'<div class="groupline">'+this.parseSingleItemToHTML(this.getParse('p',0),1)+this.parseSingleItemToHTML(this.getParse('res_Animal',0),1)+this.parseSingleItemToHTML(this.getParse('res_Microbe',0),1)+'</div>';

   }

   private static customcard_vp_184() {
     return '<div class="vp_qty">1/</div>'+this.parseSingleItemToHTML(this.getParse('res_Animal',0),1);
   }


   private static customcard_effect_185() {
     return '<div class="card_action_line card_action_icono"><div class="card_icono icono_losses cnt_losses"><div class="outer_gains">'+this.parseSingleItemToHTML(this.getParse('tagScience',0),1)+'</div></div><div class="effect_separator">:</div><div class="card_icono icono_gains cnt_gains"><div class="outer_gains">'+this.parseSingleItemToHTML(this.getParse('res_Science',0),1)+('OR')+'-'+this.parseSingleItemToHTML(this.getParse('res_Science',0),1)+'&nbsp;+<div class=" cnt_media token_img cardback depth_3"></div></div></div></div>';
   }

   private static customcard_vp_198() {
     return '<div class="vp_qty">1/3</div><div class="outer_redborder redborder_hex"><div class="cnt_media tracker tracker_city depth_2"></div></div>';
   }

   private static  customcard_action_194() {
      return '<div class="card_action_line card_action_icono"><div class="card_icono icono_losses cnt_losses"><div class="outer_gains">X<div class="cnt_media token_img tracker_e depth_2"></div></div></div><div class="action_arrow"></div><div class="card_icono icono_gains cnt_gains"><div class="outer_gains"><div class="cnt_media token_img tracker_m depth_2">X</div></div></div></div>';
   }

   private static customcard_effect_206() {
     return '<div class="groupline">'
       +'<div class="prereq_content mode_min">'
       +this.parseSingleItemToHTML(this.getParse('o',0),1) +'&nbsp;/&nbsp;'+this.parseSingleItemToHTML(this.getParse('w',0),1)+'&nbsp;/&nbsp;'+this.parseSingleItemToHTML(this.getParse('t',0),1)
       +'</div>'
       +'&nbsp;:&nbsp;'
       +'+/-2'
       +'</div>';
   }

   private static customcard_rules_207() {
     return  '<div class="card_icono icono_prod"><div class="outer_production"><div class="production_line cnt_gains"><div class="outer_production"><div class="cnt_media token_img tracker_m depth_1">1</div></div>&nbsp;/&nbsp;<div class="outer_production">2'+this.parseSingleItemToHTML(this.getParse('tagBuilding',0),1)+'</div></div></div></div>';
   }
 }
