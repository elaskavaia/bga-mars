<?php

declare(strict_types=1);


class Operation_activate extends AbsOperation {
    function effect(string $color, int $inc): int {
        $tokenId = $this->getCheckedArg('target');
        $r = $this->game->getRulesFor($tokenId, 'a');
        $this->game->machine->push($r, 1, 1, $color, MACHINE_FLAG_UNIQUE, $tokenId);
        $this->game->dbSetTokenState($tokenId, MA_CARD_STATE_ACTION_USED); // used
        return 1;
    }

    function argPrimaryDetails() {
        $color = $this->color;
        $map = $this->game->tokens->getTokensOfTypeInLocation("card", "tableau_${color}");
        $keys = array_keys($map);
        return $this->game->createArgInfo($color, $keys, function ($color, $tokenId) use ($map) {
            $rules = $this->game->getRulesFor($tokenId, '*');
            if (!isset($rules['a'])) return MA_ERR_NOTAPPLICABLE;
            $info = $map[$tokenId];
            if ($info['state'] == 3) return MA_ERR_ALREADYUSED;
            $r = $this->game->getRulesFor($tokenId, 'a');
            $expr = OpExpression::parseExpression($r);
            $cost = $expr->args[0];
            if ($expr->op != ":") return 0;
            $costop = $this->game->machine->createOperationSimple(OpExpression::str($cost), $color);
            if ($this->game->isVoid($costop)) return MA_ERR_MANDATORYEFFECT;
            return 0;
        });
    }
}
