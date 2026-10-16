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

    public function testSouthPoleOceanOnDrawHexStuckBeforeBarrier() {
        $m = $this->game(2); // Hellas, south pole hex_5_9 is 6nm+w
        $m->setTrackerValue(PCOLOR, "m", 3);
        // adjacent ocean lets checkMandatoryEffect pass, adjacency bonus gives only 2
        $this->placeOceans(["hex_5_8"]);
        $m->putInEffectPool(PCOLOR, "city");
        $this->dispatch();
        $this->startChain();
        $this->resolve("city", "hex_5_9");
        $this->assertEquals(5, $m->getTrackerValue(PCOLOR, "m"));
        $this->resolve("w", "hex_6_5"); // ocean hex with draw bonus
        $this->assertTrue($m->isStuck(), "6nm void, draw postponed");
        $this->assertFalse($m->isDeadlock(), "draw was not resolved, undo still works");
    }

    public function testSummedCostsStuckBeforeBarrier() {
        $m = $this->game();
        $m->setTrackerValue(PCOLOR, "m", 4);
        $m->putInEffectPool(PCOLOR, "3nm+3nm+draw");
        $this->dispatch();
        $this->startChain();
        $this->resolve("3nm");
        $this->assertTrue($m->isStuck());
        $this->assertFalse($m->isDeadlock());
    }

    /** documents buggy behavior BGA #202081 #168636, flip asserts when fixed */
    public function testNuclearZoneFullMapPointLunaDeadlock() {
        $m = $this->game();
        $m->effect_playCorporation(PCOLOR, $m->mtFindByName("Point Luna"), false);
        $this->dispatch();
        $this->resolve("draw");
        $this->fillMap();
        $card = $m->mtFindByName("Nuclear Zone");
        $m->playability(PCOLOR, $card, $info);
        $this->assertEquals(MA_OK, $info["m"], "BUG: should be MA_ERR_MANDATORYEFFECT, map is full");
        $this->startChain();
        $m->effect_playCard(PCOLOR, $card);
        $this->dispatch();
        $this->resolve("draw"); // BUG: should be postponed, 2t,tile can fail
        $this->resolve("2t,tile");
        $this->assertEquals(["tile"], array_column($m->machine->getTopOperations(), "type"));
        $this->assertTrue($m->isDeadlock(), "BUG: tile is void after draw barrier");
    }

    /** Vastitas Borealis hex_5_5 bonus as 4nm+t: t reaches 0C, ocean bonus adjacency pays 4nm */
    private function payPoleFromTempOcean(int $money, array $oceans, string $hex) {
        $m = $this->game(3);
        $m->setTrackerValue(PCOLOR, "m", $money);
        $m->tokens->setTokenState("tracker_t", -2);
        $this->placeOceans($oceans);
        $this->startChain();
        $m->putInEffectPool(PCOLOR, "4nm+t");
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

    /** documents current material 4nm,t: pay first, so the same play is refused; flip when it becomes 4nm+t */
    public function testPoleOrderedPayFirstRefused() {
        $m = $this->game(3);
        $m->setTrackerValue(PCOLOR, "m", 0);
        $m->tokens->setTokenState("tracker_t", -2);
        $this->placeOceans(["hex_3_3", "hex_4_3"]);
        $this->startChain();
        $m->putInEffectPool(PCOLOR, $m->getRulesFor("hex_5_5", "r"));
        $this->dispatch();
        $this->assertTrue($m->isStuck(), "4nm must be paid before t");
        $this->assertFalse($m->isDeadlock());
    }

    private function inPlay(string $name) {
        $m = $this->game;
        $card = $m->mtFindByName($name);
        $m->tokens->moveToken($card, "tableau_" . PCOLOR, MA_CARD_STATE_TAGUP);
        $m->clearEventListenerCache();
        return $card;
    }

    private function isPostponed(string $type): bool {
        $m = $this->game;
        $tops = $m->machine->getTopOperations();
        $args = $m->arg_operations($tops)["operations"];
        foreach ($tops as $i => $op) {
            if ($op["type"] == $type) {
                return (bool) array_get($args[$i], "args.postpone");
            }
        }
        $this->fail("no top op $type");
    }

    // Legal plays refused today. Tests assert current behavior and fail when fixed, then flip them.

    /** BGA #220016: Tharsis place_city 3m covers 6nm */
    public function testSouthPoleTharsisRefused() {
        $m = $this->game(2);
        $this->inPlay("Tharsis Republic");
        $m->setTrackerValue(PCOLOR, "m", 4);
        $card = $m->mtFindByName("Research Outpost");
        $op = $m->getOperationInstanceFromType("city(adj_no)", PCOLOR, 1, $card);
        $this->assertEquals(MA_ERR_MANDATORYEFFECT, $op->argPrimaryDetails()["hex_5_9"]["q"], "BUG: should be MA_OK");
    }

    /** BGA #173222: ocean next to an ocean gives 2, enough for 3nm */
    public function testAquiferTurbinesRefused() {
        $m = $this->game();
        $m->setTrackerValue(PCOLOR, "m", 1);
        $this->placeOceans(["hex_5_5"]); // hex_4_5 is a free ocean hex next to it
        $card = $m->mtFindByName("Aquifer Turbines");
        $m->tokens->moveToken($card, "hand_" . PCOLOR, 0);
        $m->playability(PCOLOR, $card, $info);
        $this->assertEquals(MA_ERR_MANDATORYEFFECT, $info["m"], "BUG: should be MA_OK");
    }

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

    /** Nuclear Zone as 2t+tile instead of 2t,tile: 2t crosses 0C, ocean bonus lands on a draw hex */
    public function testUnorderedTempOceanDrawStuckBeforeBarrier() {
        $m = $this->game();
        $this->fillMap(["hex_6_1"]); // ocean hex with draw bonus
        $m->tokens->setTokenState("tracker_t", -4);
        $card = $m->mtFindByName("Nuclear Zone");
        $this->startChain();
        $m->putInEffectPool(PCOLOR, "2t+tile", "$card:r");
        $this->dispatch();
        $this->resolve("2t");
        $this->resolve("w", "hex_6_1");
        $this->assertEqualsCanonicalizing(["tile", "draw"], array_column($m->machine->getTopOperations(), "type"));
        $this->assertTrue($m->isStuck(), "tile void, draw postponed");
        $this->assertFalse($m->isDeadlock());
    }
}
