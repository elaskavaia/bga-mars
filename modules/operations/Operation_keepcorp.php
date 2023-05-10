<?php

declare(strict_types=1);


class Operation_keepcorp extends AbsOperation {
    function effect(string $color, int $inc): int {
        $card_id = $this->getCheckedArg('target');
        $player_id = $this->game->getPlayerIdByColor($color);
        $this->game->dbSetTokenLocation(
            $card_id,
            "tableau_$color",
            MA_CARD_STATE_ACTION_UNUSED,
            clienttranslate('${player_name} chooses corporation ${token_name}'),
            [],
            $player_id
        );

        $rest = $this->argPrimary();
        foreach ($rest as $card_id2) {
            $this->game->dbSetTokenLocation($card_id2, "limbo", 0, '', [],  $player_id);
        }

        return 1;
    }

    function argPrimary() {
        $color = $this->color;
        $keys = array_keys($this->game->tokens->getTokensOfTypeInLocation("card_corp_", "draw_${color}"));
        return $keys;
    }


    function canResolveAutomatically() {
        return false;
    }
}
