enum View {
  summary=0,
  hypersynthetic,
  stacked,
  full
}

class CardStack {
  //set props
  game: GameXBody; // game reference
  localsettings : LocalSettings; // settings tools
  tableau_id: string; // id of card stack
  id:string;
  player_color:string //color owner of stack
  label: string; //label (translated) of card stack
  card_color_class:string;
  default_view:View;

  //usage props
  current_view:View;


  public constructor(game: GameXBody, localsettings:LocalSettings, id: string, label:string,player_color:string,card_color_class:string, default_view:number) {
    this.game = game;
    this.localsettings = localsettings;

    this.id='stack_'+player_color+'_'+id;
    this.tableau_id = 'tableau_'+player_color+'_'+id;
    this.player_color = player_color;
    this.label = label;
    this.card_color_class=card_color_class;

    this.default_view=default_view;
   // this.current_view=this.default_view;

    this.current_view = parseInt( this.localsettings.readProp(this.id, String(default_view)));
  }

  public render(parent:ElementOrId) {
    const htm=`<div id="${this.id}" class="cardstack ${this.card_color_class}" data-currentview="${this.current_view}">
      <div class="stack_header">
        <div class="stack_header_left">
             <div id="${'cnt_cards_'+this.id}"  class="stack_sum cards">0</div>
        </div>
        <div class="stack_header_middle">
          <div class="topline">
            <div class="stack_label">${this.label}</div>
          </div>
         <div class="bottomline">
            <div id="${'detail_label_'+this.id}" class="stack_detail_txt actual_view">N/A</div>
        </div>
       </div>
       <div class="stack_header_right">
           <div id="${'btn_sv_'+this.id}" class="stack_btn switchview"><i class="fa fa-refresh" aria-hidden="true"></i></div>
        </div>
      </div>          
      <div id="${'additional_text_'+this.id}" class="stack_content_txt"></div>
      <div id="${this.tableau_id}" class="stack_content">
      </div>
    </div>`;


    $(parent).insertAdjacentHTML("afterbegin",htm);
    $('btn_sv_'+this.id).addEventListener('click', (evt)=>{
      evt.stopPropagation();
      evt.preventDefault();
      this.onSwitchView();
    });

    const insertListen = (event)=> {
      if (event.target.parentNode.id && event.target.parentNode.id==this.tableau_id) {
        const num=this.updateCounts();
        if (num>0) {
          $(this.id).style.setProperty("--columns", String(Math.ceil(num / 6)));
          if (num % 6 ==0) {
            $(this.tableau_id).removeEventListener("DOMNodeInserted", insertListen);
            $(this.tableau_id).insertAdjacentHTML("beforeend",'<div class="break"></div>');
            $(this.tableau_id).addEventListener("DOMNodeInserted", insertListen);
          }
        }

      }
    }
    $(this.tableau_id).addEventListener("DOMNodeInserted", insertListen);

    this.adjustFromView();
    /*
    dojo.connect('btn_sv_'+this.id,'onclick',(e)=>{
      e.preventDefault();
    });*/
  }


  private onSwitchView() {

    $(this.id).dataset.currentview = String(this.getNextView(parseInt($(this.id).dataset.currentview)));
    this.current_view = parseInt( $(this.id).dataset.currentview);

    this.localsettings.writeProp(this.id,String(this.current_view));
    this.adjustFromView();

  }

  private getNextView(from_view:number) {
    if (from_view==3) return 0;
    return from_view+1;
  }

  private adjustFromView() {
    //TODO: apply stuff like custom column or line breaks according to selected view
    let label:string="?";
    let additional_txt="";
    switch (this.current_view) {
      case  View.summary: label=_("Hidden view"); additional_txt=_("%n card(s) hidden").replace('%n',$('cnt_cards_'+this.id).innerHTML); break;
      case  View.hypersynthetic: label=_("Synthetic view");break;
      case  View.stacked: label=_("Stacked view");break;
      case  View.full: label=_("Full view");break;
    }

    if (this.card_color_class=="red" && (this.current_view==View.full || this.current_view==View.stacked)) {
      additional_txt=_("Events are played face down, tags are not counted.");
    }


    $('detail_label_'+this.id).innerHTML=label;
    $('additional_text_'+this.id).innerHTML=additional_txt;
  }

  private  updateCounts():number {
    const count:number=$(this.tableau_id).querySelectorAll('.card').length;
    $('cnt_cards_'+this.id).innerHTML=String(count);

    if (this.current_view==View.summary) $('additional_text_'+this.id).innerHTML=_("%n card(s) hidden").replace('%n',String(count));

    return count;
  }

  public getDestinationDiv(){
    return this.tableau_id;
  }

  /*setup
      this.vlayout.setupPlayer(playerInfo);

    this.setupPlayerStacks(playerInfo.color);

  setupPlayerStacks(playerColor:string):void {
    const localColorSetting = new LocalSettings(this.getLocalSettingNamespace(this.table_id));

    const oldStacks= [
      'cards_4','cards_2a','cards_2','cards_3vp','cards_3','cards_1vp','cards_1'
    ]
    for (const item of oldStacks) {
      document.getElementById('tableau_'+playerColor+'_'+item).remove();
    }


      const lsStacks=[
      {label:_('Events'),div:"cards_3",color_class:'red',default:0},
      {label:_('Automated'),div:"cards_1",color_class:'green',default:2},
      {label:_('Effects'),div:"cards_2",color_class:'blue',default:3},
      {label:_('Actions'),div:"cards_2a",color_class:'blue',default:3},
    ];
    for (const item of lsStacks) {
      const stack= new CardStack(this,localColorSetting,item.div,item.label,playerColor,item.color_class,item.default);
      stack.render('tableau_'+playerColor);
    }
  }



   */
}