<?php

declare(strict_types=1);


class Operation_convp extends AbsOperation {
    function effect(string $color, int $inc): int {
        $this->game->push($color, '8np:forest');
        return 1;
    }

    function isVoid(): bool {
        $color = $this->color;
        return $this->game->isVoidSingle("8np", $color) || $this->game->isVoidSingle("forest", $color);
    }
}
