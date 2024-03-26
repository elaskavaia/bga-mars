enum View {
  Summary = 0,
  Synthetic = 1,
  Stacked = 2,
  Full = 3
}

class CardStack {
  //set props
  tableau_id: string; // id of card stack
  div_id: string;

  //usage props
  current_view: View;
  columns_synth: number = 1;

  public constructor(
    readonly game: GameXBody, // game reference
    readonly localsettings: LocalSettings, // settngs reference
    readonly bin_type: string,
    readonly label: string, //label (translated) of card stack
    readonly player_color: string, //color owner of stack
    readonly card_color_class: string,
    readonly default_view: number, // default layout number
    readonly view_list: number[] = []
  ) {
    this.div_id = "stack_" + player_color + "_" + bin_type;
    this.tableau_id = "tableau_" + player_color + "_" + bin_type;
    this.current_view = parseInt(this.localsettings.readProp(this.div_id, String(default_view)));
    if (view_list.length == 0) {
      view_list.push(View.Summary, View.Synthetic, View.Stacked, View.Full);
    }
  }

  public render(parent: ElementOrId) {
    const header = _("Card Layouts");
    const htm = `
    <div id="${this.div_id}" class="cardstack cardstack_${this.bin_type} ${this.card_color_class}" 
      data-currentview="${this.current_view}">
      <div class="stack_header">
        <div class="stack_header_left">
             <div id="cnt_cards_${this.div_id}" class="stack_sum cards"></div>
        </div>
        <div class="stack_header_middle">
          <div class="topline">
            <div class="stack_label">${this.label}</div>
          </div>
          <div class="bottomline">
            <div id="detail_label_${this.div_id}" class="stack_detail_txt actual_view">N/A</div>
          </div>
        </div>
        <div class="stack_header_right">
           <div id="btn_sv_${this.div_id}" class="stack_btn switchview"></div>
        </div>
        <div id="stack_dd_buttons_${this.div_id}" class="stack_dd_buttons">
          <div id="stack_dd_buttons_${this.div_id}_close" class="stack_dd_buttons_close">
            <span>${header}</span>
            <i class="fa fa-close"></i>
          </div>
        </div>
      </div>          
      <div id="additional_text_${this.div_id}" class="stack_content_txt"></div>
      <div id="${this.tableau_id}" class="stack_content cards_bin ${this.bin_type}" style="--columns-synth=${this.columns_synth};">
      </div>
    </div>`;

    $(parent).insertAdjacentHTML("afterbegin", htm);

    const switchButton = $("btn_sv_" + this.div_id);
    switchButton.classList.add("fa", "fa-align-justify");
    this.game.addTooltip(switchButton.id,_("Card Layouts Menu"),_("Click to select layout"));

    this.game.addTooltip("cnt_cards_" + this.div_id,_("Number of cards in this pile"),"");

    for (let i = 0; i < this.view_list.length; i++) {
      const layout = this.view_list[i];
      const buttonstr = `<div id="btn_switch_${this.div_id}_${layout}" class="stack_btn switch_${layout}">
      <div id="ddl_icon_${this.div_id}_${layout}" class="stack_ddl_icon"></div><div class="stack_ddl_label">${this.getViewLabel(layout)}</div></div>`;
      const laButton = dojo.place(buttonstr, `stack_dd_buttons_${this.div_id}`);
      $(`ddl_icon_${this.div_id}_${layout}`).classList.add("fa", this.getIconClass(layout));

      laButton.addEventListener("click", () => {
        this.onSwitchView(layout);
      });
    }
    $(`stack_dd_buttons_${this.div_id}_close`).addEventListener("click", (evt) => {
      evt.stopPropagation();
      evt.preventDefault();
      $("stack_dd_buttons_" + this.div_id).classList.remove("open");
    });

    switchButton.addEventListener("click", (evt) => {
      evt.stopPropagation();
      evt.preventDefault();
      this.onViewMenu();
    });

    // this is already set during notif
    //triggered when a card is added
    //or a resource (may expand card in synth view)
    const insertListen = (event) => {
      if (
        (event.target.parentNode.id && event.target.parentNode.id == this.tableau_id) ||
        (event.target.id && event.target.id.startsWith("resource_"))
      ) {
        if (this.current_view == View.Synthetic) {
          this.recalSynthColumns();
        }
      }
    };
    $(this.tableau_id).addEventListener("DOMNodeInserted", insertListen);

    this.adjustFromView();
  }

  private getIconClass(layout: View) {
    switch (layout) {
      case View.Summary:
        return "fa-window-close";
      //   case View.Summary: return  "fa fa-align-justify";
      case View.Synthetic:
        return "fa-tablet";
      case View.Stacked:
        return "fa-window-minimize";
      case View.Full:
        return "fa-window-restore";
    }
  }

  private onSwitchView(next: number) {
    const str_next = String(next);
    this.current_view = next;
    $(this.div_id).dataset.currentview = str_next;
    this.localsettings.writeProp(this.div_id, str_next);

    this.onViewMenu(true); // close menu
    this.adjustFromView();
  }

  private onViewMenu(close?: boolean) {
    let self = $("stack_dd_buttons_" + this.div_id);
    let was_open = close;
    if (was_open === undefined) {
      was_open = false;
      if (self.classList.contains("open")) {
        was_open = true;
      }
    }
    // remove all open menus
    document.querySelectorAll(".stack_dd_buttons").forEach((node) => {
      node.classList.remove("open");
    });
    if (!was_open) self.classList.add("open");

    const layout = parseInt($(this.div_id).dataset.currentview);

    const submenu = $(`btn_switch_${this.div_id}_${layout}`);
    document.querySelectorAll(".stack_btn").forEach((node) => node.classList.remove("ma_selected_menu"));
    if (submenu) submenu.classList.add("ma_selected_menu");
  }

  private getNextView(from_view: number) {
    for (let i = 0; i < this.view_list.length - 1; i++) {
      if (this.view_list[i] == from_view) {
        return this.view_list[i + 1];
      }
    }
    return this.view_list[0];
  }

  public reset() {
    this.onSwitchView(this.default_view);
  }

  public adjustFromView() {
    let label: string = "?";
    let additional_txt = "";
    label = this.getViewLabel(this.current_view);
    const toprow = "tableau_toprow_" + this.player_color;

    switch (this.current_view) {
      case View.Summary:
        additional_txt = _("cards are hidden");
        if (!this.game.isLayoutFull()) {
          if ($(this.div_id).parentElement.id != toprow && $(toprow)) {
            $(toprow).appendChild($(this.div_id));
          }
        }
        break;
      default:
        if (!this.game.isLayoutFull()) {
          if ($(this.div_id).parentElement.id == toprow) {
            $("tableau_" + this.player_color).appendChild($(this.div_id));
          }
        }
        break;
    }

    if (this.card_color_class == "red" && (this.current_view == View.Full || this.current_view == View.Stacked)) {
      additional_txt = _("⚠️Events are played face down, tags are not counted.");
    }

    $("detail_label_" + this.div_id).innerHTML = label;
    $("additional_text_" + this.div_id).innerHTML = additional_txt;
    $(this.tableau_id).offsetHeight; // reflow

    if (this.current_view == View.Synthetic) {
      this.recalSynthColumns();
    }
  }

  private getViewLabel(view: number) {
    if (this.bin_type == "cards_4") {
      switch (view) {
        case View.Summary:
          return _("Hidden");
        case View.Synthetic:
          return _("Corporation");
        case View.Stacked:
          return _("Player Board");
        case View.Full:
          return _("Both");
      }
    }
    switch (view) {
      case View.Summary:
        if (!this.game.isLayoutFull()) {
          return _("Hidden");
        } else {
          return _("Single");
        }
      case View.Synthetic:
        return _("Synthetic");
      case View.Stacked:
        return _("Stack");
      case View.Full:
        return _("Grid");
    }

    return "?";
  }

  private updateCounts(): number {
    const count: number = $(this.tableau_id).querySelectorAll(".card").length;
    $("cnt_cards_" + this.div_id).innerHTML = String(count);

    if (this.current_view == View.Summary)
      $("additional_text_" + this.div_id).innerHTML = _("%n card(s) hidden").replace("%n", String(count));

    return count;
  }

  public recalSynthColumns(): void {
    //get last element of list
    if ($(this.tableau_id).children.length == 0) return;

    const last: Element = $(this.tableau_id).lastElementChild;
    let lastrect = last.getBoundingClientRect();
    let tableaurect = $(this.tableau_id).getBoundingClientRect();
    let limit=15; //in case something bad happens, limit to 15 attempts

    while (lastrect.right > tableaurect.right && limit>0) {
      console.log(`adding a new col on ${this.tableau_id}`);
      //add one column
      this.columns_synth++;

      $(this.tableau_id).style.setProperty("--columns-synth", String(this.columns_synth));
       lastrect = last.getBoundingClientRect();
       tableaurect = $(this.tableau_id).getBoundingClientRect();
       limit--;
    }
  }

  public getDestinationDiv() {
    return this.tableau_id;
  }
}
