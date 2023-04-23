<?php

declare(strict_types=1);

class Operation_res extends AbsOperation {
    function effect(string $owner, int $inc): int {
        $card = $this->getCheckedArg('target');
        if (!$card) throw new feException("Context is not defined for operation");
        if ($card === 'none') return $inc; // skipped, this is ok for resources

        for ($i = 0; $i < $inc; $i++) {
            $res = $this->game->createPlayerResource($owner);
            $this->game->dbSetTokenLocation($res, $card, 1);
        }

        return $inc;
    }

    function argPrimaryDetails() {
        $color = $this->color;
        $keys = [$this->getContext()];
        return $this->game->createArgInfo($color, $keys, function ($color, $tokenId) {
            $holds = $this->game->getRulesFor($tokenId, 'holds', '');
            if (!$holds) return MA_ERR_NOTAPPLICABLE;
            return 0;
        });
    }
}
