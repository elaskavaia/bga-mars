# Game design

# Database

Using two tables one for all game pieces (token) and one interactions (machine)
API for token table in modules/DBTokens.php and API for machine in modules/DbMachine.php

## DbTokens mapping

* cards are mapped as card_${exp}_${cardnum} - where expansion is expansion key, and cardnum can printed on the card. If card can occur more than one can add _${uniquenum} at the end (not sure its the case for TM)
* locations (see misc/loc_material.csv)
 * hand_${color} - is location for hand project cards
 * tableau_${color} - is player specific area
 * map_${x}_${y} - tile location (hex coords)
 * milestone_${x}
 * award_${x}
* the following location will be tracked by different means
 * level of production/income tracker_${restype}_${color}:tableau_${color}:${level}
 * count of resources tracker_${restype}_${color}:tableau_${color}:${count}
 * terraforming parameters  tracker_${paramtype}:display_main:${count} where paramtype o - oxigen, w - oceans (water), t - (temp)
 * TM rank - tracker_tr_${color}:tableau_${color}:${count} also tracked by score before end of game
* hex tiles as mapped as tile_${type}_${index} where type is forest (1), city (2), ocean (3) and other special type can be number
* personal colored cubes are marker_${color}_${index}
* other "resources" on cards resource_${color}_${index}:card_...:0



# Links

https://tesera.ru/images/items/2078855/FAQ_v1.7.pdf
https://www.fryxgames.se/TerraformingMars/TMRULESFINAL.pdf
https://ssimeonoff.github.io/cards-list

