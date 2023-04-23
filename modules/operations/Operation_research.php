<?php

declare(strict_types=1);

class Operation_research extends AbsOperation {
    function effect(string $owner, int $inc): int {
        $this->effect_research();
        return 1;
    }

    function effect_research() {
        $this->game->dbResourceInc("tracker_gen",1,clienttranslate('New generation ${counter_value}'));
        $players = $this->game->loadPlayersBasicInfos();
        foreach ($players as $player_id => $player) {
            $color = $player["player_color"];
            $this->game->dbSetTokenState("tracker_passed_${color}", 0);
            $this->game->queue($color, "4 draw"); // XXX
        }
    }
}
