<?php

declare(strict_types=1);

class Operation_draft extends AbsOperation {
    function effect(string $color, int $inc): int {
        if ($this->noValidTargets()) {
            $this->game->notifyWithName("message", clienttranslate("Draft is skipped, no more cards"), [], $this->getPlayerId());
            return $inc; // skip draft
        }
        $card_id = $this->getCheckedArg("target");
        $this->game->effect_moveCard($color, $card_id, "draw_$color", MA_CARD_STATE_SELECTED, clienttranslate('You draft ${token_name}'));
        return 1;
    }

    function argPrimaryDetails() {
        $color = $this->color;
        $keys = array_keys($this->game->tokens->getTokensOfTypeInLocation("card_main", "draft_$color"));
        return $this->game->createArgInfo($color, $keys, function ($color, $tokenId) {
            $info = ["q" => 0]; // always can draft
            $this->game->playability($color, $tokenId, $info);
            return $info;
        });
    }

    function getPrimaryArgType() {
        return "token";
    }

    protected function getVisargs() {
        $color = $this->color;
        $next_color = $this->game->getNextDraftPlayerColor($color);
        return [
            "name" => $this->getOpName(),
            "count" => $this->getCount(),
            "next_color" => $next_color,
        ];
    }

    function canResolveAutomatically() {
        $arg = $this->arg();
        if (count($arg["target"]) == 1) {
            return true;
        }
        if ($this->noValidTargets()) {
            return true;
        }
        return false;
    }

    function isOptional() {
        if ($this->noValidTargets()) {
            return true;
        }
        return parent::isOptional();
    }

    function canSkipChoice() {
        if ($this->noValidTargets()) {
            return true;
        }
        return $this->isVoid();
    }

    function noValidTargets(): bool {
        $arg = $this->arg();
        return count($arg["target"]) == 0;
    }

    function undo() {
        $color = $this->color;
        $selected_draft = $this->game->tokens->getTokensInLocation("draw_$color", MA_CARD_STATE_SELECTED);
        $total = count($selected_draft);
        if ($total == 0) {
            throw new BgaUserException(clienttranslate("Nothing to undo"));
        }
        $this->game->systemAssertTrue("unexpected non draft", $this->game->isDraftVariant());
        $this->game->systemAssertTrue("unexpected non multiplayer", $this->game->isInMultiplayerMasterState());
        $operations = $this->game->machine->getTopOperations(null, "main");
        $op = array_shift($operations);
        $this->game->systemAssertTrue("unexpected state", $op);
        $optype = $op["type"];
        $this->game->systemAssertTrue("unexpected state $optype", $optype == "passdraft");
        $this->game->systemAssertTrue("unexpected total of draft", $total == 1);

        foreach ($selected_draft as $card_id => $card) {
            $this->game->effect_moveCard($color, $card_id, "draft_$color", MA_CARD_STATE_NORMAL);
        }

        $this->game->multiplayerpush($color, "draft"); // add $total if can draft more than one
        $this->game->machine->normalize();
    }
}
