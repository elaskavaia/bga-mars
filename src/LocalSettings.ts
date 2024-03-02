interface LocalProp {
  key: string; //internal name and dataset ebd-body and css variable name
  label: string; // label : display label
  value?: string;
  range?: {
    //value can be any integer between values[0] and values[1] (like a slider)
    min: number;
    max: number;
    inc: number;
  };
  choice?: { [key: string]: string | boolean | number }; //value can be one of values[0..X] (like a dropdown)  it must be an object of {value1:label1,value2:label2,...}
  default?: boolean | string | number;
  ui?: "slider" | "checkbox" | undefined | null | false;
}

class LocalSettings {
  constructor(
    private gameName: string,
    private props: LocalProp[] = []
  ) {}

  //loads setttings, apply data values to main body
  public setup(): void {
    //this.load();
    for (let prop of this.props) {
      let stored = this.readProp(prop.key, undefined);
      this.applyChanges(prop, stored, false);
    }
  }

  public getLocalSettingById(key: string) {
    for (let prop of this.props) {
      if (key == prop.key) return prop;
    }
    return null;
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
    let title = _("Local Settings");

    let htmcontents = "";
    for (let prop of this.props) {
      if (prop.ui !== false) htmcontents = htmcontents + '<div class="localsettings_group">' + this.renderProp(prop) + "</div>";
    }

    const restore_tooltip = _("Click to restore to original values");
    let htm = `
      <div id="${this.gameName}_localsettings_window" class="localsettings_window">
         <div class="localsettings_header">${title}<span id="localsettings_restore" title="${restore_tooltip}" class="fa fa-eraser"></span></div>
         ${htmcontents}
      </div>
      `;
    document.getElementById(parentId).insertAdjacentHTML("beforeend", htm);

    //add interactivity
    for (let prop of this.props) {
      if (prop.ui !== false) this.actionProp(prop);
    }

    $("localsettings_restore").addEventListener("click", (event) => {
      const target = event.target as HTMLInputElement;
      this.clear();
      this.setup();
      this.renderContents(parentId);
    });
  }

  public renderProp(prop: LocalProp): string {
    if (prop.range) return this.renderPropRange(prop);
    else return this.renderPropChoice(prop);
  }

  public renderPropRange(prop: LocalProp): string {
    if (!prop.range) return;
    const range = prop.range;
    const inputid = `localsettings_prop_${prop.key}`;
    let valuecontrol = "";
    if (prop.ui == "slider") {
      valuecontrol = `<input type="range" id="${inputid}" name="${inputid}" min="${range.min}" max="${range.max}" step="${range.inc}" value="${prop.value}">`;
    } else {
      valuecontrol = `<div id="${inputid}" class="localsettings_prop_rangevalue">${prop.value}</div>`;
    }

    return `
      <label for="${inputid}" class="localsettings_prop_label prop_range">${prop.label}</label>
      <div class="localsettings_prop_range">
          <div id="localsettings_prop_button_minus_${prop.key}" class="localsettings_prop_button"><i class="fa fa-minus" aria-hidden="true"></i></div>
          ${valuecontrol}
          <div id="localsettings_prop_button_plus_${prop.key}" class="localsettings_prop_button"><i class="fa fa-plus" aria-hidden="true"></i></div>
      </div>`;
  }

  public renderPropChoice(prop: LocalProp): string {
    if (prop.ui == "checkbox") {
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
    if (prop.ui == "slider") {
      $(`localsettings_prop_${prop.key}`).addEventListener("change", (event) => {
        this.doAction(prop, "change", (event.target as HTMLInputElement).value);
      });
    }
    $("localsettings_prop_button_minus_" + prop.key).addEventListener("click", () => {
      this.doAction(prop, "minus");
    });

    $("localsettings_prop_button_plus_" + prop.key).addEventListener("click", () => {
      this.doAction(prop, "plus");
    });
  }

  private actionPropChoice(prop: LocalProp) {
    $(`localsettings_prop_${prop.key}`).addEventListener("click", (event) => {
      const target = event.target as HTMLInputElement;
      this.applyChanges(prop, prop.ui == "checkbox" ? target.checked : target.value);
    });
    return;
  }

  public doAction(prop: LocalProp, action: string, value?: string) {
    switch (action) {
      case "change":
        this.applyChanges(prop, value);
        break;
      case "plus":
        this.applyChanges(prop, parseFloat(prop.value) + prop.range.inc);
        break;
      case "minus":
        this.applyChanges(prop, parseFloat(prop.value) - prop.range.inc);
        break;
    }
  }

  private setSanitizedValue(prop: LocalProp, newvalue: any) {
    if (prop.range) {
      let value = parseFloat(newvalue);
      if (isNaN(value) || !value) value = prop.default as number;
      if (value > prop.range.max) value = prop.range.max;
      if (value < prop.range.min) value = prop.range.min;
      prop.value = String(value);
    } else if (prop.ui == "checkbox") {
      if (newvalue === undefined) newvalue = prop.default;
      if (newvalue) {
        const key = Object.keys(prop.choice)[0];
        prop.value = key ?? String(newvalue);
      } else {
        const key = Object.keys(prop.choice)[1] ?? "";
        prop.value = key;
      }
    } else if (prop.choice) {
      if (newvalue === undefined || !prop.choice[newvalue]) {
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

  public applyChanges(prop: LocalProp, newvalue: any, write: boolean = true) {
    // sanitize value so bad value is never stored
    let value = this.setSanitizedValue(prop, newvalue);

    if (prop.range) {
      const node = $(`localsettings_prop_${prop.key}`) as HTMLInputElement;
      if (node) {
        node.innerHTML = value;
        if (node.value != value) node.value = value;
      }
    }
    $("ebd-body").dataset["localsetting_" + prop.key] = value;
    $("ebd-body").style.setProperty("--localsetting_" + prop.key, value);
    if (write) this.writeProp(prop.key, value);
  }

  public clear() {
    localStorage.clear();
  }

  public getLocalStorageItemId(key: string) {
    return this.gameName + "." + key;
  }

  public readProp(key: string, def: string | undefined): string {
    const value = localStorage.getItem(this.getLocalStorageItemId(key));
    if (value === undefined || value === null) return def;
    return value;
  }

  public writeProp(key: string, val: string): Boolean {
    try {
      localStorage.setItem(this.getLocalStorageItemId(key), val);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }
}
