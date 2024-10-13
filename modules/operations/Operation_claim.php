<?php

declare(strict_types=1);

class Operation_claim extends AbsOperation {
    function effect(string $color, int $inc): int {
        $marker = $this->game->createPlayerMarker($color);
        $milestone = $this->getCheckedArg('target');
        $no = $this->getPlayerNo();
        $this->game->tokens->setTokenState($milestone, $no);
        $this->game->effect_moveCard($color, $marker, $milestone, 1, clienttranslate('${player_name} claims milestone ${place_name}'));
        $this->game->push($color, $this->game->getPayment($color, $milestone), $milestone);
        return 1;
    }

    function argPrimaryDetails() {
        $color = $this->color;
        $map = $this->game->tokens->getTokensOfTypeInLocation("milestone_", null, null);
        $keys = array_keys($map);
        $claimed = $this->game->tokens->countTokensInLocation("milestone_%", null);
        return $this->game->createArgInfo($color, $keys, function ($color, $tokenId) use ($map, $claimed) {
            $var = $this->game->getRulesFor($tokenId, "r");
            $min = $this->game->getRulesFor($tokenId, "min", 100);
            $res = $this->game->evaluateExpression($var, $color, $tokenId, ['wilds' => []]);
            $q = 0;

            if ($claimed >= 3) $q = MA_ERR_MAXREACHED; // 3 already claimed
            else if ($map[$tokenId]['state'] > 0) $q = MA_ERR_OCCUPIED; // this already claimed

            else if (!($res >= $min)) {
                $q = MA_ERR_PREREQ; // fail prereq check
            } else            if (!$this->game->canAfford($color, $tokenId))  $q = MA_ERR_PREREQ;
            MA_ERR_COST;

            return [
                'q' => $q,
                'c' => $res
            ];
        });
    }

    function getPrimaryArgType() {
        return 'token';
    }
}
