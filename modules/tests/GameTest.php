<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once "../mars.game.php";
require_once "TokensInMem.php";

class GameUT extends mars {


    function __construct() {
        parent::__construct();
        include "../material.inc.php";
        include "../states.inc.php";
        $this->gamestate = new GameState($machinestates);

        $this->tokens = new TokensInMem();
        $this->machine = new MachineInMem($this);
    }

    function init() {
        $this->createTokens();
    }

    function setListerts(array $l) {
        $this->eventListners = $l;
    }

    function getMultiMachine(){
        return new MachineInMem($this,'machine','multi');
    }
    // override/stub methods here that access db and stuff
}

define("PCOLOR", "ff0000");
define("BCOLOR", "0000ff");
final class GameTest extends TestCase {
    public function testGameProgression() {
        $m = $this->game();
        $this->assertNotFalse($m);
        $this->assertEquals(0, $m->getGameProgression());
        $m->tokens->setTokenState('tracker_o', 5);
        $this->assertTrue($m->getGameProgression() > 0);
        $m->tokens->setTokenState('tracker_o', 14);
        $m->tokens->setTokenState('tracker_w', 9);
        $m->tokens->setTokenState('tracker_t', 8);
        $this->assertTrue($m->getGameProgression() == 100);
    }

    public function testOps() {
        $m = $this->game();
        $res = $m->executeImmediately(PCOLOR, 'm', 1);
        $this->assertTrue($res);
    }

    private function game() {
        $m = new GameUT();
        $m->init();
        return $m;
    }


    public function testArgIfo() {
        $info = $this->game()->createArgInfo(PCOLOR, ["a", "b"], function ($a, $b) {
            return 0;
        });
        $this->assertTrue($info["a"]['q'] == 0);
    }

    public function testEvalute() {
        $m = $this->game();


        $m->incTrackerValue(PCOLOR, 'u', 8);
        $m->incTrackerValue(BCOLOR, 'u', 2);
        $this->assertEquals(8, $m->evaluateExpression("u", PCOLOR));
        $this->assertEquals(1, $m->evaluateExpression("u > 1", PCOLOR));
        $m->tokens->setTokenState('tracker_u_' . PCOLOR, 7);
        $this->assertEquals(3, $m->evaluateExpression("u/2", PCOLOR));
        $this->assertEquals(3, $m->evaluateExpression("(u>0)*3", PCOLOR));
        $m->tokens->setTokenState('tracker_t_' . PCOLOR, 0);
        $this->assertEquals(0, $m->evaluateExpression("(t>0)*3", PCOLOR));
        $this->assertEquals(9, $m->evaluateExpression("all_u", PCOLOR));
    }


    public function testCounterCall() {
        $m = $this->game();
        $m->incTrackerValue(PCOLOR, 'u', 8);
        // $m->incTrackerValue(PCOLOR,'u',8);
        $m->machine->insertRule("counter(u) m", 1, 1, 1, PCOLOR);
        $ops = $m->machine->getTopOperations();
        $op = array_shift($ops);
        $m->executeOperationSingle($op);
        $ops = $m->machine->getTopOperations();
        $op = array_shift($ops);
        $this->assertEquals(8, $op['count']);
    }

    public function testPut() {
        $m = $this->game();
        $value = $m->getTrackerValue(PCOLOR, 's');
        $this->assertEquals(0, $value);
        $m->putInEffectPool(PCOLOR, "2s");
        $m->gamestate->jumpToState(STATE_GAME_DISPATCH);
        $m->st_gameDispatch();
        $value = $m->getTrackerValue(PCOLOR, 's');
        $this->assertEquals(2, $value);
    }

    public function testResolveAcivate() {
        $m = $this->game();
        $m->incTrackerValue(PCOLOR, 'e', 4);
        $value = $m->getTrackerValue(PCOLOR, 'e');
        $this->assertEquals(4, $value);
        $card = 'card_main_101';
        $m->tokens->moveToken($card, "tableau_" . PCOLOR, 2);
        $op = $m->machine->createOperationSimple('activate', PCOLOR);
        $args = ['target' => $card, 'op_info' => $op];
        $count = $m->saction_resolve($op, $args);
        $m->gamestate->jumpToState(STATE_GAME_DISPATCH);
        $m->st_gameDispatch();
        $this->assertEquals(1, $count);
        $value = $m->getTrackerValue(PCOLOR, 's');
        $this->assertEquals(1, $value);
    }

    public function testEffectMatch() {
        $m = $this->game();
        $res = [];
        $this->assertTrue($m->mtMatchEvent("a:x", PCOLOR, "a", PCOLOR, $res));
        $this->assertFalse($m->mtMatchEvent("a:x", PCOLOR, "ab", PCOLOR, $res));

        $this->assertTrue($m->mtMatchEvent("'/play_.*b/':x", PCOLOR, "play_a_b", PCOLOR, $res));
        $this->assertFalse($m->mtMatchEvent("'/play_.*c/':x", PCOLOR, "play_a_b", PCOLOR, $res));
    }

    public function testInstanciate() {
        $m = $this->game();
        $m->getOperationInstanceFromType("1m", PCOLOR);
        $this->assertNotNull($m);

        $m->getOperationInstanceFromType("9nmu", PCOLOR);
        $this->assertNotNull($m);
    }

    public function testListeners() {
        $m = $this->game();
        $m->setListerts([
            'card_1' => ['e' => 'play_card:nop;onPay_card:2m', 'owner' => PCOLOR, 'key' => 'card_1'],
            'card_2' => ['e' => 'onPay_cardSpaceEvent:2m', 'owner' => PCOLOR, 'key' => 'card_2']
        ]);
        $res = $m->collectListeners(PCOLOR, "play_card", "xxx");
        $this->assertNotNull($res);
        $this->assertEquals(1, count($res));
        $this->assertEquals('nop', $res[0]['outcome']);

        $dis = $m->collectDiscounts(PCOLOR, "card_main_1");
        $this->assertEquals(2, $dis);

        $dis = $m->collectDiscounts(PCOLOR, "card_main_9");
        $this->assertEquals(4, $dis);

        $m->effect_cardInPlay(PCOLOR,"card_main_173");
        $res = $m->collectListeners(BCOLOR, "defensePlant");
        $this->assertEquals(1, count($res));
    }
}
