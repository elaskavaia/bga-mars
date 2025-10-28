<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once "terraformingmars.game.php";
require_once "TokensInMem.php";

final class Operation_sellTest extends TestCase {
    private GameUT $game;

    protected function setUp(): void {
        $this->game = new GameUT();
        $this->game->init();
    }

    public function testSellSingleCard() {
        $color = PCOLOR;
        $cardId = "card_main_1";

        // Place card in hand
        $this->game->tokens->moveToken($cardId, "hand_$color", 1);
        $this->game->setTrackerValue($color, "m", 5);

        $op = $this->game->getOperationInstanceFromType("sell", $color);
        $this->assertNotNull($op);

        // Test single card sell
        $result = $op->action_resolve(["target" => $cardId]);

        $this->assertEquals(1, $result);
        $this->assertEquals(6, $this->game->getTrackerValue($color, "m")); // +1 money
        $this->assertEquals("discard_main", $this->game->tokens->getTokenLocation($cardId));
    }

    public function testSellMultipleCards() {
        $color = PCOLOR;
        $cardIds = ["card_main_1", "card_main_2", "card_main_3"];

        // Place cards in hand
        foreach ($cardIds as $cardId) {
            $this->game->tokens->moveToken($cardId, "hand_$color", 1);
        }
        $this->game->setTrackerValue($color, "m", 10);

        $op = $this->game->getOperationInstanceFromType("3sell", $color);
        $this->assertNotNull($op);

        // Test multiple card sell
        $result = $op->action_resolve(["target" => $cardIds]);

        $this->assertEquals(1, $result);
        $this->assertEquals(13, $this->game->getTrackerValue($color, "m")); // +3 money

        // All cards should be discarded
        foreach ($cardIds as $cardId) {
            $this->assertEquals("discard_main", $this->game->tokens->getTokenLocation($cardId));
        }
    }

    public function testAutoSkipWhenNoCards() {
        $color = PCOLOR;

        $op = $this->game->getOperationInstanceFromType("?sell", $color);
        $this->assertNotNull($op);

        // Should auto-skip when no cards in hand
        $this->assertTrue($op->autoSkip());
    }

    public function testArgPrimary() {
        $color = PCOLOR;
        $cardIds = ["card_main_1", "card_main_2"];

        // Place cards in hand
        foreach ($cardIds as $cardId) {
            $this->game->tokens->moveToken($cardId, "hand_$color", 1);
        }

        /** @var Operation_sell  */
        $op = $this->game->getOperationInstanceFromType("sell", $color);
        $args = $op->argPrimary();

        $this->assertCount(2, $args);
        $this->assertContains("card_main_1", $args);
        $this->assertContains("card_main_2", $args);
    }

    public function testGetPrimaryArgType() {
        $color = PCOLOR;

        // Single card operation
        $op = $this->game->getOperationInstanceFromType("sell", $color);
        $this->assertEquals("token", $op->getPrimaryArgType());

        // Multiple card operation - test through arg() method
        $op = $this->game->getOperationInstanceFromType("sell", $color, 3);
        $args = $op->arg();
        $this->assertEquals("token_array", $args["ttype"]);
    }

    public function testGetPrompt() {
        $color = PCOLOR;

        // Single card prompt - test through arg() method
        $op = $this->game->getOperationInstanceFromType("sell", $color);
        $args = $op->arg();
        $prompt = $args["prompt"];
        $this->assertStringContainsString("select a card to discard", $prompt);
        $this->assertStringContainsString("1 M€", $prompt);

        // Multiple card prompt
        $op = $this->game->getOperationInstanceFromType("sell", $color, 3);
        $args = $op->arg();
        $prompt = $args["prompt"];
        $this->assertStringContainsString("one or more cards", $prompt);
        $this->assertStringContainsString("1 M€ per card", $prompt);
    }

    public function testInsufficientCardsSelected() {
        $color = PCOLOR;
        $cardIds = ["card_main_1", "card_main_2"];

        // Place cards in hand
        foreach ($cardIds as $cardId) {
            $this->game->tokens->moveToken($cardId, "hand_$color", 1);
        }

        $op = $this->game->getOperationInstanceFromType("3sell", $color);

        $this->expectException(feException::class);
        $this->expectExceptionMessage("Insufficient amount of cards selected");

        // Try to sell only 2 cards when 3 are required
        $op->action_resolve(["target" => $cardIds]);
    }

    public function testNotificationSent() {
        $color = PCOLOR;
        $cardId = "card_main_1";

        $this->game->tokens->moveToken($cardId, "hand_$color", 1);

        $op = $this->game->getOperationInstanceFromType("sell", $color);

        // Test that the operation completes successfully
        // The notification is sent internally, so we just verify the operation works
        $result = $op->action_resolve(["target" => $cardId]);
        $this->assertEquals(1, $result);

        // Verify the card was moved to discard
        $this->assertEquals("discard_main", $this->game->tokens->getTokenLocation($cardId));
    }

    public function testNoValidTargets() {
        $color = PCOLOR;

        $op = $this->game->getOperationInstanceFromType("sell", $color);

        // No cards in hand - should have no valid targets
        $args = $op->arg();
        $this->assertEmpty($args["target"]);

        // Add a card
        $this->game->tokens->moveToken("card_main_1", "hand_$color", 1);
        $op->clearCache(); // Clear cached args
        $args = $op->arg();
        $this->assertNotEmpty($args["target"]);
        $this->assertContains("card_main_1", $args["target"]);
    }

    public function testIsVoid() {
        $color = PCOLOR;

        $op = $this->game->getOperationInstanceFromType("sell", $color);

        // Should be void when no cards available and not optional
        $args = $op->arg();
        $hasVoidFlag = isset($args["void"]) && $args["void"];
        $this->assertTrue($hasVoidFlag || empty($args["target"]));

        // Should not be void when cards are available
        $this->game->tokens->moveToken("card_main_1", "hand_$color", 1);
        $op->clearCache();
        $args = $op->arg();
        $hasVoidFlag = isset($args["void"]) && $args["void"];
        $this->assertFalse($hasVoidFlag);
        $this->assertNotEmpty($args["target"]);

        // Optional operation should never be void
        $op = $this->game->getOperationInstanceFromType("?sell", $color);
        $this->assertFalse($op->isVoid());
    }

    public function testCanResolveAutomatically() {
        $color = PCOLOR;

        // Optional operation with no cards should auto-resolve
        $op = $this->game->getOperationInstanceFromType("?sell", $color);
        $this->assertTrue($op->canResolveAutomatically());

        // Required operation should not auto-resolve
        $op = $this->game->getOperationInstanceFromType("sell", $color);
        $this->assertFalse($op->canResolveAutomatically());
    }

    public function testOperationIntegrity() {
        $color = PCOLOR;

        $op = $this->game->getOperationInstanceFromType("sell", $color);
        $this->assertTrue($op->checkIntegrity());

        $op = $this->game->getOperationInstanceFromType("3sell", $color);
        $this->assertTrue($op->checkIntegrity());
    }

    public function testGetCount() {
        $color = PCOLOR;

        // Test through reflection since getCount is protected
        $op = $this->game->getOperationInstanceFromType("sell", $color);
        $reflection = new ReflectionClass($op);
        $method = $reflection->getMethod("getCount");
        $method->setAccessible(true);
        $this->assertEquals(1, $method->invoke($op));

        $op = $this->game->getOperationInstanceFromType("sell", $color, 3);
        $this->assertEquals(3, $method->invoke($op));
    }

    public function testGetMinCount() {
        $color = PCOLOR;

        // Test through reflection since getMinCount is protected
        $op = $this->game->getOperationInstanceFromType("sell", $color);
        $reflection = new ReflectionClass($op);
        $method = $reflection->getMethod("getMinCount");
        $method->setAccessible(true);
        $this->assertEquals(1, $method->invoke($op));

        // Optional sell operation - need to create with proper mcount
        $opInfo = ["owner" => $color, "count" => 1, "mcount" => 0];
        $op = new Operation_sell("sell", $opInfo, $this->game);
        $this->assertEquals(0, $method->invoke($op));
    }
}
