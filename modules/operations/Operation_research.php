<?php

declare(strict_types=1);

class Operation_research extends AbsOperation {
    function auto(string $owner, int $inc, array $args = null) {
        $this->effect_research();
        return true;
    }

    function effect_research() {
        $players = $this->game->loadPlayersBasicInfos();
        foreach ($players as $player_id => $player) {
            $color = $player["player_color"];
            $this->game->dbSetTokenState("tracker_passed_${color}", 0);
            $this->game->queue($color, "4 draw"); // XXX
        }
    }
}
