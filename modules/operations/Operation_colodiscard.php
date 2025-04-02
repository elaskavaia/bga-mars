<?php

declare(strict_types=1);

/** 
 * Discard a colony tile
 */
class Operation_colodiscard extends  AbsOperation {
    function argPrimaryDetails() {
        $color = $this->color;
        $tokens = $this->game->tokens->getTokensOfTypeInLocation("card_colo", "display_colonies");
        $keys = array_keys($tokens);
        return $this->game->createArgInfo($color, $keys, function ($color, $tokenId) {
            return MA_OK;
        });
    }

    function getPrimaryArgType() {
        return 'token';
    }


    public function checkIntegrity() {
        return $this->checkIntegritySingleton();
    }

    function effect(string $owner, int $inc): int {
        $card = $this->getCheckedArg('target');

        $this->game->dbSetTokenLocation($card, 'limbo', 0, c_lienttranslate('${player_name} discards ${card_name}'), [
            'card_name' => $this->game->getTokenName($card)
        ], $this->getPlayerId());
        return $inc;
    }

    function canFail(): bool {
        return false;
    }

    function canResolveAutomatically() {
        return false;
    }

    public function getPrompt() {
        return c_lienttranslate('${you} must select a colony tile to discard');
    }

    protected function getOpName() {
        return c_lienttranslate('Discard Colony Tile');
    }
}
