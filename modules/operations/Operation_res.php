<?php

declare(strict_types=1);

class Operation_res extends AbsOperation {
    function effect(string $owner, int $inc): int {
        $card = $this->getContext();
        if (!$card) throw new feException("Context is not defined for operation");

        for ($i = 0; $i < $inc; $i++) {
            $res = $this->game->createPlayerResource($owner);
            $this->game->dbSetTokenLocation($res, $card, 1);
        }

        return $inc;
    }
    function   canResolveAutomatically() {
        return !$this->isVoid();
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


    protected function getOpName() {
        $card = $this->getContext();
        $par = $this->game->getRulesFor($card, 'holds', '');
        return ['log' => clienttranslate('Add ${restype_name} to ${card_name}'),  "args" => [
            "card_name" => $this->game->getTokenName($card),
            'restype_name' => $par,
            'i18n' => ['card_name', 'restype_name']
        ]];
    }

    protected function getPrompt() {
        return '${name}?';
    }
}
