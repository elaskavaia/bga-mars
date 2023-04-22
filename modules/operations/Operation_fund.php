<?php

declare(strict_types=1);


class Operation_fund extends AbsOperation {
    // XXX
    function auto(string $color, int $inc, array $args = null): bool {
        if ($args == null) return false;
        $marker = $this->game->createPlayerMarker($color);
        $milestone = $this->getStateArgsFromUserArgs('target', $args);
        $this->game->effect_incCount($color, 'm', -8);
        $this->game->dbSetTokenLocation($marker, $milestone, 1, clienttranslate('${player_name} claims milestone ${token_name}'), [],  $this->game->getPlayerIdByColor($color));
        return true;
    }

    function argPrimary(string $color, array $op = null, array &$result = null) {
        $keys = array_keys($this->game->tokens->getTokensOfTypeInLocation("milestone", null, 0));
        if (count($keys) <= 2) $keys = []; // 3 already claimed
        return $keys;
    }
}
