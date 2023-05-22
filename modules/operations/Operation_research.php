<?php

declare(strict_types=1);

class Operation_research extends AbsOperation {
    function effect(string $owner, int $inc): int {
        $this->effect_research();
        return 1;
    }

    function effect_research() {
        $this->game->dbResourceInc("tracker_gen", 1, clienttranslate('New generation ${counter_value}'));
        $players = $this->game->loadPlayersBasicInfos();
        foreach ($players as $player_id => $player) {
            $color = $player["player_color"];
            // unpass
            $this->game->dbSetTokenState("tracker_passed_${color}", 0, '');
            // untap
            $keys = array_keys($this->game->tokens->getTokensOfTypeInLocation("card", "tableau_${color}"));
            foreach ($keys as $cardid) {
                $rules = $this->game->getRulesFor($cardid, '*');
                if (isset($rules['a'])) {
                    $state = MA_CARD_STATE_ACTION_UNUSED; // activatable cards
                    $this->game->dbSetTokenState($cardid, $state, '');
                }
            }
            // draw
            //$this->game->queue($color, "4draw(auto)");
  
            $this->game->multiplayerqueue($color, "4predraw,4?buycard,prediscard"); 
            //$this->game->debugLog("-MULTI QUEUE: machine top:" . $this->game->machine->getlistexpr($this->game->machine->getTopOperations($color)));
        }
    }
}
