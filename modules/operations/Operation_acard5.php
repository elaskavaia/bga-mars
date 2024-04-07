<?php

declare(strict_types=1);

/**
 * Special action for search for life
 */
class Operation_acard5 extends AbsOperation {
    function effect(string $color, int $inc): int {
        //reveal and discard the top card of the draw deck. If that card has a microbe tag, add a science resource here
        $tag_name = 'Microbe';
        $rc = $this->game->effect_drawAndRevealTag($color, $tag_name, true);
        if ($rc === null) return 1; // no more cards
        if ($rc !== false) {
            $this->game->effect_moveCard($color, $rc, "discard_main", 0);
            $this->game->putInEffectPool($color, "res", $this->getContext());
        }
        return 1;
    }
    function getPrimaryArgType() {
        return '';
    }
}
