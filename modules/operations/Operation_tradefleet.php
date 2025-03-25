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
        $fleet = $this->game->tokens->createTokenAutoInc($token, "colo_fleet");

        $this->game->dbSetTokenLocation($fleet, "colo_fleet", 0, c_lienttranslate('${player_name} gains new trade fleet'));
        return $inc;
    }

    public function checkIntegrity() {
        $c = $this->getUserCount();
        if ($c === null) $c = $this->getCount();
        if ($c != 1)
            throw new feException("Cannot use counter $c for this operation " . $this->mnemonic);
        return true;
    }


    function canFail(): bool {
        return false;
    }

    protected function getOpName() {
        return c_lienttranslate('Gain trade fleet');
    }
}
