
class LocalSettings {
   private gameName:string;
   private props:any[];

  constructor(gameName:string,props:any[]) {
    this.gameName=gameName;
    this.props=props;
    /*
    props : array of objects
            key : internal name and dataset ebd-body and css variable name
            label : display label

            -- kind of setting (only one possibility)
                range : value can be any integer between values[0] and values[1] (like a slider)
                choice : value can be one of values[0..X] (like a dropdown)
                         it must be an object of {value1:label1,value2:label2,...}

            default : default value (required)

            example :
            [{key:'cardsize',label:_('Card size'),range:[0.1,1,0.1],default:100},
               {key:'mapsize',label:_('Map size'),range:[0.1,2,0.1],default:100},
               {key:'handtype',label:_('Hand placement'),choice:{ontop:_('On top'), floating:_('Floating')},default:'ontop'}
            ];
     */
  }

  //loads setttings, apply data values to main body
  public setup():void {
    //this.load();
    for (let prop of this.props) {
      prop['value'] = this.readProp(prop.key) ?? prop.default;
      console.log('read prop ',prop.key,' value ', prop['value'], 'read',this.readProp(prop.key));
      $('ebd-body').dataset['localsetting_'+prop.key]= prop.value;
      $('ebd-body').style.setProperty('--localsetting_'+prop.key, prop.value);
    }

    for (let prop of this.props) {
      console.log('confirm', prop['value']);
    }
  }

  public renderButton(parentId:string):Boolean {
    if (!document.getElementById(parentId)) return false;
    if (document.getElementById(this.gameName+'_btn_localsettings')) return false;
    let htm='<div id="'+this.gameName+'_btn_localsettings"></div>';
    document.getElementById(parentId).insertAdjacentHTML("beforeend",htm);
    return true;
  }


  public renderContents(parentId:string):Boolean {
    if (!document.getElementById(parentId)) return false;
    let htm='<div id="'+this.gameName+'_localsettings_window" class="localsettings_window">' +
      '<div class="localsettings_header">'+_('Local Settings')+'</div>'+
      '%contents%' +
      '</div>';

    let htmcontents='';
    for (let prop of this.props) {
      htmcontents=htmcontents+'<div class="localsettings_group">'+
         this.renderProp(prop) +
        '</div>';
    }

    htm = htm.replace('%contents%',htmcontents);
    document.getElementById(parentId).insertAdjacentHTML("beforeend",htm);

    //add interactivity
    for (let prop of this.props) {
      this.actionProp(prop);
    }
  }

  public renderProp(prop:any):string {
    if (prop.range) return this.renderPropRange(prop);
    if (prop.choice) return this.renderPropChoice(prop);
    return '<div>Error:invalid property type</div>';
  }

  public renderPropRange(prop:any):string {
      let htm='<div class="localsettings_prop_label prop_range">'+prop.label+'</div>';
      htm=htm+'<div class="localsettings_prop_range">'
              +'<div id="localsettings_prop_button_minus_'+prop.key+'" class="localsettings_prop_button"><i class="fa fa-search-minus" aria-hidden="true"></i></div>'
                +'<div id="localsettings_prop_rangevalue_'+prop.key+'" class="localsettings_prop_rangevalue">'+prop.value+'</div>'
              +'<div id="localsettings_prop_button_plus_'+prop.key+'" class="localsettings_prop_button"><i class="fa fa-search-plus" aria-hidden="true"></i></div>'
              +'</div>';

      return htm;
  }

  public renderPropChoice(prop:any):string {
    let htm='<div class="localsettings_prop_control prop_choice">'+prop.label+'</div>';

    htm=htm+'<select id="localsettings_prop_'+prop.key+'" class="">';
    for (let idx in prop.choice) {
      const selected = idx==prop.value ? 'selected="selected"' : '';
      htm=htm+'<option value="'+idx+'" '+selected+'>'+prop.choice[idx]+'</option>';
    }
    htm=htm+' </select>';

    return htm;
  }


  private actionProp(prop: any) {
    if (prop.range)  this.actionPropRange(prop);
    if (prop.choice)  this.actionPropChoice(prop);


  }

  private actionPropRange(prop: any) {


    dojo.connect($('localsettings_prop_button_minus_'+prop.key),"onclick",'this', ()=>{
      prop.value=parseFloat(prop.value)-parseFloat(prop.range[2]);
      if (prop.value<= prop.range[0]) prop.value=prop.range[0];
      $('localsettings_prop_rangevalue_'+prop.key).innerHTML=prop.value;

      this.applyChanges(prop);
    });
    dojo.connect($('localsettings_prop_button_plus_'+prop.key),"onclick",'this', ()=>{
      prop.value=parseFloat(prop.value)+parseFloat(prop.range[2]);
      if (prop.value>= prop.range[1]) prop.value=prop.range[1];
      $('localsettings_prop_rangevalue_'+prop.key).innerHTML=prop.value;

      this.applyChanges(prop);
    });
  }

  private actionPropChoice(prop: any) {
    dojo.connect($('localsettings_prop_'+prop.key),"onchange",'this', ()=>{
      // @ts-ignore
      prop.value=$('localsettings_prop_'+prop.key).value;
      this.applyChanges(prop);
    });
  }

  private applyChanges(prop:any) {
    $('ebd-body').dataset['localsetting_'+prop.key]= prop.value;
    $('ebd-body').style.setProperty('--localsetting_'+prop.key, prop.value);

    this.writeProp(prop.key,prop.value);
  }

  public load():Boolean {
    if (!this.readProp('init')) return false;
    return true;
  }
  private readProp(key:string):any {
    return localStorage.getItem(this.gameName+'.'+key);
  }
  private writeProp(key:string,val:any):Boolean {
    try {
      localStorage.setItem(this.gameName+'.'+key,val);
      return  true;
    } catch (e) {
      return  false;
    }
  }



}