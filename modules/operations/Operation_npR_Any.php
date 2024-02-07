<?php

declare(strict_types=1);
/**
 * Decrease anybody production, i.e. nps_Any
 */
class Operation_npR_Any extends AbsOperation {
    function argPrimaryDetails() {
        $keys = $this->game->getPlayerColors();
        $count = $this->getMinCount();
        $type = $this->getType();
        $min = $this->game->getRulesFor($this->game->getTrackerId('', $type), 'min');
        return $this->game->createArgInfo($this->color, $keys, function ($color, $other_player_color) use ($count, $type, $min) {
            $value = $this->game->getTrackerValue($other_player_color, $type);
            if ($value - $count < $min) return ['q' => MA_ERR_PREREQ, 'max' => $value];
            return ['q' => MA_OK, 'max' => $value];
        });
    }

    protected function getPrompt() {
        return  clienttranslate('${you} must select a player who will lose ${res_name} (${count})');
    }
    protected function getVisargs() {
        $type = $this->getType();
        $ttoken = $this->game->getTrackerId('', $type);
        return [
            "name" => $this->getOpName(),
            'count' => $this->getMinCount(),
            'res_name' => $this->game->getTokenName($ttoken),
            'res_type' => $type,
        ];
    }


    public function getPrimaryArgType() {
        return 'player';
    }

    protected function getType() {
        return substr($this->mnemonic, 1, 2);
    }

    function canResolveAutomatically() {
        if ($this->game->isSolo()) {
            return true;
        }
        return false;
    }

    function isVoid(): bool {
        if ($this->game->isSolo()) return false;
        return parent::isVoid();
    }

    function hasNoSideEffects(): bool {
        return true;
    }

    function effect(string $owner, int $inc): int {
        $type = $this->getType();
        if ($this->game->isSolo()) {
            $message = clienttranslate('${player_name} reduces ${token_name} of neutral opponent by ${mod}');
            $this->game->notifyMessageWithTokenName($message, $this->game->getTrackerId($owner, $type), $owner, ['mod' => $inc]);
            return $inc;
        }

        $owner = $this->getCheckedArg('target');
        $this->game->checkColor($owner);
        $this->game->effect_incProduction($owner, $type, -$inc);
        return $inc;
    }
}
