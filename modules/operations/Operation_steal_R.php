<?php

declare(strict_types=1);

class Operation_steal_R extends AbsOperation {
    function argPrimaryDetails() {
        $keys = $this->game->getPlayerColors();
        if ($this->game->isSolo())  $keys []= 'ffffff';
        $type = $this->getType();
        $protected = $this->game->protectedOwners($this->color, $type);
        return $this->game->createArgInfo($this->color, $keys, function ($color, $other_player_color) use ($type, $protected) {
            if ($color === $other_player_color) return MA_ERR_NOTAPPLICABLE;
            if ($other_player_color === 'ffffff') return MA_OK;
            if (array_get($protected, $other_player_color))  return ['q' => MA_ERR_PROTECTED, 'protected' => 1];
            $value = $this->game->getTrackerValue($other_player_color, $type);
            if ($value == 0) return ['q' => MA_ERR_NOTAPPLICABLE, 'max' => $value];
            return ['q' => MA_OK, 'max' => $value];
        });
    }

    public function getPrimaryArgType() {
        return 'player';
    }

    function requireConfirmation() {
        if ($this->game->isSolo()) return false;
        return true;
    }

    function canResolveAutomatically() {
        if ($this->game->isSolo()) return true;
        return false;
    }

    function isVoid(): bool {
        if ($this->game->isSolo()) return false;
        return parent::isVoid();
    }

    function getType(): string {
        return substr($this->mnemonic, strlen($this->mnemonic) - 1, 1);
    }

    function effect(string $owner, int $inc): int {
        $opres = $this->getType();
        if ($this->game->isSolo()) {
            $this->game->notifyMessage(clienttranslate('${player_name} steals from neutral opponent'), [], $this->game->getPlayerIdByColor($owner));
            $this->game->effect_incCount($owner, $opres, $inc);
            return $inc;
        }
        $other = $this->getCheckedArg('target');
        $this->game->checkColor($other);
        $value = $this->game->getTrackerValue($other, $opres);
        $value = min($inc, $value); // up to

        $this->game->effect_incCount($other, $opres, -$value);
        $this->game->effect_incCount($owner, $opres, $value);
        return $inc;
    }

    protected function getVisargs() {
        $opres = $this->getType();
        return [
            "name" => $this->getOpName(),
            'count' => $this->getCount(),
            'restype_name' => $this->game->getTokenName("$opres"),
            'i18n' => ['restype_name']
        ];
    }
}
