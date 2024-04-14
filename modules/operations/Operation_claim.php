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
            if ($claimed >= 3) return MA_ERR_MAXREACHED; // 3 already claimed
            if ($map[$tokenId]['state'] > 0) return MA_ERR_OCCUPIED;
            $cond = $this->game->getRulesFor($tokenId, "pre");
            if ($cond) {
                $valid = $this->game->evaluateExpression($cond, $color, $tokenId, ['wild'=>1]);
                if (!$valid) return MA_ERR_PREREQ; // fail prereq check
            }
     

            if (!$this->game->canAfford($color, $tokenId)) return MA_ERR_COST;
            return MA_OK;
        });
    }

    function getPrimaryArgType() {
        return 'token';
    }
}
