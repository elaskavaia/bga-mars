<?php

declare(strict_types=1);


class Operation_activate extends AbsOperation {
    function effect(string $color, int $inc): int {
        $tokenId = $this->getCheckedArg('target');
        $r = $this->game->getRulesFor($tokenId, 'a');
        $this->game->machine->push($r, 1, 1, $color, MACHINE_FLAG_UNIQUE, "$tokenId:a");
        $this->game->dbSetTokenState($tokenId, MA_CARD_STATE_ACTION_USED, clienttranslate('${player_name} activates ${token_name}')); // used
        return 1;
    }

    function argPrimaryDetails() {
        $color = $this->color;
        $map = $this->game->tokens->getTokensOfTypeInLocation("card", "tableau_$color");
        $keys = array_keys($map);
        return $this->game->createArgInfo($color, $keys, function ($color, $tokenId) use ($map) {
            $r = $this->game->getRulesFor($tokenId, 'a');
            if (!$r) return MA_ERR_NOTAPPLICABLE;
            $info = $map[$tokenId];
            if ($info['state'] == MA_CARD_STATE_ACTION_USED) return MA_ERR_ALREADYUSED;
            if ($info['state'] == MA_CARD_STATE_ACTION_UNUSED_PRE) return MA_ERR_NOTAPPLICABLE;
            if ($this->game->isVoidSingle($r, $color, 1, "$tokenId:a")) return MA_ERR_ACTIONCOST;
            return 0;
        });
    }

    function getPrimaryArgType() {
        return 'token';
    }

    function canSkipChoice() {
        return false;
    }
}
