<?php

declare(strict_types=1);


class Operation_draft extends AbsOperation {
    function effect(string $color, int $inc): int {
        if ($this->noValidTargets()) {
            $this->game->notifyWithName('message',clienttranslate('Draft is skipped, no more cards'),[], $this->getPlayerId());
            return $inc; // skip draft
        }
        $card_id = $this->getCheckedArg('target');
        $this->game->effect_moveCard($color, $card_id, "draw_$color", MA_CARD_STATE_SELECTED, clienttranslate('private: ${player_name} drafts a card ${token_name}'), [
            "_private" => true
        ]);
        return 1;
    }

    function argPrimaryDetails() {
        $color = $this->color;
        $keys = array_keys($this->game->tokens->getTokensOfTypeInLocation("card_main", "draft_${color}"));
        return $this->game->createArgInfo($color, $keys, function ($color, $tokenId) {
            $info = ['q' => 0]; // always can draft
            $this->game->playability($color, $tokenId, $info);
            return $info;
        });
    }

    protected function getVisargs() {
        $color = $this->color;
        $next_color = $this->game->getNextDraftPlayerColor($color);
        return [
            "name" => $this->getOpName(),
            'count' => $this->getCount(),
            'next_color' => $next_color,
        ];
    }

    function canResolveAutomatically() {
        $arg = $this->arg();
        if (count($arg['target']) == 1) return true;
        if ($this->noValidTargets()) return true;
        return false;
    }

    function isOptional() {
        if ($this->noValidTargets()) return true;
        return parent::isOptional();
    }


    function noValidTargets(): bool {
        $arg = $this->arg();
        return count($arg['target']) == 0;
    }
}
