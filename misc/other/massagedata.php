<?php


#Script coverts mars data from one format to another

function addinc(&$rules, $value, $op) {
    if ($value=='Ref') {
        $rules .= " ${value}_$op";
        return;
    }

    $r = '';
    if (strrpos($value, 'R', -1) !== false) {//endsWith
        $r = 'Any';
        $value = substr($value, 0, strlen($value) - 1);
    }
    if ($value > 0) {
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



    $num = $fields['Card #'];
    $deck = $fields['Deck'];
    if (!is_numeric($num)) return;
    if ($deck != 'Basic' && $deck != 'Corporate') return;

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
        default:
            break;
    }

    if ($t > 3) return;

    $pre = "";
    addpre($pre, $fields['Req: Oxygen'], 'o>=', 0, 14);
    addpre($pre, $fields['Req: Max Oxygen'], 'o<=', 0, 14);
    addpre($pre, $fields['Req: Temperature'], 't>=', -30, 8);
    addpre($pre, $fields['Req: Max Temperature'], 't<=', -30, 8);
    addpre($pre, $fields['Req: Ocean'], 'w>=', 0, 9);
    addpre($pre, $fields['Req: Max Ocean'], 'w<=', 0, 9);
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

    $rules = trim($rules);
    $rules = implode(',', explode(' ', $rules));

    $tooltip = $fields['One time Effect Text'];
    $actext = $fields['Action or On-going Effect text'];
    $tooltip = trim($tooltip);
    $php = [];
    $vp =  $fields['VP'];
    if ($vp && is_numeric($vp)) $php['vp'] = $vp;

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

    $line = sprintf("%d|%s|%d|%s|%d|%s|%s|%s|%s|%s\n", $num, $raw_fields[0], $t, $rules, $fields['Cost'], $pre, implode(' ', $tags), $actext, $tooltip, $phpstr);
    print($line);
    //if ((int)$num > 18) return false;
    return true;
}

$g_field_names = null;
$g_header = 'num|name|t|r|cost|pre|tags|ac|text|php';
$g_separator = "|";
$incsv = $argv[1] ?? "./data.csv";
$ins = fopen($incsv, "r") or die("Unable to open file! $ins");
// new format

print($g_header);
print('
#project cards, t is color type 1 - green, 2 - blue, 3 - event, 0 - stanard project, 4 - corp, 5 - prelude 
#set _tr=ac
#set _tr=text
#set id=card_main_{num}
#set location=deck_main
#set create=single
'
);
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
    if (tomyformat($fields, $raw_fields) === false) break;
}
