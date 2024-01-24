<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

use function PHPUnit\Framework\assertEquals;
use function PHPUnit\Framework\assertNotNull;
use function PHPUnit\Framework\assertTrue;

require_once "../terraformingmars.game.php";
require_once "TokensInMem.php";


class GameStateInMem extends GameState {
}

class GameUT extends terraformingmars {
    var $multimachine;
    var $xtable;
    function __construct() {
        parent::__construct();
        include "../material.inc.php";
        include "../states.inc.php";
        $this->gamestate = new GameStateInMem($machinestates);

        $this->tokens = new TokensInMem();
        $this->xtable = [];
        $this->machine = new MachineInMem($this, 'machine', 'main', $this->xtable);
        $this->multimachine = new MachineInMem($this, 'machine', 'multi', $this->xtable);
        $this->curid = 1;
    }

    function init() {
        $this->createTokens();
    }

    function setListerts(array $l) {
        $this->eventListners = $l;
    }

    function getMultiMachine() {
        return $this->multimachine;
    }

    public $curid;

    public function getCurrentPlayerId($bReturnNullIfNotLogged = false) {
        return $this->curid;
    }


    protected function getCurrentPlayerColor() {
        return $this->getPlayerColorById($this->curid);
    }

    // override/stub methods here that access db and stuff
}

define("PCOLOR", "ff0000");
define("BCOLOR", "0000ff");
final class GameTest extends TestCase {
    public function testGameProgression() {
        $m = $this->game();
        $this->assertNotNull($m);
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
        $m->incTrackerValue('', 't', 0);
        $this->assertEquals(0, $m->evaluateExpression("(t>0)*3", PCOLOR));
        $this->assertEquals(9, $m->evaluateExpression("all_u", PCOLOR));
        $m->tokens->setTokenState('tracker_m_' . PCOLOR, 40);
        // oxygens
        $m->tokens->setTokenState('tracker_o', 9);
        $this->assertEquals(1, $m->evaluateExpression("o>=9", PCOLOR, null));
        $this->assertEquals(0, $m->evaluateExpression("o<9", PCOLOR, null));
        $this->assertEquals(1, $m->evaluateExpression("o>0", PCOLOR, null));
        $this->assertEquals(MA_ERR_PREREQ, $m->playability(PCOLOR, $m->mtFindByName('Predators')));
        $color = PCOLOR;
        //$m->tokens->setTokenState("tracker_pdelta_${color}" . PCOLOR, 2);
        $m->effect_playCard(PCOLOR, $m->mtFindByName('Adaptation Technology'));
        $m->gamestate->jumpToState(STATE_GAME_DISPATCH);
        $m->st_gameDispatch();
        $this->assertEquals(2,$m->tokens->getTokenState("tracker_pdelta_${color}"));
        $this->assertEquals(MA_OK, $m->playability(PCOLOR, $m->mtFindByName('Predators')));
        $m->tokens->setTokenState('tracker_o', 8);
        $this->assertEquals(MA_ERR_PREREQ, $m->playability(PCOLOR, $m->mtFindByName('Predators')));
        $m->tokens->setTokenState('tracker_t', -8);
        $this->assertEquals(MA_OK, $m->playability(PCOLOR, $m->mtFindByName('Arctic Algae')));
        
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
    public function testCounterComplex() {
        $m = $this->game();
        $m->incTrackerValue(PCOLOR, 'pp', 0);

        $m->effect_playCard(PCOLOR, $m->mtFind('name', 'Algae'));
        $m->effect_playCard(PCOLOR, $m->mtFind('name', 'Mangrove'));
        $m->effect_playCard(PCOLOR, $m->mtFind('name', 'Trees'));

        $m->machine->insertRule("counter('((tagPlant>=3)*4)+((tagPlant<3)*1)') pp", 1, 1, 1, PCOLOR);
        $ops = $m->machine->getTopOperations();
        $op = array_shift($ops);
        $m->executeOperationSingle($op);
        $ops = $m->machine->getTopOperations();
        $op = array_shift($ops);
        $this->assertEquals(4, $op['count']);
        $m->executeOperationSingle($op);
        $this->assertEquals(4, $m->getTrackerValue(PCOLOR, 'pp'));
    }
    public function testCounterComplex1() {
        $m = $this->game();
        $m->incTrackerValue(PCOLOR, 'pp', 0);

        $m->effect_playCard(PCOLOR, $m->mtFind('name', 'Algae'));


        $m->machine->insertRule("counter('((tagPlant>=3)*4)+((tagPlant<3)*1)') pp", 1, 1, 1, PCOLOR);
        $ops = $m->machine->getTopOperations();
        $op = array_shift($ops);
        $m->executeOperationSingle($op);
        $ops = $m->machine->getTopOperations();
        $op = array_shift($ops);
        $this->assertEquals(1, $op['count']);
        $m->executeOperationSingle($op);
        $this->assertEquals(1, $m->getTrackerValue(PCOLOR, 'pp'));
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

    public function testResolveOcean() {
        $m = $this->game();
        $m->putInEffectPool(PCOLOR, "w,w");

        $m->gamestate->jumpToState(STATE_GAME_DISPATCH);
        $m->st_gameDispatch();
        $tops = $m->machine->getTopOperations(PCOLOR);
        $op =  reset($tops);
        $args = ['target' => 'hex_5_5', 'op_info' => $op];

        $count = $m->saction_resolve($op, $args);
        $m->saction_stack($count, $op, $tops);
        $this->assertEquals(1, $count);
        $m->gamestate->jumpToState(STATE_GAME_DISPATCH);
        $m->st_gameDispatch();

        $tops = $m->machine->getTopOperations();
        $this->assertEquals(2, count($tops));
        $w = array_shift($tops);
        $pp = array_shift($tops);
        $this->assertEquals("w", $w['type']);
        $this->assertEquals("2p", $pp['type']);
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
        $op = $m->getOperationInstanceFromType("1m", PCOLOR);
        $this->assertNotNull($op);

        $op = $m->getOperationInstanceFromType("9nmu", PCOLOR);
        $this->assertNotNull($op);
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

        $m->effect_playCard(PCOLOR, "card_main_173");
        $res = $m->collectListeners(BCOLOR, "defensePlant");
        $this->assertEquals(1, count($res));
        $res = $m->collectListeners(null, "defenseAnimal");
        $this->assertEquals(1, count($res));
    }

    public function testProtectedHabitats() {
        $m = $this->game();

        $p2 = BCOLOR;
        $hab = $m->mtFind('name', 'Protected Habitats');
        $fish = $m->mtFind('name', 'Fish');

        $m->effect_playCard(BCOLOR, $fish);
        $m->dbSetTokenLocation("resource_${p2}_1", $fish, 0); // add a fish
        /** @var Operation_nores */
        $op = $m->getOperationInstanceFromType("nores(Animal)", PCOLOR);
        $args = $op->argPrimaryDetails();
        $this->assertNotNull(array_get($args, $fish));
        $this->assertEquals(MA_OK, $args[$fish]['q']); // first is ok to kill fish
        $m->effect_playCard(BCOLOR, $hab);
        $args = $op->argPrimaryDetails();
        $this->assertNotNull(array_get($args, $fish));
        $this->assertEquals(MA_ERR_RESERVED, $args[$fish]['q']); // second its protected
    }

    public function testMultiplayer() {
        $m = $this->game();
        $m->machine->push("draw", 1, 1, PCOLOR, MACHINE_OP_SEQ, '', 'multi');
        //$this->assertTrue($m->machine->xtable=== $m->getMultiMachine()->xtable);

        $this->assertNotNull($m->machine->getTopOperations());
        $top1 = $m->machine->getTopOperations();
        $this->assertEquals(1, count($top1));
        $m->machine->put("draw", 1, 1, BCOLOR, MACHINE_OP_SEQ, '', 'multi');
        $m->machine->queue("m", 1, 1, PCOLOR, MACHINE_OP_SEQ, '', 'main');
        $this->assertEquals(2, count($m->machine->getTopOperations()));
        $m->gamestate->jumpToState(STATE_GAME_DISPATCH);
        $m->st_gameDispatch();
        $p1 = $m->getPlayerIdByColor(PCOLOR);
        $this->assertEquals("multiplayerDispatch", $m->gamestate->state()['name']);
        $m->st_gameDispatchMultiplayer();
        $this->assertEquals(STATE_MULTIPLAYER_CHOICE, $m->gamestate->getPrivateState($p1));
        $m->curid = $p1;
        $op = array_shift($top1);
        $m->action_resolve(['ops' => [['op' => $op['id']]]]);
        $this->assertEquals(null, $m->gamestate->getPrivateState($p1));
        $p2 = $m->getPlayerIdByColor(BCOLOR);
        $m->curid = $p2;
        $res = $m->gamestate->getPrivateState($p2);
        $this->assertEquals(STATE_MULTIPLAYER_CHOICE, $res);

        $top1 = $m->machine->getTopOperations();
        $this->assertEquals(1, count($top1));
        $op = array_shift($top1);
        $m->action_resolve(['ops' => [['op' => $op['id']]]]);
        $this->assertEquals(null, $m->gamestate->getPrivateState($p1));
        $m->st_gameDispatchMultiplayer();
        $this->assertEquals("gameDispatch", $m->gamestate->state()['name']);
    }

    public function testCopyBu() {
        $m = $this->game();
        /** @var Operation_copybu */
        $bu = $m->getOperationInstanceFromType("copybu", PCOLOR);
        $this->assertNotNull($bu);

        $subrules = $bu->getProductionOnlyRules('npe,h', 'card_main_1');
        $this->assertEquals("npe", $subrules);

        $m->dbSetTokenLocation('tile_64', 'hex_7_9', 1);
        $m->dbSetTokenLocation('tile_67', 'hex_4_1', 1);

        $subrules = $bu->getProductionOnlyRules('', 'card_main_64');
        $this->assertEquals("pu", $subrules);

        $count = 0;
        foreach ($m->token_types as $key => $info) {
            if (!startsWith($key, 'card_main')) continue;
            if (!strstr(array_get($info, 'tags', ''), 'Building')) continue;
            $r = array_get($info, 'r', '');
            $subrules = $bu->getProductionOnlyRules($r, $key);
            //if ($r) $this->assertTrue(!!$subrules,"rules $r");    
            if ($subrules) $count += 1;
        }
        $this->assertEquals(48, $count);
    }

    public function testInstanciateAll() {
        $m = $this->game();
        foreach ($m->token_types as $key => $info) {
            if (array_get($info, 't', 0) == 0) continue;
            if (!startsWith($key, 'card_')) continue;
            $r = array_get($info, 'r', '');
            if (!$r) continue;
            echo("testing $key <$r>\n");
            /** @var AbsOperation */
            $op = $m->getOperationInstanceFromType($r, PCOLOR);
            $this->assertNotNull($op);
            $this->assertTrue($op->checkIntegrity());
        }
    }

    public function testIsVoid() {
        $m = $this->game();
        $op = $m->getOperationInstanceFromType("3m", PCOLOR);
        $this->assertNotNull($op);
        $this->assertFalse($op->isVoid());
        $this->assertTrue($op->hasNoSideEffects());
    }


    public function testIsVoidComplex() {
        $m = $this->game();
        $op = $m->getOperationInstanceFromType("3m,2pm", PCOLOR);
        $this->assertNotNull($op);
        $this->assertFalse($op->isVoid());
        $op = $m->getOperationInstanceFromType("3m,1e,3np", PCOLOR);
        $this->assertNotNull($op);
        $this->assertTrue($op->isVoid());
    }



    public function testLavaFlows() {
        $m = $this->game();
        $m->tokens->setTokenState('tracker_t', +6);
        $card_id = $m->mtFindByName('Lava Flows');
        $m->putInEffectPool(PCOLOR, '2t', $card_id);
        $m->gamestate->jumpToState(STATE_GAME_DISPATCH);
        $m->st_gameDispatch();
        $this->assertEquals(8,$m->tokens->getTokenState("tracker_t"));
        $this->assertEquals(21,$m->tokens->getTokenState("tracker_tr_ff0000"));
    }
}