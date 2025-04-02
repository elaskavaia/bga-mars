<?php

declare(strict_types=1);

/** Gain new trade fleet
 */
class Operation_tradefleet extends  AbsOperation {

    function getPrimaryArgType() {
        return '';
    }

    function effect(string $owner, int $inc): int {
        $token = "fleet_{$owner}";
        $fleet = $this->game->tokens->createTokenAutoInc($token, "colo_fleet", 0, 1);

        $this->game->dbSetTokenLocation($fleet, "colo_fleet", 0, c_lienttranslate('${player_name} gains new trade fleet'));
        return $inc;
    }

    public function checkIntegrity() {
        return $this->checkIntegritySingleton();
    }

    function canFail(): bool {
        return false;
    }

    protected function getOpName() {
        return c_lienttranslate('Gain trade fleet');
    }
}
