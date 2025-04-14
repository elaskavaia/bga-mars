<?php

declare(strict_types=1);

/** Increase colony trading power
 */
class Operation_tradeinc extends  AbsOperation {
    function getTargetColony() {
        $colony = $this->getContext(0);
        $op = $this->getContext(1);
        if ($op == 'e' || $op == 'x') return $colony;
        return '';
    }

    function getPrimaryArgType() {
        if ($this->getTargetColony()) return '';
        return 'token';
    }

    function argPrimaryDetails() {
        $colony = $this->getTargetColony();
        $color = $this->color;
        if (!$colony) {
            $tokens = $this->game->tokens->getTokensOfTypeInLocation("card_colo", "display_colonies");
            $keys = array_keys($tokens);
        } else {
            $keys = [$colony];
        }
        $excluding = $this->getContext(3);
        return $this->game->createArgInfo($color, $keys, function ($color, $colony) use ($excluding) {
            if ($colony == 'none' || $colony == $excluding) {
                return ['q' => MA_ERR_NOTAPPLICABLE, 'level' => -1];
            }
            $state = $this->game->tokens->getTokenState($colony);
            return ['q' => $state < 0 ? MA_ERR_PREREQ : MA_OK, 'level' => $state];
        });
    }
    function effect(string $owner, int $inc): int {
        $colony = $this->getCheckedArg('target');
        $this->game->systemAssertTrue("Cannot determine colony", $colony);

        $state = $this->game->tokens->getTokenState($colony);
        $this->game->systemAssertTrue("Colony is not active", $state >= 0);

        $param = $this->getParam(0, '');

        if ($param == 'reset') {
            $colonies = count($this->game->tokens->getTokensOfTypeInLocation("marker_", $colony));
            $new_spot = $colonies;
        } else if ($param == 'dec') {
            $new_spot = $state - $inc;
            $colonies = count($this->game->tokens->getTokensOfTypeInLocation("marker_", $colony));
            if ($new_spot < $colonies) $this->game->userAssertTrue(clienttranslate("Cannot reduce further"), false);
        } else {
            $new_spot = $state + $inc;
            if ($new_spot >= 6) $new_spot = 6;
        }

        if ($param == 'steal') {
            // decrease another
            $this->game->put($owner, "tradeinc(dec)", implode(":", ["", "", "", $colony]));
        }

        $this->game->dbSetTokenState($colony, $new_spot, clienttranslate('Trade income level of ${card_name} changes to ${new_state}'), [
            'card_name' => $this->game->getTokenName($colony)
        ]);

        return $inc;
    }


    function canFail(): bool {
        return true;
    }

    function isFullyAutomated() {
        if ($this->getTargetColony()) return true;
        return false;
    }

    public function getPrompt() {
        $param = $this->getParam(0, '');

        if ($param == 'dec') {
            return clienttranslate('${you} must decrease colony trading income level');
        }
        return clienttranslate('${you} must confirm increase colony trading income level');
    }

    protected function getSkipButtonName() {
        return clienttranslate("Decline");
    }


    protected function getOpName() {
        return clienttranslate('Increase colony trading income level');
    }
}
