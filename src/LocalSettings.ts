interface LocalProp {
  key: string;
  label: string;
  value?: string;
  range?: {
    min: number;
    max: number;
    inc: number;
  };
  choice?: { [key: string]: string };
  default: string | number | null;
}

class LocalSettings {
  private gameName: string;
  private props: LocalProp[];

  constructor(gameName: string, props: LocalProp[]) {
    this.gameName = gameName;
    this.props = props;
    /*
    props : array of objects
            key : internal name and dataset ebd-body and css variable name
            label : display label

            -- kind of setting (only one possibility)
                range : value can be any integer between values[0] and values[1] (like a slider)
                choice : value can be one of values[0..X] (like a dropdown)
                         it must be an object of {value1:label1,value2:label2,...}

            default : default value (required)

            example : [
        { key: "cardsize", label: _("Card size"), range: { min: 15, max: 200, inc: 5 }, default: 100 },
        { key: "mapsize", label: _("Map size"), range: { min: 15, max: 200, inc: 5 }, default: 100 },
        { key: "handplace", label: _("Hand placement"), choice: { ontop: _("On top"), floating: _("Floating") }, default: "ontop" },
        {
          key: "playerarea",
          label: _("Player zone placement"),
          choice: { before: _("Before Map"), after: _("After Map") },
          default: "after",
        },
      ]);
     */
  }

  //loads setttings, apply data values to main body
  public setup(): void {
    //this.load();
    for (let prop of this.props) {
      let stored = this.readProp(prop.key);
      this.applyChanges(prop, stored, false);
    }
  }

  public renderButton(parentId: string): Boolean {
    if (!document.getElementById(parentId)) return false;
    if (document.getElementById(this.gameName + "_btn_localsettings")) return false;
    let htm = '<div id="' + this.gameName + '_btn_localsettings"></div>';
    document.getElementById(parentId).insertAdjacentHTML("beforeend", htm);
    return true;
  }

  public renderContents(parentId: string): Boolean {
    if (!document.getElementById(parentId)) return false;
    let htm =
      '<div id="' +
      this.gameName +
      '_localsettings_window" class="localsettings_window">' +
      '<div class="localsettings_header">' +
      _("Local Settings") +
      "</div>" +
      "%contents%" +
      "</div>";

    let htmcontents = "";
    for (let prop of this.props) {
      htmcontents = htmcontents + '<div class="localsettings_group">' + this.renderProp(prop) + "</div>";
    }

    htm = htm.replace("%contents%", htmcontents);
    document.getElementById(parentId).insertAdjacentHTML("beforeend", htm);

    //add interactivity
    for (let prop of this.props) {
      this.actionProp(prop);
    }
  }

  public renderProp(prop: LocalProp): string {
    if (prop.range) return this.renderPropRange(prop);
    if (prop.choice) return this.renderPropChoice(prop);
    return "<div>Error: invalid property type</div>";
  }

  public renderPropRange(prop: LocalProp): string {
    let htm = '<div class="localsettings_prop_label prop_range">' + prop.label + "</div>";
    htm =
      htm +
      '<div class="localsettings_prop_range">' +
      '<div id="localsettings_prop_button_minus_' +
      prop.key +
      '" class="localsettings_prop_button"><i class="fa fa-search-minus" aria-hidden="true"></i></div>' +
      '<div id="localsettings_prop_rangevalue_' +
      prop.key +
      '" class="localsettings_prop_rangevalue">' +
      prop.value +
      "</div>" +
      '<div id="localsettings_prop_button_plus_' +
      prop.key +
      '" class="localsettings_prop_button"><i class="fa fa-search-plus" aria-hidden="true"></i></div>' +
      "</div>";

    return htm;
  }

  public renderPropChoice(prop: LocalProp): string {
    let htm = '<div class="localsettings_prop_control prop_choice">' + prop.label + "</div>";

    htm = htm + '<select id="localsettings_prop_' + prop.key + '" class="">';
    for (let idx in prop.choice) {
      const selected = idx == prop.value ? 'selected="selected"' : "";
      htm = htm + '<option value="' + idx + '" ' + selected + ">" + prop.choice[idx] + "</option>";
    }
    htm = htm + " </select>";

    return htm;
  }

  private actionProp(prop: LocalProp) {
    if (prop.range) this.actionPropRange(prop);
    if (prop.choice) this.actionPropChoice(prop);
  }

  private actionPropRange(prop: LocalProp) {
    $("localsettings_prop_button_minus_" + prop.key).addEventListener("click", () => {
      this.applyChanges(prop, parseFloat(prop.value) - prop.range.inc);
    });

    $("localsettings_prop_button_plus_" + prop.key).addEventListener("click", () => {
      this.applyChanges(prop, parseFloat(prop.value) + prop.range.inc);
    });
  }

  private actionPropChoice(prop: LocalProp) {
    $("localsettings_prop_" + prop.key).addEventListener("change", (event) => {
      // @ts-ignore
      this.applyChanges(prop, event.target.value);
    });
  }


  private setSanitizedValue(prop: LocalProp, newvalue: any) {
    if (prop.range) {
      let value = parseFloat(newvalue);
      if (isNaN(value) || !value) value = prop.default as number;
      if (value > prop.range.max) value = prop.range.max;
      if (value < prop.range.min) value = prop.range.min;
      prop.value = String(value);
    } else if (prop.choice) {
      if (!prop.choice[newvalue]) {
        prop.value = String(prop.default);
      } else {
        prop.value = String(newvalue);
      }
    } else {
      if (!newvalue) {
        prop.value = String(prop.default);
      } else {
        prop.value = String(newvalue);
      }
    }
    return prop.value;
  }

  private applyChanges(prop: LocalProp, newvalue: any, write: boolean = true) {
    // sanitize value so bad value is never stored
    let value = this.setSanitizedValue(prop, newvalue);

    if (prop.range) {
      const lvar = "localsettings_prop_rangevalue_" + prop.key;
      if ($(lvar)) $(lvar).innerHTML = value;
    }
    $("ebd-body").dataset["localsetting_" + prop.key] = value;
    $("ebd-body").style.setProperty("--localsetting_" + prop.key, value);
    if (write) this.writeProp(prop.key, value);
  }

  public load(): Boolean {
    if (!this.readProp("init")) return false;
    return true;
  }
  public readProp(key: string): string {
    return localStorage.getItem(this.gameName + "." + key);
  }
  public writeProp(key: string, val: string): Boolean {
    try {
      localStorage.setItem(this.gameName + "." + key, val);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }
}
