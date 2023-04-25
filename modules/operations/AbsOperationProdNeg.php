<?php

declare(strict_types=1);

class AbsOperationProdNeg extends AbsOperation {
    function effect(string $owner, int $inc): int  {
        $this->game->effect_incProduction($owner, substr($this->mnemonic, 1), -$inc);
        return $inc;
    }

    public function isVoid(): bool {
        $op = $this->op_info;
        $count = $op['mcount'];
        try {
            $this->game->effect_incProduction($this->color, substr($this->mnemonic, 1), -$count, ['onlyCheck' => true]);
        } catch (Exception $e) {
            return true;
        }
        return false;
    }
}
