<?php

declare(strict_types=1);

/** Increase colony trading power
 */
class Operation_tradeinc extends  AbsOperation {
    function getTargetColony() {
        $colony = $this->getContext(0);
        return $colony;
    }

    function getPrimaryArgType() {
        return '';
    }
    function argPrimaryDetails() {
        $colony = $this->getTargetColony();
        $color = $this->color;
        if (!$colony) {
            $colony = 'none';
        }   
 
        $keys = [$colony];
        return $this->game->createArgInfo($color, $keys, function ($color, $colony) {
            if ($colony == 'none') {
                return ['q' => MA_ERR_NOTAPPLICABLE, 'level' => -1];
            }
            $state = $this->game->tokens->getTokenState($colony);
            return ['q' => $state < 0 ? MA_ERR_PREREQ : MA_OK, 'level' => $state];
        });
    }
    function effect(string $owner, int $inc): int {
        $colony = $this->getTargetColony();
        $this->game->systemAssertTrue("Cannot determine colony", $colony);

        $state = $this->game->tokens->getTokenState($colony);
        $this->game->systemAssertTrue("Colony is not active", $state >= 0);

        if ($this->getParam(0, '') == 'reset') {
            $markers = $this->game->tokens->getTokensOfTypeInLocation("marker_", $colony);
            $colonies = count($markers);
            $new_spot = $colonies;
        } else {
            $new_spot = $state + $inc;
            if ($new_spot >= 6) $new_spot = 6;
        }

        $this->game->dbSetTokenState($colony, $new_spot, c_lienttranslate('Trade income level of ${card_name} changes to ${new_state}'), [
            'card_name' => $this->game->getTokenName($colony)
        ]);

        return $inc;
    }


    function canFail(): bool {
        return true;
    }

    public function getPrompt() {
        return c_lienttranslate('${you} must confirm increase colony trading income level');
    }

    protected function getSkipButtonName() {
        return clienttranslate("Decline");
    }


    protected function getOpName() {
        return c_lienttranslate('Increase colony trading income level');
    }
}
