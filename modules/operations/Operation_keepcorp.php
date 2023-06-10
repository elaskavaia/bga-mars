<?php

declare(strict_types=1);


class Operation_keepcorp extends AbsOperation {
    function effect(string $color, int $inc): int {
        $card_id = $this->getCheckedArg('target');
        $this->game->effect_playCorporation($color,  $card_id);
        //         $player_id = $this->game->getPlayerIdByColor($color);
        // $rest = $this->argPrimary();
        // foreach ($rest as $card_id2) {
        //     $this->game->dbSetTokenLocation($card_id2, "limbo", 0, '', [],  $player_id);
        // }

        return 1;
    }

    function argPrimary() {
        $color = $this->color;
        $keys = array_keys($this->game->tokens->getTokensOfTypeInLocation("card_corp_", "draw_${color}"));
        return $keys;
    }


    function noValidTargets(): bool {
        $arg = $this->arg();
        return count($arg['target']) == 0;
    }


    function canResolveAutomatically() {
        return false;
    }
}
