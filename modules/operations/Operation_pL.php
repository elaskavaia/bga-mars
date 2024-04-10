<?php

declare(strict_types=1);

/**
 * Special action for Robinson Industries: increase (one of) your LOWEST PRODUCTION 1 step
 */
class Operation_pL extends AbsOperation {

    function argPrimaryDetails() {
        $color = $this->color;
        $production = ['pm', 'ps', 'pu', 'pp', 'pe', 'ph'];
    
        $map = [];
        foreach($production as $p) {
            $trackerId = $this->game->getTrackerId($color,$p);
            $value = (int) $this->game->tokens->getTokenState($trackerId);
            $map[$trackerId]=$value;
        }
        asort($map);
        $low = reset($map);
        $keys = array_keys($map);
        return $this->game->createArgInfo($color, $keys, function ($color, $trackerId) use ($map,$low) {
            $value = (int) $map[$trackerId];
            if ($value!==$low) return MA_ERR_NOTAPPLICABLE;
            return MA_OK;
        });
    }

    protected function getPrompt() {
        return clienttranslate('Select (one of) your LOWEST PRODUCTION to increase');
    }

    function effect(string $color, int $inc): int {
        $trackerId = $this->getCheckedArg('target');
        $type = getPart($trackerId,1);
        $this->game->effect_incProduction($color,$type,$inc);
        return $inc;
    }

    function getPrimaryArgType() {
        return 'token';
    }

    function canFail(){
        return false;
    }
}
