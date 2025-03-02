<?php


#Script coverts mars data from one format to another

function addinc(&$rules, $value, $op) {
    if ($value == 'Ref') {
        $rules .= " ${value}_$op";
        return;
    }
    if ($value == 'C' || $value == 0) {
        return;
    }

    $r = '';
    if (strrpos($value, 'R', -1) !== false) { //endsWith
        $r = '_Any';
        $value = substr($value, 0, strlen($value) - 1);
    }
    if ($value > 0) {
        if ($value == 1)
            $rules .= " ${op}${r}";
        else
            $rules .= " ${value}${op}${r}";
        return;
    };
    if ($value < 0) {
        $value = -$value;
        $rules .= " ${value}n${op}${r}";
        return;
    };
    if (!$value) return;
    $rules .= " ${value}__$op";
}

function addpre(&$pre, $ro, $op, $min, $max) {
    if ($ro < $max && $ro > $min)
        $pre .= " $op$ro";
    return;
}

function tomyformat($fields, $raw_fields) {

    //Card Name|Card #|Cost|Card Type|Deck|Req: Temperature|Req: Oxygen|Req: Ocean|Req: Venus|Req: Max Temperature
    //|Req: Max Oxygen|Req: Max Ocean|Req: Max Venus|Pre-requisites (Global)|Req: Science|Req: Building|Req: Space|Req: Microbe|Req: Plant|Req: Animal
    //|Req: City|Req: Earth|Req: Jovian|Req: Energy|Req: Venus|Req: Other|Pre-requisites (Non-Global)|Tag: Science|Tag: Building|Tag: Space
    //|Tag: Microbe|Tag: Plant|Tag: Animal|Tag: City|Tag: Earth|Tag: Jovian|Tag: Energy|Tag: Venus|Tag: Event|Tags
    //|Prod: Megacredit|Prod: Steel|Prod: Titanium|Prod: Plant|Prod: Energy|Prod: Heat|Production|Inv: Megacredit|Inv: Steel|Inv: Titanium
    //|Inv: Plant|Inv: Energy|Inv: Heat|Other (Resources on Cards)|Resource|Temperature|Oxygen|Ocean|Venus|TR
    //|VP|Terraforming Effect|Tile/Colony Placement|# Actions and/or Effect|Depends on opponents|Affects opponents|Holds Resources|Interactions|Action or On-going Effect text|One time Effect Text
    //|Text




    $deck = $fields['Deck'];
    #if (!is_numeric($num)) return;


    $t = 0;
    $type = $fields['Card Type'];
    switch ($type) {
        case 'Automated':
            $t = 1;
            break;
        case 'Event':
            $t = 3;
            break;
        case 'Active':
            $t = 2;
            break;
        case 'Corporation':
            $t = 4;
            break;
        case 'Prelude':
            $t = 5;
            break;
        case 'Colonies':
            $t = 9;
            break;
        default:
            break;
    }



    $num = $fields['Card #'];

    $pre = "";
    addpre($pre, $fields['Req: Oxygen'], 'o>=', 0, 14);
    addpre($pre, $fields['Req: Max Oxygen'], 'o<=', 0, 14);
    addpre($pre, $fields['Req: Temperature'], 't>=', -30, 8);
    addpre($pre, $fields['Req: Max Temperature'], 't<=', -30, 8);
    addpre($pre, $fields['Req: Ocean'], 'w>=', 0, 9);
    addpre($pre, $fields['Req: Max Ocean'], 'w<=', 0, 9);
    $premanual = $fields['Pre-requisites (Non-Global)'];
    if ($premanual)
        $pre = $premanual;
    else
        $pre = trim($pre);

    $rules = "";
    addinc($rules, $fields['Prod: Megacredit'], 'pm');
    addinc($rules, $fields['Prod: Steel'], 'ps');
    addinc($rules, $fields['Prod: Titanium'], 'pu');
    addinc($rules, $fields['Prod: Plant'], 'pp');
    addinc($rules, $fields['Prod: Energy'], 'pe');
    addinc($rules, $fields['Prod: Heat'], 'ph');

    addinc($rules, $fields['Inv: Megacredit'], 'm');
    addinc($rules, $fields['Inv: Steel'], 's');
    addinc($rules, $fields['Inv: Titanium'], 'u');
    addinc($rules, $fields['Inv: Plant'], 'p');
    addinc($rules, $fields['Inv: Energy'], 'e');
    addinc($rules, $fields['Inv: Heat'], 'h');

    addinc($rules, $fields['TR'], 'tr');
    addinc($rules, $fields['Oxygen'], 'o');
    addinc($rules, $fields['Temperature'], 't');
    addinc($rules, $fields['Ocean'], 'w');

    $rules .= " " . $fields['Production'];

    $rules = trim($rules);
    $rules = str_replace('’', "'", $rules);
    $rules = implode(',', explode(' ', $rules));


    $php = [];
    $vp =  $fields['VP'];

    $hold = $fields['Holds Resources'];
    if (str_ends_with($hold, 's')) $hold = substr($hold, 0, strlen($hold) - 1);
    if ($hold && $hold != 'No') $php['holds'] = $hold;
    $eff = $fields['# Actions and/or Effect'];
    $action = "";
    $effect = "";
    if ($eff && $eff != 'No') {
        if ($eff == 'Eff')  $effect = $rules;
        else  $action = $rules;
        $rules = '';
    }

    $tags = [];
    foreach ($fields as $key => $value) {
        $matches = [];
        if (preg_match("/Tag: (.*)/", $key, $matches)) {
            if ($value == 0) continue;
            $tag = $matches[1];
            $tags[] = $tag;
        }
    }
    $phpstr = "";
    if (count($php) > 0) {
        $phpstr = var_export($php, true);
        $phpstr = preg_replace("/[\n\r]/", "", $phpstr);
        $phpstr = preg_replace("/^array \(/", "", $phpstr);
        $phpstr = preg_replace("/\)\s*$/", "", $phpstr);
        $phpstr = preg_replace("/,\s*$/", "", $phpstr);
    }
    $tooltip = $fields['One time Effect Text'];
    $actext = $fields['Action or On-going Effect text'];
    $tooltip = trim($tooltip);
    $actext = trim($actext);
    $effect_text = "";
    if (str_starts_with($actext, "Action: ")) $actext = str_replace("Action: ", "", $actext);
    if (str_starts_with($actext, "Effect: ")) {
        $effect_text = str_replace("Effect: ", "", $actext);
        $actext = "";
    }
    $matches = [];
    $preman = "";
    if (preg_match("/Requires (\d+) (\w+) tag/", $tooltip, $matches)) {
        $count = $matches[1];
        $tag = ucfirst($matches[2]);
        $preman = "tag$tag>=$count";
    } elseif (!$pre && preg_match("/Requires (\d+) colon/", $tooltip, $matches)) {
        $count = $matches[1];
        $preman = "colony>=$count";
    } elseif (!$pre && preg_match("/Requires /", $tooltip, $matches)) {
        $preman = "CUSTOM";
    }
    if ($pre && $preman)
        $pre .= " && $preman";
    else
        $pre = $preman;

    //$num = substr($num,1);
    $cost =  (int) $fields['Cost'];

    $fields = [
        $num,
        $raw_fields[0],
        $t,
        $rules,
        $action,
        $effect,
        $cost,
        $pre,
        implode(' ', $tags),
        $vp,
        $deck,
        $tooltip,
        $actext,
        $effect_text,
        '',
        $phpstr
    ];

    //if ((int)$num > 18) return false;
    return $fields;
}

$g_field_names = null;
//$g_header = 'num|name|t|r|a|e|cost|pre|tags|vp|text|php';
$g_header = 'num|name|t|r|a|e|cost|pre|tags|vp|deck|text|text_action|text_effect|text_vp|php';
$g_separator = "|";
$incsv = $argv[1] ?? "./data.txt";
$ins = fopen($incsv, "r") or die("Unable to open file! $ins");
// new format

#t is color type 1 - green, 2 - blue, 3 - event, 0 - stanard project, 4 - corp, 5 - prelude 
print($g_header."\n");

$prev_t = 0;
$prev_deck = 0;
while (($line = fgets($ins)) !== false) {
    $line = trim($line);
    if (empty($line))
        continue;
    if ($g_field_names == null) {
        $raw_fields = explode($g_separator, $line);
        $limit = count($raw_fields);
        $g_field_names = $raw_fields;
        continue;
    }
    $raw_fields = explode($g_separator, $line);
    $fields = [];
    $f = 0;
    foreach ($g_field_names as $key) {
        if (count($raw_fields) >= $f + 1)
            $fields[$key] = $raw_fields[$f];
        else
            $fields[$key] = null;
        $f++;
    }
    $fields = tomyformat($fields, $raw_fields);
    if ($fields === false) break;
    if ($fields === null) continue;
    $t = $fields[2];
    $deck = $fields[10];
    if ($deck != 'Colonies') continue; // XXX change to filter

    if ($prev_t != $t) {
        switch ($t) {
            case 1:
            case 2:
            case 3:
                if ($prev_t <=3 && $t<= 3 && $prev_t>0) break;
                print("#set id=card_main_{num}\n#set location=deck_main\n");
                break;
            case 4:
                print("#set id=card_corp_{num}\n#set location=deck_corp\n");
                break;
            case 5:
                print("#set id=card_prelude_{num}\n#set location=deck_prelude\n");
                break;
            case 9:
                print("#set id=card_colo_{num}\n#set location=deck_colo\n");
                break;
        }
    }
    $line = implode("|", $fields);
    print($line . "\n");
    $prev_t = $t;
    $prev_deck = $deck;
}
