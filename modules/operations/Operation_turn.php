<?php

declare(strict_types=1);

class Operation_turn extends AbsOperation {
    function effect(string $owner, int $inc): int {
        $player_id = $this->game->getPlayerIdByColor($owner);

        $this->game->incStat(1, 'game_actions',  $player_id);
        $actnumber = $this->game->getStat('game_actions', $player_id);
        $special = false;
        if ($actnumber == 1) {
            // first action of the game, some corp has some rules
            $corp = $this->game->tokens->getTokenOfTypeInLocation('card_corp', "tableau_$owner");
            $corp_id = $corp['key'];
            $a1 = $this->game->getRulesFor($corp_id, 'a1', '');
            if ($a1) {
                $this->game->queue($owner, $a1);
                $special = true;
            }
        }
        if (!$special)
            $this->game->queue($owner, "card/stan/activate/convh/convp/claim/fund/pass");
        // if multiplayer
    
        if (!$this->game->isSolo()) {
            $this->game->queue($owner, "turn2");
        } else {
            // no need to confirm for 1 player?
            $this->game->queue($owner, "confturn");
        }
        return 1;
    }
}
