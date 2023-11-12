Random notes on todo items

## General

* Pref to not confirm turn DONE

## Server

* undo - block on draw card
* Missing undo button when inactive during research
* rolling score option
* BUG: If you click 1 (max) without clicking the drawn card, Inventor's Guild, it does this because I don't have enough money.
* COnfusing DONE to cancel buying a card, i.e. Inventor Guid



## Client - Both layouts

* Show decoded error on when something cannot be selected/played
  * Noted during play test (PT) also
* Show discounted card cost
  * Update from args ok - TODO initial
* Passing not obvious 
  * Made tracker_passed visible in miniboard with data-name as content
* Exchange rate during payment
* Layout types based on size
* Generation counter on player panel (common panel)
  * DONE
* Mobile portrait layout
* PT: Temp global param - missing + when positive
* PT: Toolips on global params on miniboard missing
* PT: Missing tooltip on total score
* PT: I selected a corporation and clicked Undo.  It asks me to pick a corporation again, but the card isn't visually shown anymore (Note: its is there but not near the other corp)
* PT: wrong tooltip title for cards in hard on player mini board (says hand_0000ff counter)
* PT: .hex transition: 100ms ease-in-out; ? what is this for?
* SUGGESTION:  The "Send BUG" button should probably open a new tab/window if possible, not close the whole game - FIXED
* SUGGESTION:  Card selectors (square with eyes) should probably have tooltips because it took me a second to figure out what they do...though I know it's a simple concept.
  * Added tooltip but TODO : remove or change tooltip title(says player_viewcards_x_XXXX)
* SUGGESTION:  -30/+8C This is confusing.  Just showing "-30°C" would be clearer
  * DONE : Removed confusion
* SUGGESTION:  Having a tooltip on the general top area of the Milestones board would be nice, to explain that they're limited to 3 and cost 8 each etc. - FIXED
* PT: I wish it were easier to see what card was played from the log.
* Floating Hand: X icon should be more like "Down"
  * DONE : Replaced by Arrow down icon
* PT: tooltips oh .hex say "p, u" - FIXED

## Client - Silicon layout
* Fix some remaining cards rendering
* Show VP worth on cards
* PT: thermometer and scoreboard got out of sync 
* PT: NOTFOUND shown as card image in Card reference (at the bottom) - FIXED
* BUG:  Low-quality JPEG for ECOLINE corp tooltip image (any corp really).
  * Removed zoom effect
* BUG: Check Medical Lab rendering, the building tag should be circle - FIXED
* Specator section: pink

## Client - Cardboard layout
* Cubes on cards
* Printed player panels
* Specator section: need to hide hand area


### Client Bonus Features

* Card reference - done
  * with filters
* Sounds
* Flip animation
* Log scratch on undo
* Hand sorting

## Assets

* Waiting for official layered board