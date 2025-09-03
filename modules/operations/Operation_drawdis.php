<?php

declare(strict_types=1);

class Operation_drawdis extends AbsOperation
{
    function effect(string $color, int $inc): int
    {
        if (!$this->game->isPlayerAlive($this->getPlayerId())) return $inc;
        $this->game->effect_draw($color, "deck_main", "hand_$color", $inc);
        $data = $this->getData("op_drawdis:r");
        if ($this->getPlayerId() != $this->game->getTurnMaster()) {
            $this->game->notifyMessage(clienttranslate('${player_name} discard is delayed'), [], $this->getPlayerId());
            $this->game->queue($color, "discard",  $data);
        } else {
            $this->game->push($color, "discard",  $data);
        }
        return $inc;
    }

    function requireConfirmation()
    {
        if ($this->getPlayerId() != $this->game->getTurnMaster()) {
            return false;
        }
        $pref = (int) $this->game->dbUserPrefs->getPrefValue($this->getPlayerId(), MA_PREF_CONFIRM_DRAW);
        return $pref;
    }

    function getPrimaryArgType()
    {
        return '';
    }
}
