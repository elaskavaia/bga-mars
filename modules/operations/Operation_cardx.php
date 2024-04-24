<?php

declare(strict_types=1);


/**
 * Play specific card (set by data param in db)
 */
class Operation_cardx extends AbsOperation {
    function effect(string $color, int $inc): int {
        $this->game->machine->normalize();
        $this->game->effect_playCard($color, $this->getContext());
        return 1;
    }
    function getPrimaryArgType() {
        return '';
    }

    function getButtonName() {
        return clienttranslate('Play Card: ${name}');
    }

    function getPrompt() {
        return $this->getButtonName();
    }

    function getVisargs() {
        return [
            "name" => $this->game->getTokenName($this->getContext()),
            'count' => $this->getCount(),
            'i18n' => ['name']
        ];
    }
}
