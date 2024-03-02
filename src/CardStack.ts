enum View {
  Summary=0,
  Synthetic=1,
  Stacked=2,
  Full=3
}

class CardStack {
  //set props
  tableau_id: string; // id of card stack
  div_id: string;

  //usage props
  current_view: View;

  public constructor(
    readonly game: GameXBody, // game reference
    readonly localsettings: LocalSettings, // settngs reference
    readonly bin_type: string,
    readonly label: string,//label (translated) of card stack
    readonly player_color: string,//color owner of stack
    readonly card_color_class: string,
    readonly default_view: number // default layout number
  ) {
    this.div_id = "stack_" + player_color + "_" + bin_type;
    this.tableau_id = "tableau_" + player_color + "_" + bin_type;
    this.current_view = parseInt(this.localsettings.readProp(this.div_id, String(default_view)));
  }

  public render(parent: ElementOrId) {
    const switchButton = "fa fa-window-restore";
    const htm = `<div id="${this.div_id}" class="cardstack cardstack_${this.bin_type} ${this.card_color_class}" data-currentview="${
      this.current_view
    }">
      <div class="stack_header">
        <div class="stack_header_left">
             <div id="${"cnt_cards_" + this.div_id}"  class="stack_sum cards"></div>
        </div>
        <div class="stack_header_middle">
          <div class="topline">
            <div class="stack_label">${this.label}</div>
          </div>
         <div class="bottomline">
            <div id="${"detail_label_" + this.div_id}" class="stack_detail_txt actual_view">N/A</div>
        </div>
       </div>
       <div class="stack_header_right">
           <div id="${"btn_sv_" + this.div_id}" class="stack_btn switchview ${switchButton}"></div>
        </div>
      </div>          
      <div id="${"additional_text_" + this.div_id}" class="stack_content_txt"></div>
      <div id="${this.tableau_id}" class="stack_content cards_bin ${this.bin_type}">
      </div>
    </div>`;

    $(parent).insertAdjacentHTML("afterbegin", htm);
    $("btn_sv_" + this.div_id).addEventListener("click", (evt) => {
      evt.stopPropagation();
      evt.preventDefault();
      this.onSwitchView();
    });

    // this is already set during notif
    // const insertListen = (event)=> {
    //   if (event.target.parentNode.id && event.target.parentNode.id==this.tableau_id) {
    //     this.updateCounts();
    //   }
    // }
    // $(this.tableau_id).addEventListener("DOMNodeInserted", insertListen);

    this.adjustFromView();
  }

  private onSwitchView() {
    $(this.div_id).dataset.currentview = String(this.getNextView(parseInt($(this.div_id).dataset.currentview)));
    this.current_view = parseInt($(this.div_id).dataset.currentview);

    this.localsettings.writeProp(this.div_id, String(this.current_view));
    this.adjustFromView();
  }

  private getNextView(from_view: number) {
    if (from_view == 3) return 0;
    return from_view + 1;
  }

  private adjustFromView() {
    //TODO: apply stuff like custom column or line breaks according to selected view
    let label: string = "?";
    let additional_txt = "";
    switch (this.current_view) {
      case View.Summary:
        label = _("Hidden view");
        additional_txt = _("cards are hidden");
        break;
      case View.Synthetic:
        label = _("Synthetic view");
        break;
      case View.Stacked:
        label = _("Stacked view");
        break;
      case View.Full:
        label = _("Full view");
        break;
    }

    if (this.card_color_class == "red" && (this.current_view == View.Full || this.current_view == View.Stacked)) {
      additional_txt = _("Events are played face down, tags are not counted.");
    }

    $("detail_label_" + this.div_id).innerHTML = label;
    $("additional_text_" + this.div_id).innerHTML = additional_txt;
  }

  private updateCounts(): number {
    const count: number = $(this.tableau_id).querySelectorAll(".card").length;
    $("cnt_cards_" + this.div_id).innerHTML = String(count);

    if (this.current_view == View.Summary) $("additional_text_" + this.div_id).innerHTML = _("%n card(s) hidden").replace("%n", String(count));

    return count;
  }

  public getDestinationDiv() {
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