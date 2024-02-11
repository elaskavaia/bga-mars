<?php

declare(strict_types=1);

require_once "AbsOperationTile.php";

class Operation_acard66 extends  AbsOperationTile {

    function getTileType(): int {
        return 0;
    }


    function checkPlacement($color, $location, $info, $map) {
        if (isset($info['reserved'])) return MA_ERR_RESERVED;
        return 0;
    }

    function effect(string $owner, int $inc): int {
        $object = $this->getCheckedArg('target');
        $this->game->checkColor($owner);
        $player_id = $this->game->getPlayerIdByColor($owner);
        $marker = $this->game->createPlayerMarker($owner);
        $this->game->dbSetTokenLocation($marker, $object, 0, '', [], $player_id);
        return $inc;
    }

    public function getPrompt() {
        return clienttranslate('${you} select a non-reserved area for land claim');
    }

    protected function getOpName() {
        return clienttranslate('Claim land');
    }
}
