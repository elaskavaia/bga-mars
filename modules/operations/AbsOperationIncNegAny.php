<?php

declare(strict_types=1);

class AbsOperationIncNegAny extends AbsOperation {

    function argPrimaryDetails() {
        $keys = $this->game->getPlayerColors();
        $keys[] = 'none';
        $type = $this->getType();
        $protected = [];
        if ($type == 'p') {
            $listeners = $this->game->collectListeners($this->color, ["defensePlant"]);
            foreach ($listeners as $lisinfo) {
                $protected[$lisinfo['owner']] = 1;
            }
        }
        return $this->game->createArgInfo($this->color, $keys, function ($color, $other_player_color) use ($protected) {
            if (array_get($protected, $other_player_color)) return MA_ERR_RESERVED;
            return 0;
        });
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

        $this->game->effect_incCount($owner, $type, -$inc, ['ifpossible' => true]);
        return $inc;
    }
}
