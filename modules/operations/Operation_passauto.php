<?php

declare(strict_types=1);

/**
 * Pass on next turn, special action not handled via action queue
 */
class Operation_passauto extends AbsOperation {
    function isVoid(): bool {
        $isMulti = $this->game->isInMultiplayerMasterState();
        if ($isMulti)  return true; // cannot do this
        
        $color = $this->color;
        $state = $this->game->tokens->getTokenState("tracker_passed_$color");
        if ($state != 0) return true; // already passed
        return false; 
    }

    function canResolveAutomatically() {
        return false;
    }

    function getPrimaryArgType() {
        return '';
    }

    function effect(string $color, int $inc, ?array $args = null): int {
        $isMulti = $this->game->isInMultiplayerMasterState();

        if ($isMulti) {
            throw new feException("Pass operation is impossible in this state");
        }
        $stage = $this->game->getGameStateValue('gamestage'); 
        if ($stage != MA_STAGE_GAME) {
            throw new feException("Pass operation is impossible in this state");
        }
        
        $this->game->dbSetTokenState("tracker_passed_$color", 2, '');
        $this->game->notifyPlayer($this->getPlayerId(),'message_warning',clienttranslate('Auto passing on next turn'),[]);
        return 1;
    }

    function getPrompt() {
        $color = $this->color;
        if ($this->game->getActivePlayerColor()!==$color) {
            return clienttranslate('${you} must confirm Pass for this GENERATION on your next turn, cannot be undone');
        } else {
            return clienttranslate('${you} must confirm Pass for this GENERATION on your next turn, you can finish your current turn normally');
        }
    }

    protected function getVisargs() {
        return array_merge(parent::getVisargs(),[
            'bcolor' => 'orange' // button color
        ]);
    }
}
