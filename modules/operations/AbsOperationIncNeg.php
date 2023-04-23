<?php

declare(strict_types=1);

class AbsOperationIncNeg extends AbsOperation {
    function effect(string $owner, int $inc): int {
        $this->game->effect_incCount($owner, substr($this->mnemonic, 1), -$inc);
        return $inc;
    }

    public function isVoid($op): bool {
        $count = $op['mcount'];
        try {
            $this->game->effect_incCount($op['owner'], substr($this->mnemonic, 1), -$count, ['onlyCheck' => true]);
        } catch (Exception $e) {
            return true;
        }
        return false;
    }
}
