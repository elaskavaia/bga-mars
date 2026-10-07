<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

/**
 * Prelude resolution: the player always chooses which prelude to handle next.
 * Picking one plays it if playable right now, otherwise sells it for 15 M€
 * (designer ruling), so the player can sell one and use the money for another.
 */
final class Operation_cardpreTest extends TestCase {
    private GameUT $game;

    protected function setUp(): void {
        $this->game = new GameUT();
        $this->game->init();
    }

    private function handPrelude(string $color, string $card_id): void {
        $this->game->tokens->moveToken($card_id, "hand_$color", 1);
    }

    private function cardpre(string $color): AbsOperation {
        return $this->game->getOperationInstanceFromType("cardpre", $color);
    }

    public function testSellUnplayablePreludeGivesFifteen() {
        $color = PCOLOR;
        // Galilean Mining needs 5 M€, Business Empire needs 6 M€ to play.
        $this->game->setTrackerValue($color, "m", 4);
        $this->handPrelude($color, "card_prelude_P13");
        $this->handPrelude($color, "card_prelude_P06");

        // both unplayable, so both are offered - player picks which to sell first
        $arg = $this->cardpre($color)->arg();
        $this->assertContains("card_prelude_P13", $arg["target"]);
        $this->assertContains("card_prelude_P06", $arg["target"]);
        // invariant kept: unplayable preludes stay q==0 valid targets, flagged via "playable"
        $this->assertEquals(0, $arg["info"]["card_prelude_P06"]["q"]);
        $this->assertNotEquals(MA_OK, $arg["info"]["card_prelude_P06"]["playable"]);
        $this->assertStringContainsString("Sell", $arg["info"]["card_prelude_P06"]["name"]);

        // sell only the one the player picked, gaining exactly 15
        $result = $this->cardpre($color)->action_resolve(["target" => "card_prelude_P06"]);
        $this->assertEquals(1, $result);
        $this->assertEquals("limbo", $this->game->tokens->getTokenLocation("card_prelude_P06"));
        $this->assertEquals(19, $this->game->getTrackerValue($color, "m"));

        // the other prelude is untouched and now affordable to play
        $this->assertEquals("hand_$color", $this->game->tokens->getTokenLocation("card_prelude_P13"));
        $arg2 = $this->cardpre($color)->arg();
        $this->assertEquals(["card_prelude_P13"], array_values($arg2["target"]));
        $this->assertEquals(MA_OK, $arg2["info"]["card_prelude_P13"]["q"]);
    }

    public function testMixedHandKeepsOrderChoice() {
        $color = PCOLOR;
        // Galilean Mining (needs 5) playable, Business Empire (needs 6) not.
        $this->game->setTrackerValue($color, "m", 5);
        $this->handPrelude($color, "card_prelude_P13");
        $this->handPrelude($color, "card_prelude_P06");

        // both are still offered even though only one is playable
        $arg = $this->cardpre($color)->arg();
        $this->assertContains("card_prelude_P13", $arg["target"]);
        $this->assertContains("card_prelude_P06", $arg["target"]);
        // both are valid targets (q==0); only the unplayable one carries "playable"
        $this->assertEquals(0, $arg["info"]["card_prelude_P13"]["q"]);
        $this->assertArrayNotHasKey("playable", $arg["info"]["card_prelude_P13"]);
        $this->assertEquals(0, $arg["info"]["card_prelude_P06"]["q"]);
        $this->assertNotEquals(MA_OK, $arg["info"]["card_prelude_P06"]["playable"]);

        // player may choose to sell the unplayable one first
        $this->cardpre($color)->action_resolve(["target" => "card_prelude_P06"]);
        $this->assertEquals("limbo", $this->game->tokens->getTokenLocation("card_prelude_P06"));
        $this->assertEquals(20, $this->game->getTrackerValue($color, "m"));
        $this->assertEquals("hand_$color", $this->game->tokens->getTokenLocation("card_prelude_P13"));
    }

    public function testPickingPlayablePreludePlaysItNotSells() {
        $color = PCOLOR;
        $this->game->setTrackerValue($color, "m", 5);
        $this->handPrelude($color, "card_prelude_P13"); // playable
        $this->handPrelude($color, "card_prelude_P06"); // not playable

        $this->cardpre($color)->action_resolve(["target" => "card_prelude_P13"]);

        // playable pick is played (queued), never sold: no limbo, no 15 M€ gain
        $this->assertNotEquals("limbo", $this->game->tokens->getTokenLocation("card_prelude_P13"));
        $this->assertEquals(5, $this->game->getTrackerValue($color, "m"));
    }

    public function testPlayablePreludesAreNotLabeledAsSell() {
        $color = PCOLOR;
        $this->game->setTrackerValue($color, "m", 30);
        $this->handPrelude($color, "card_prelude_P13");
        $this->handPrelude($color, "card_prelude_P06");

        $arg = $this->cardpre($color)->arg();
        $this->assertContains("card_prelude_P13", $arg["target"]);
        $this->assertContains("card_prelude_P06", $arg["target"]);
        // playable preludes keep the plain card-name button (no sell relabel, no "playable" flag)
        $this->assertArrayNotHasKey("name", $arg["info"]["card_prelude_P13"]);
        $this->assertArrayNotHasKey("name", $arg["info"]["card_prelude_P06"]);
    }
}
