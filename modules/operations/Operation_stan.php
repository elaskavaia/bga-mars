<?php

declare(strict_types=1);


class Operation_stan extends AbsOperation {
    function effect(string $color, int $inc): int {
        $card_id = $this->getCheckedArg('target');
        $rules = $this->game->getRulesFor($card_id, 'r');
        $this->game->notifyMessageWithTokenName(clienttranslate('${player_name} plays standard project ${token_name}'), $card_id, $color);
        $this->game->push($color, $this->game->getPayment($color, $card_id), $card_id);
        if ($card_id != 'card_stanproj_1')
            $this->game->notifyEffect($color, "play_stan", $card_id);
        $this->game->putInEffectPool($color, $rules, $card_id);

        return 1;
    }

    function argPrimaryDetails() {
        $color = $this->color;
        $keys = array_keys($this->game->tokens->getTokensOfTypeInLocation("card_stanproj", "display_main"));
        return $this->game->filterPlayable($color, $keys);
    }

    function getPrimaryArgType() {
        return 'token';
    }
}
