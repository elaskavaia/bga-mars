# Game design

# Database

Using two tables one for all game pieces (token) and one interactions (machine)
API for token table in modules/DBTokens.php and API for machine in modules/DbMachine.php

## DbTokens mapping

* cards are mapped as card_${exp}_${cardnum} - where expansion is expansion key, and cardnum can printed on the card.
* locations (see misc/loc_material.csv)
 * hand_${color} - is location for hand project cards
 * tableau_${color} - is player specific area
 * hex_${x}_${y} - tile location (hex coords)
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

## Interactions

* Machine is action machine, is kind of state machine of bga but with stack, docs in modules/DbMachine.md. Machine use operation expressions which essentially describe effects on cards and things you can do and choices you have to make, i.e. a/b - you pick a or b, etc
* We use MathExpression which is what you expect, like a > b. This is used for card pre-conditions, vp complex calculations (i.e. vp equal half of cards in your hand), counter complex calculation (gain number of MC equal to number of Science tags you player), effect conditions
 * MathExpression is evaluted in context, usually it involved the player, but also can involve a card or some custom context provider (which resolves the variables in the expression)

# Links

https://tesera.ru/images/items/2078855/FAQ_v1.7.pdf
https://www.fryxgames.se/TerraformingMars/TMRULESFINAL.pdf
https://ssimeonoff.github.io/cards-list

