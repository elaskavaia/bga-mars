<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

final class ComplexOperationTest extends TestCase {
    private GameUT $game;

    protected function setUp(): void {
        $this->game = new GameUT();
        $this->game->init();
    }

    private function op(string $type): AbsOperation {
        return $this->game->getOperationInstanceFromType($type, PCOLOR);
    }

    public function testSimpleOps() {
        $this->assertTrue($this->op("4nm")->canFail());
        $this->assertTrue($this->op("discard")->canFail());
        $this->assertFalse($this->op("t")->canFail());
        $this->assertFalse($this->op("2p")->canFail());
        $this->assertFalse($this->op("draw")->canFail());
    }

    public function testCanFailByOperator() {
        $cases = [
            // and: can fail if any part can fail
            "t+4nm" => true,
            "4nm+t" => true,
            "t+2p" => false,
            "t,4nm" => true,
            "t,2p" => false,
            "t;4nm" => true,
            "t;2p" => false,
            "4nm:t" => true,
            "2p:t" => false,
            "draw+4nm" => true,
            // or: can fail only if all options can fail
            "t/4nm" => false,
            "4nm/t" => false,
            "4nm/discard" => true,
            "t/2p" => false,
            // optional never fails
            "?(t+4nm)" => false,
            "?(4nm/discard)" => false,
        ];
        foreach ($cases as $type => $expected) {
            $this->assertEquals($expected, $this->op($type)->canFail(), $type);
        }
    }

    /** order() is what postponement looks at: below MA_ORDER_FAIL means can fail */
    public function testOrderMatchesCanFail() {
        foreach (["t+4nm", "t,4nm", "t;4nm", "4nm:t", "4nm/discard", "t+2p", "t,2p", "t/4nm", "?(t+4nm)"] as $type) {
            $op = $this->op($type);
            $this->assertEquals($op->canFail(), ($op->order() & MA_ORDER_FAIL) == 0, $type);
        }
    }

    public function testOrderKeepsNoUndo() {
        $this->assertGreaterThanOrEqual(MA_ORDER_NOUNDO, $this->op("draw+4nm")->order());
        $this->assertGreaterThanOrEqual(MA_ORDER_NOUNDO, $this->op("discard:draw")->order());
        // DelegatedOperation passes order to its delegate
        $this->assertGreaterThanOrEqual(MA_ORDER_NOUNDO, $this->op("?(discard:draw)")->order());
    }

    private function drawPostponedNextTo(string $type): bool {
        $m = $this->game;
        $m->setTrackerValue(PCOLOR, "m", 0);
        $m->putInEffectPool(PCOLOR, "draw+$type");
        $m->gamestate->jumpToState(STATE_GAME_DISPATCH);
        $m->st_gameDispatch();
        return $m->isPostponed("draw");
    }

    public function testDrawPostponedNextToAnd() {
        $this->assertTrue($this->drawPostponedNextTo("(t+4nm)"));
    }

    public function testDrawNotPostponedNextToOrWithSafeOption() {
        $this->assertFalse($this->drawPostponedNextTo("(t/4nm)"));
    }
}
