<?php

declare(strict_types=1);

class Operation_card extends AbsOperation {
    function effect(string $color, int $inc): int {
        if ($this->noValidTargets()) return 1; // skip this
        $card_id = $this->getCheckedArg('target', false);
        $payment_op = $this->game->getPayment($color, $card_id);
        $payment_inst = $this->game->getOperationInstanceFromType($payment_op, $color, 1, $card_id);
        if ($payment_inst->isVoid()) throw new BgaUserException(self::_("Insufficient resources for payment"));
        $this->game->push($color, $payment_op, $card_id);
        $this->game->put($color, 'cardx', $card_id);
        return 1;
    }

    function argPrimaryDetails() {
        $color = $this->color;
        $location = $this->params('hand');
        $keys = array_keys($this->game->tokens->getTokensOfTypeInLocation("card_main_", "{$location}_{$color}"));
        return $this->game->filterPlayable($color, $keys);
    }

    function getDelta() {
        $owner = $this->color;
        $delta = $this->game->tokens->getTokenState("tracker_pdelta_{$owner}") ?? 0;
        $listeners = $this->game->collectListeners($owner, ['onPre_delta']);
        foreach ($listeners as $lisinfo) {
            $outcome = $lisinfo['outcome'];
            $delta += $outcome;
        }
        return $delta;
    }

    function getPrimaryArgType() {
        return 'token';
    }

    function noValidTargets(): bool {
        $arg = $this->arg();
        return count($arg['target']) == 0;
    }

    function canSkipChoice() {
        return false;
    }

    function canFail() {
        return true;
    }

    function getPrompt() {
        $delta = $this->getDelta();
        if ($delta >= 20) return clienttranslate('${you} must select a card to play (ignore global requirements)');
        //if ($delta >= 0) return clienttranslate('${you} must select a card to play (adjusted global requirements)');
        return parent::getPrompt();
    }
}
