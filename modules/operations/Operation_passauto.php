<?php

declare(strict_types=1);

/**
 * Pass on next turn
 */
class Operation_passauto extends AbsOperation {
    function isVoid(): bool {
        return false; 
    }

    function canResolveAutomatically() {
        return false;
    }

    function effect(string $color, int $inc, ?array $args = null): int {
        $operations = $this->game->getTopOperations();

        $isMulti = $this->game->hasMultiPlayerOperations($operations);

        if ($isMulti) {
            throw new feException("Pass operation is impossible in this state");
        }
        
        $this->game->dbSetTokenState("tracker_passed_${color}", 2, '');
        $this->game->notifyPlayer($this->getPlayerId(),'message_warning',clienttranslate('Auto passing on next turn'),[]);

  
        $sec = $this->game->queueremove($color, 'skipsec');
        if ($sec) {
            $this->game->notifyMessage(clienttranslate('${player_name} skips second action'));
        }
        //$this->game->queueremove($color, 'confturn');
        // pass is not an action so decreasig the stat, it was increased before
        $this->game->incStat(-1, 'game_actions',  $this->getPlayerId());
        return 1;
    }

    protected function getVisargs() {
        return array_merge(parent::getVisargs(),[
            'bcolor' => 'red' // button color
        ]);
    }
}
