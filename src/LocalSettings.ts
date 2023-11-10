interface LocalProp {
  key: string; //internal name and dataset ebd-body and css variable name
  label: string; // label : display label
  value?: string;
  range?: {
    //value can be any integer between values[0] and values[1] (like a slider)
    min: number;
    max: number;
    inc: number;
    slider?: boolean;
  };
  choice?: { [key: string]: string }; //value can be one of values[0..X] (like a dropdown)  it must be an object of {value1:label1,value2:label2,...}
  check?: {
    checked?: string;
  };
  default?: boolean | string | number;
  custom?: boolean;
}

class LocalSettings {
  private gameName: string;
  private props: LocalProp[];

  constructor(gameName: string, props: LocalProp[]) {
    this.gameName = gameName;
    this.props = props;
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
    $(parentId)
      .querySelectorAll(".localsettings_window")
      .forEach((node) => {
        dojo.destroy(node); // on undo this remains but another one generated
      });
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
      if (!prop.custom) htmcontents = htmcontents + '<div class="localsettings_group">' + this.renderProp(prop) + "</div>";
    }

    htm = htm.replace("%contents%", htmcontents);
    document.getElementById(parentId).insertAdjacentHTML("beforeend", htm);

    //add interactivity
    for (let prop of this.props) {
      if (!prop.custom) this.actionProp(prop);
    }
  }

  public renderProp(prop: LocalProp): string {
    if (prop.range) return this.renderPropRange(prop);
    else return this.renderPropChoice(prop);
  }

  public renderPropRange(prop: LocalProp): string {
    if (!prop.range) return;
    const range = prop.range;
    const inputid = `localsettings_prop_${prop.key}`;
    if (range.slider) {
      return `
      <label for="${inputid}" class="localsettings_prop_label prop_range">${prop.label}</label>
      <div class="localsettings_prop_range">
      <div id="localsettings_prop_button_minus_${prop.key}" class="localsettings_prop_button"><i class="fa fa-search-minus" aria-hidden="true"></i></div>
      <input type="range" id="${inputid}" name="${inputid}" min="${range.min}" max="${range.max}" step="${range.inc}" value="${prop.value}">
      <div id="localsettings_prop_button_plus_${prop.key}" class="localsettings_prop_button"><i class="fa fa-search-plus" aria-hidden="true"></i></div>
      </div>`;
    }

    return `
      <div class="localsettings_prop_label prop_range">${prop.label}</div>
      <div class="localsettings_prop_range">
      <div id="localsettings_prop_button_minus_${prop.key}" class="localsettings_prop_button"><i class="fa fa-search-minus" aria-hidden="true"></i></div>
      <div id="${inputid}" class="localsettings_prop_rangevalue">
      ${prop.value}
      </div>
      <div id="localsettings_prop_button_plus_${prop.key}" class="localsettings_prop_button"><i class="fa fa-search-plus" aria-hidden="true"></i></div>
      </div>`;
  }

  public renderPropChoice(prop: LocalProp): string {
    if (prop.check) {
      const inputid = `localsettings_prop_${prop.key}`;
      const checked = prop.value === "false" || !prop.value ? "" : "checked";
      return `
      <input type="checkbox" id="${inputid}" name="${inputid}" ${checked}>
      <label for="${inputid}" class="localsettings_prop_label">${prop.label}</label>
      `;
    }

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
    else this.actionPropChoice(prop);
  }

  private actionPropRange(prop: LocalProp) {
    if (!prop.range) return;
    if (prop.range.slider) {
      $(`localsettings_prop_${prop.key}`).addEventListener("change", (event) => {
        this.applyChanges(prop, (event.target as HTMLInputElement).value);
      });
    }
    $("localsettings_prop_button_minus_" + prop.key).addEventListener("click", () => {
      this.applyChanges(prop, parseFloat(prop.value) - prop.range.inc);
    });

    $("localsettings_prop_button_plus_" + prop.key).addEventListener("click", () => {
      this.applyChanges(prop, parseFloat(prop.value) + prop.range.inc);
    });
  }

  private actionPropChoice(prop: LocalProp) {
    $(`localsettings_prop_${prop.key}`).addEventListener("click", (event) => {
      const target = event.target as HTMLInputElement;
      this.applyChanges(prop, prop.check ? target.checked : target.value);
    });
    return;
  }

  private setSanitizedValue(prop: LocalProp, newvalue: any) {
    if (prop.range) {
      let value = parseFloat(newvalue);
      if (isNaN(value) || !value) value = prop.default as number;
      if (value > prop.range.max) value = prop.range.max;
      if (value < prop.range.min) value = prop.range.min;
      prop.value = String(value);
    } else if (prop.choice) {
      if (newvalue === undefined || !prop.choice[newvalue]) {
        prop.value = String(prop.default);
      } else {
        prop.value = String(newvalue);
      }
    } else if (prop.check) {
      if (newvalue) {
        prop.value = prop.check.checked ?? String(newvalue);
      } else if (newvalue === undefined) {
        prop.value = String(prop.default);
      } else {
        prop.value = "";
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

  public applyChanges(prop: LocalProp, newvalue: any, write: boolean = true) {
    // sanitize value so bad value is never stored
    let value = this.setSanitizedValue(prop, newvalue);

    if (prop.range) {
      const lvar = "localsettings_prop_" + prop.key;
      const node = $(lvar);
      if (node) {
        node.innerHTML = value;
        (node as HTMLInputElement).value = value;
      }
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
