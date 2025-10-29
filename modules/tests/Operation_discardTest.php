<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once "terraformingmars.game.php";
require_once "TokensInMem.php";

final class Operation_discardTest extends TestCase {
    private GameUT $game;

    protected function setUp(): void {
        $this->game = new GameUT();
        $this->game->init();
    }

    public function testDiscardWithPresetCard() {
        $color = PCOLOR;
        $cardId = "card_main_1";

        $this->game->tokens->moveToken($cardId, "hand_$color", 1);

        $opInfo = ["owner" => $color, "data" => ":::$cardId"];
        $op = new Operation_discard("discard", $opInfo, $this->game);

        $result = $op->effect($color, 1);

        $this->assertEquals(1, $result);
        $this->assertEquals("discard_main", $this->game->tokens->getTokenLocation($cardId));
    }

    public function testDiscardWithUserSelection() {
        $color = PCOLOR;
        $cardId = "card_main_1";

        $this->game->tokens->moveToken($cardId, "hand_$color", 1);

        $op = $this->game->getOperationInstanceFromType("discard", $color);
        $result = $op->action_resolve(["target" => $cardId]);

        $this->assertEquals(1, $result);
    }

    public function testAutoSkip() {
        $color = PCOLOR;

        $op = $this->game->getOperationInstanceFromType("?discard", $color);
        $this->assertTrue($op->autoSkip());
    }

    public function testArgPrimary() {
        $color = PCOLOR;
        $cardIds = ["card_main_1", "card_main_2"];

        foreach ($cardIds as $cardId) {
            $this->game->tokens->moveToken($cardId, "hand_$color", 1);
        }

        /** @var Operation_discard  */
        $op = $this->game->getOperationInstanceFromType("discard", $color);
        $args = $op->argPrimary();

        $this->assertCount(2, $args);
        $this->assertContains("card_main_1", $args);
        $this->assertContains("card_main_2", $args);
    }

    public function testRequireConfirmation() {
        $color = PCOLOR;

        $op = $this->game->getOperationInstanceFromType("discard", $color);
        $this->assertTrue($op->requireConfirmation());
    }

    public function testGetPrimaryArgType() {
        $color = PCOLOR;

        $op = $this->game->getOperationInstanceFromType("discard", $color);
        $this->assertEquals("token", $op->getPrimaryArgType());
    }

    public function testNoValidTargets() {
        $color = PCOLOR;

        $op = $this->game->getOperationInstanceFromType("discard", $color);
        $this->assertTrue($op->noValidTargets());

        $this->game->tokens->moveToken("card_main_1", "hand_$color", 1);
        $op->clearCache();
        $this->assertFalse($op->noValidTargets());
    }

    public function testCanFail() {
        $color = PCOLOR;

        $op = $this->game->getOperationInstanceFromType("discard", $color);
        $this->assertTrue($op->canFail());

        $opInfo = ["owner" => $color, "mcount" => 0];
        $op = new Operation_discard("discard", $opInfo, $this->game);
        $this->assertFalse($op->canFail());
    }

    public function testGetPrompt() {
        $color = PCOLOR;

        $op = $this->game->getOperationInstanceFromType("discard", $color);
        $args = $op->arg();
        $this->assertStringContainsString("select a card to discard", $args["prompt"]);

        $opInfo = ["owner" => $color, "data" => ":::card_main_1"];
        $op = new Operation_discard("discard", $opInfo, $this->game);
        $args = $op->arg();
        $this->assertStringContainsString("confirm that you want to DISCARD", $args["prompt"]);
    }
}
