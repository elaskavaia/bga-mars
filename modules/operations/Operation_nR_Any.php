<?php

declare(strict_types=1);

/**
 * Remove any player standard resource R one of m, s, p, etc
 * This is up to and optional
 */
class Operation_nR_Any extends AbsOperation {
    protected function getPrompt() {
        return  clienttranslate('${you} must select a player who will lose ${res_name} (up to ${count}) or none');
    }
    protected function getVisargs() {
        $type = $this->getType();
        $ttoken = $this->game->getTrackerId('', $type);
        return [
            "name" => $this->getOpName(),
            'count' => $this->getCount(),
            'res_name' => $this->game->getTokenName($ttoken),
            'res_type' => $type,
        ];
    }

    function argPrimaryDetails() {
        $keys = $this->game->getPlayerColors();
        $keys[] = 'none';
        $type = $this->getType();
        $protected = $this->game->protectedOwners($this->color, $type);
        return $this->game->createArgInfo($this->color, $keys, function ($color, $other_player_color) use ($protected, $type) {
            if ($other_player_color == 'none') return 0;
            if (array_get($protected, $other_player_color))  return ['q' => MA_ERR_PROTECTED, 'protected' => 1];
            $value = $this->game->getTrackerValue($other_player_color, $type);
            if ($value == 0) return ['q' => MA_ERR_NOTAPPLICABLE, 'max' => $value];
            return ['q' => MA_OK, 'max' => $value];
        });
    }

    function hasNoSideEffects(): bool {
        return true;
    }

    public function getPrimaryArgType() {
        return 'player';
    }

    function canResolveAutomatically() {
        if ($this->game->isSolo()) {
            return true;
        }
        return false;
    }

    function canSkipAutomatically() {
        return false;
    }

    function isVoid(): bool {
        return false;
    }

    protected function getType() {
        return substr($this->mnemonic, 1, 1); // XXX
    }

    function effect(string $owner, int $inc): int {
        $type = $this->getType();
        if ($this->game->isSolo()) {
            $message = clienttranslate('${player_name} removes ${mod} ${token_name} from neutral opponent');
            $this->game->notifyMessageWithTokenName($message, $this->game->getTrackerId($owner, $type), $owner, ['mod' => $inc]);
            return $inc;
        }

        $owner = $this->getCheckedArg('target');
        if ($owner == 'none') return $inc; // skipped, this is ok for resources
        $this->game->checkColor($owner);
        $value = $this->game->getTrackerValue($owner, $type);
        $mod = $inc;
        if ($inc > $value) {
            $mod = $value;
        }

        $this->game->effect_incCount($owner, $type, -$mod);
        return $inc;
    }
}
