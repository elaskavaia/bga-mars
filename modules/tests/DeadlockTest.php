<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

/** see misc/docs/GAME_BLOCKING.md */
final class DeadlockTest extends TestCase {
    private GameUT $game;

    private function game(int $map = 0) {
        $this->game = (new GameUT())->init($map);
        return $this->game;
    }

    private function dispatch() {
        $this->game->gamestate->jumpToState(STATE_GAME_DISPATCH);
        $this->game->st_gameDispatch();
    }

    private function resolve(string $type, $target = null) {
        $m = $this->game;
        $ops = array_filter($m->machine->getTopOperations(), fn($op) => $op["type"] == $type);
        $this->assertNotEmpty($ops, "no top op $type");
        $args = ["op" => reset($ops)["id"]];
        if ($target !== null) {
            $args["target"] = $target;
        }
        $m->action_resolve(["ops" => [$args]]);
        $this->dispatch();
    }

    private function startChain() {
        $this->game->barriers = [];
    }

    private function fillMap(array $except = []) {
        $m = $this->game;
        $hexes = array_keys(array_filter($m->getPlanetMap(), fn($info) => !isset($info["inspace"])));
        $hexes = array_values(array_diff($hexes, $except));
        $tiles = array_values(array_filter(array_keys($m->tokens->getTokensOfTypeInLocation("tile_", null)), fn($t) => !startsWith($t, "tile_3_")));
        foreach ($hexes as $i => $hex) {
            $m->tokens->moveToken($tiles[$i], $hex, 0);
        }
        $m->clean_cache();
    }

    /** w takes ocean tiles from tile_3_1 up, so use the top ones */
    private function placeOceans(array $hexes) {
        foreach ($hexes as $i => $hex) {
            $this->game->tokens->moveToken("tile_3_" . (9 - $i), $hex, 0);
        }
        $this->game->clean_cache();
    }

    public function testSouthPoleOceanOnDrawHexSoftBlocked() {
        $m = $this->game(2); // Hellas, south pole hex_5_9 is w+6nm
        $m->setTrackerValue(PCOLOR, "m", 3);
        $this->placeOceans(["hex_5_8"]); // adjacency bonus gives only 2
        $m->putInEffectPool(PCOLOR, "city");
        $this->dispatch();
        $this->startChain();
        $this->resolve("city", "hex_5_9");
        $this->assertEquals(5, $m->getTrackerValue(PCOLOR, "m"));
        $this->resolve("w", "hex_6_5"); // ocean hex with draw bonus
        $this->assertTrue($m->isSoftBlocked(), "6nm void, draw postponed");
    }

    public function testSummedCostsSoftBlocked() {
        $m = $this->game();
        $m->setTrackerValue(PCOLOR, "m", 4);
        $m->putInEffectPool(PCOLOR, "3nm+3nm+draw");
        $this->dispatch();
        $this->startChain();
        $this->resolve("3nm");
        $this->assertTrue($m->isSoftBlocked());
    }

    private function inPlay(string $name) {
        $m = $this->game;
        $card = $m->mtFindByName($name);
        $m->tokens->moveToken($card, "tableau_" . PCOLOR, MA_CARD_STATE_TAGUP);
        $m->clearEventListenerCache();
        return $card;
    }

    private function isPostponed(string $type): bool {
        return $this->game->isPostponed($type);
    }

    /** BGA #202081 #168636: tile+2t, isVoid sees tile, so the card is refused on a full map */
    public function testNuclearZoneFullMapPointLuna() {
        $m = $this->game();
        $this->inPlay("Point Luna");
        $this->fillMap();
        $card = $m->mtFindByName("Nuclear Zone");
        $m->playability(PCOLOR, $card, $info);
        $this->assertEquals(MA_ERR_MANDATORYEFFECT, $info["m"]);
        $this->startChain();
        $m->effect_playCard(PCOLOR, $card); // play anyway
        $this->dispatch();
        $this->assertTrue($this->isPostponed("draw"), "tile+2t can fail");
        $this->assertTrue($m->isSoftBlocked(), "tile+2t void, draw postponed");
    }

    /** Nuclear Zone tile+2t: 2t crosses 0C, ocean bonus lands on a draw hex */
    public function testNuclearZoneTempOceanDrawSoftBlocked() {
        $m = $this->game();
        $this->fillMap(["hex_6_1"]); // ocean hex with draw bonus
        $m->tokens->setTokenState("tracker_t", -4);
        $card = $m->mtFindByName("Nuclear Zone");
        $this->startChain();
        $m->putInEffectPool(PCOLOR, $m->getRulesFor($card), "$card:r");
        $this->dispatch();
        $this->resolve("2t");
        $this->resolve("w", "hex_6_1");
        $this->assertEqualsCanonicalizing(["tile", "draw"], array_column($m->machine->getTopOperations(), "type"));
        $this->assertTrue($m->isSoftBlocked(), "tile void, draw postponed");
    }

    /** Vastitas Borealis hex_5_5 bonus t+4nm: t reaches 0C, ocean bonus adjacency pays 4nm */
    private function payPoleFromTempOcean(int $money, array $oceans, string $hex) {
        $m = $this->game(3);
        $m->setTrackerValue(PCOLOR, "m", $money);
        $m->tokens->setTokenState("tracker_t", -2);
        $this->placeOceans($oceans);
        $this->startChain();
        $m->putInEffectPool(PCOLOR, $m->getRulesFor("hex_5_5", "r"));
        $this->dispatch();
        $this->resolve("t");
        $this->resolve("w", $hex);
        $this->assertEquals(4, $m->getTrackerValue(PCOLOR, "m"));
        $this->resolve("4nm");
        $this->assertEquals(0, $m->getTrackerValue(PCOLOR, "m"));
        $this->assertFalse($m->isStuck());
    }

    public function testPoleOceanBetweenTwoOceansPays() {
        $this->payPoleFromTempOcean(0, ["hex_3_3", "hex_4_3"], "hex_4_4");
    }

    public function testPoleOceanNextToOneOceanPaysWithMoneyInHand() {
        $this->payPoleFromTempOcean(2, ["hex_4_4"], "hex_3_5");
    }

    private function cityStatus(string $hex): int {
        return $this->game->getOperationInstanceFromType("city", PCOLOR)->argPrimaryDetails()[$hex]["q"];
    }

    /** BGA #220016: Tharsis place_city 3m covers 6nm */
    public function testSouthPoleTharsisAllowed() {
        $m = $this->game(2);
        $this->inPlay("Tharsis Republic");
        $m->setTrackerValue(PCOLOR, "m", 4);
        $card = $m->mtFindByName("Research Outpost");
        $op = $m->getOperationInstanceFromType("city(adj_no)", PCOLOR, 1, $card);
        $this->assertEquals(MA_OK, $op->argPrimaryDetails()["hex_5_9"]["q"]);
    }

    /** Hellas south pole w+6nm: bonus ocean next to two oceans gives 4 */
    public function testSouthPoleBonusOceanRebateAllowed() {
        $m = $this->game(2);
        $this->placeOceans(["hex_7_5", "hex_8_5"]);
        $m->setTrackerValue(PCOLOR, "m", 2);
        $this->assertEquals(MA_OK, $this->cityStatus("hex_5_9"));
    }

    /** cannot pay even with the rebate, still allowed, ends in a soft block */
    public function testSouthPoleNotEnoughAllowed() {
        $m = $this->game(2);
        $this->placeOceans(["hex_7_5", "hex_8_5"]);
        $m->setTrackerValue(PCOLOR, "m", 1);
        $this->assertEquals(MA_OK, $this->cityStatus("hex_5_9"));
    }

    /** Vastitas Borealis hex_5_5 t+4nm: t reaches 0C, temperature ocean next to two oceans gives 4 */
    public function testPoleTempOceanRebateAllowed() {
        $m = $this->game(3);
        $this->placeOceans(["hex_8_5", "hex_7_6"]); // hex_7_5 is a free ocean hex next to both
        $m->tokens->setTokenState("tracker_t", -2);
        $m->setTrackerValue(PCOLOR, "m", 0);
        $this->assertEquals(MA_OK, $this->cityStatus("hex_5_5"));
    }

    /** temperature does not reach the ocean bonus, still allowed, ends in a soft block */
    public function testPoleTempOceanNotReachedAllowed() {
        $m = $this->game(3);
        $this->placeOceans(["hex_8_5", "hex_7_6"]);
        $m->tokens->setTokenState("tracker_t", -4);
        $m->setTrackerValue(PCOLOR, "m", 0);
        $this->assertEquals(MA_OK, $this->cityStatus("hex_5_5"));
    }

    /** reordering like w+6nm relies on global parameter ops never being void, even when maxed */
    public function testParamOpsNotVoidAtMax() {
        $m = $this->game();
        $m->tokens->setTokenState("tracker_w", 9);
        $m->tokens->setTokenState("tracker_t", 8);
        $m->tokens->setTokenState("tracker_o", 14);
        $m->setTrackerValue(PCOLOR, "m", 0);
        foreach (["w", "t", "o", "w+6nm", "t+4nm"] as $rule) {
            $this->assertFalse($m->isVoidSingle($rule, PCOLOR), $rule);
        }
    }

    private function aquifer(int $money) {
        $m = $this->game();
        $m->setTrackerValue(PCOLOR, "m", $money);
        $card = $m->mtFindByName("Aquifer Turbines");
        $m->tokens->moveToken($card, "hand_" . PCOLOR, 0);
        return $card;
    }

    /**
     * BGA #173222: legal play refused, ocean next to an ocean gives 2, enough for 3nm.
     * Kept refused on purpose: a playable prelude cannot be sold for 15 M, so reordering to
     * w+2pe+3nm would hard block a player who cannot pay, see GAME_BLOCKING.md
     */
    public function testAquiferTurbinesRefused() {
        $card = $this->aquifer(1);
        $m = $this->game;
        $this->placeOceans(["hex_5_5"]); // hex_4_5 is a free ocean hex next to it
        $m->playability(PCOLOR, $card, $info);
        $this->assertEquals(MA_ERR_MANDATORYEFFECT, $info["m"], "BUG: should be MA_OK");
    }

    public function testAquiferTurbinesCanBeSold() {
        $card = $this->aquifer(1);
        $op = $this->game->getOperationInstanceFromType("cardpre", PCOLOR);
        $this->assertNotEquals(MA_OK, $op->argPrimaryDetails()[$card]["playable"] ?? MA_OK, "sell for 15 offered");
    }

    /** t+4nm can fail, so the Mars U swap waits until 4nm is paid */
    public function testPoleMarsUSwapSoftBlocked() {
        $m = $this->game(3);
        $this->inPlay("Mars University");
        $m->tokens->moveToken("card_main_1", "hand_" . PCOLOR, 0);
        $m->setTrackerValue(PCOLOR, "m", 0);
        $this->startChain();
        $m->effect_playCard(PCOLOR, $m->mtFindByName("Research Outpost"));
        $this->dispatch();
        $this->resolve("city(adj_no)", "hex_5_5");
        $this->assertTrue($this->isPostponed("?(discard:draw)"), "4nm can fail");
        $this->resolve("t+4nm");
        $this->resolve("t");
        $this->assertTrue($m->isSoftBlocked(), "4nm void, swap postponed");
    }

    // Legal plays refused today. Tests assert current behavior and fail when fixed, then flip them.

    /** BGA #225898: Poseidon place_colony pm compensates 2npm */
    public function testMinorityRefugePoseidonRefused() {
        $m = $this->game = (new GameUT())->init(0, 1);
        $this->inPlay("Poseidon");
        $m->setTrackerValue(PCOLOR, "pm", -4);
        $m->playability(PCOLOR, $m->mtFindByName("Minority Refuge"), $info);
        $this->assertEquals(MA_ERR_MANDATORYEFFECT, $info["m"], "BUG: should be MA_OK");
    }

    /** BGA #204898: Mars U swap cannot be chosen before the city */
    public function testMarsUSwapPostponedBeforeCity() {
        $m = $this->game();
        $this->inPlay("Mars University");
        $m->tokens->moveToken("card_main_1", "hand_" . PCOLOR, 0);
        $m->effect_playCard(PCOLOR, $m->mtFindByName("Research Outpost"));
        $this->dispatch();
        $this->assertTrue($this->isPostponed("?(discard:draw)"), "BUG: swap first is legal");
    }

    /** BGA #180335: Robotic Workforce is not playable without a copy target, so copybu cannot fail */
    public function testMarsUSwapPostponedBeforeCopy() {
        $m = $this->game();
        $this->inPlay("Mars University");
        $this->inPlay("Power Plant");
        $m->tokens->moveToken("card_main_1", "hand_" . PCOLOR, 0);
        $m->effect_playCard(PCOLOR, $m->mtFindByName("Robotic Workforce"));
        $this->dispatch();
        $this->assertTrue($this->isPostponed("?(discard:draw)"), "BUG: swap first is legal");
    }
}
