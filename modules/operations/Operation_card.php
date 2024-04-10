<?php

declare(strict_types=1);

class Operation_card extends AbsOperation {
    function effect(string $color, int $inc): int {
        $card_id = $this->getCheckedArg('target');
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
        $keys = array_keys($this->game->tokens->getTokensInLocation("${location}_${color}"));
        return $this->game->filterPlayable($color, $keys);
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
}
