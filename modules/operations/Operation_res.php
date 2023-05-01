<?php

declare(strict_types=1);

class Operation_res extends AbsOperation {
    function effect(string $owner, int $inc): int {
        $card = $this->getContext();
        $this->game->systemAssertTrue("Context is not defined for operation", $card);
        $par = $this->game->getRulesFor($card, 'holds', '');
        for ($i = 0; $i < $inc; $i++) {
            $res = $this->game->createPlayerResource($owner);
            $this->game->dbSetTokenLocation($res, $card, 1, clienttranslate('${player_name} adds ${restype_name} to ${token_name}'), [
                'restype_name' => $this->game->getTokenName("tag$par"),
            ]);
        }

        return $inc;
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
        return ['log' => clienttranslate('Add ${restype_name} to ${token_name}'),  "args" => [
            "token_name" => $this->game->getTokenName($card),
            'restype_name' => $this->game->getTokenName("tag$par"),
            'i18n' => ['token_name', 'restype_name']
        ]];
    }

    protected function getPrompt() {
        return '${name}?';
    }
}
