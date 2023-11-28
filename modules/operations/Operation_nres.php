<?php

declare(strict_types=1);

/**
 * Remove resource from your own card
 */
class Operation_nres extends AbsOperation {

    function argPrimaryDetails() {
        $color = $this->color;
        $keys = [$this->getContext()];
        $count = $this->getMinCount();
        return $this->game->createArgInfo($color, $keys, function ($color, $tokenId) use ($count) {
            $holds = $this->game->getRulesFor($tokenId, 'holds', '');
            if (!$holds) return MA_ERR_NOTAPPLICABLE;
            $map = $this->game->getCardsWithResource($holds, $tokenId);
            $current = $map[$tokenId] ?? 0;
            if ($current >= $count) return 0;
            return MA_ERR_MANDATORYEFFECT;
        });
    }

    protected function getOpName() {
        $card = $this->getContext();
        $par = $this->game->getRulesFor($card, 'holds', '');
        return ['log' => clienttranslate('Remove ${restype_name} from ${card_name}'),  "args" => [
            "card_name" => $this->game->getTokenName($card),
            'restype_name' => $this->game->getTokenName("tag$par"),
            'i18n' => ['card_name', 'restype_name']
        ]];
    }


    function effect(string $owner, int $inc): int {
        $card = $this->getContext();
        if (!$card) throw new feException("Context is not defined for operation");


        $holds = $this->game->getRulesFor($card, 'holds', '');
        if (!$holds) throw new feException("Card '$card' cannot hold resources");

        $resources = $this->game->tokens->getTokensOfTypeInLocation("resource", $card);
        $num = $inc;
        $player_id = $this->game->getPlayerIdByColor($owner);
        foreach ($resources as $key => $info) {
            $num--;
            $this->game->effect_moveResource($owner, $key, "tableau_$owner", 0, clienttranslate('${player_name} removes ${restype_name} from ${card_name}'), $card);
            if ($num == 0) break;
        }
        if ($num > 0) throw new BgaUserException("Insufficient number of resources");
        return $inc;
    }
}
