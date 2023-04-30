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
    function canResolveAutomatically() {
        return !$this->isVoid();
    }

    function isVoid(): bool {
        $card = $this->getContext();
        if (!$card) return true;
        $holds = $this->game->getRulesFor($card, 'holds', '');
        if (!$holds) return true;
        return false;
    }

    protected function getOpName() {
        $card = $this->getContext();
        $par = $this->game->getRulesFor($card, 'holds', '');
        return ['log' => clienttranslate('Add ${restype_name} to ${card_name}'),  "args" => [
            "card_name" => $this->game->getTokenName($card),
            'restype_name' => $this->game->getTokenName("tag$par"),
            'i18n' => ['card_name', 'restype_name']
        ]];
    }

    protected function getPrompt() {
        return '${name}?';
    }
}
