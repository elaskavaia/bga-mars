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

        if ($this->game->isSolo() && $this->game->isEndOfGameAchived()) {
            $this->game->notifyWithName('message_warning',clienttranslate('This is a last generation'));
        }

        foreach ($players as $player_id => $player) {
            $color = $player["player_color"];
            // unpass
            $this->game->dbSetTokenState("tracker_passed_${color}", 0, '');
            // untap
            $keys = array_keys($this->game->tokens->getTokensOfTypeInLocation("card", "tableau_${color}"));
            foreach ($keys as $cardid) {
                $this->game->effect_untap($cardid);
            }
            if ($this->game->isZombiePlayer($player_id)) {
                // zombie auto-pass
                $this->game->dbSetTokenState("tracker_passed_${color}", 1, '');
            }
        }
        $this->game->effect_queueMultiDraw(4);
        $c = $this->getOwner();
        $player_id = $this->getPlayerId();
        $this->game->systemAssertTrue("bom p=$player_id c=$c", $this->game->isRealPlayer($player_id));
        $this->game->queuePlayersTurn($player_id);
    }

    function getPrimaryArgType() {
        return '';
    }
}
