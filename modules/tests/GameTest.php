<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

use function PHPUnit\Framework\assertEquals;
use function PHPUnit\Framework\assertNotNull;
use function PHPUnit\Framework\assertTrue;

require_once "terraformingmars.game.php";
require_once "TokensInMem.php";


class GameStateInMem extends GameState {
}

define("PCOLOR", "ff0000");
define("BCOLOR", "0000ff");

class GameUT extends terraformingmars {
    var $multimachine;
    var $xtable;
    function __construct() {
        parent::__construct();
        include "./material.inc.php";
        include "./states.inc.php";
        $this->gamestate = new GameStateInMem($machinestates);

        $this->tokens = new TokensInMem();
        $this->xtable = [];
        $this->machine = new MachineInMem($this, 'machine', 'main', $this->xtable);
        $this->multimachine = new MachineInMem($this, 'machine', 'multi', $this->xtable);
        $this->curid = 1;
    }

    function init() {
        $this->createTokens();
        $this->gamestate->changeActivePlayer(PCOLOR);
        $this->gamestate->jumpToState(STATE_PLAYER_TURN_CHOICE);
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

    function loadPlayersBasicInfos() {
        $default_colors = array(PCOLOR, BCOLOR);
        $values = array();
        $id = 1;
        foreach ($default_colors as $color) {
            $values[$id] = array('player_id' => $id, 'player_color' => $color, 'player_name' => "player$id", 'player_zombie' => 0, 'player_no' => $id, 'player_eliminated' => 0);
            $id++;
        }
        return $values;
    }

    function fakeUserAction($op, $target = null) {
        $args = ['op_info' => $op];
        if ($target !== null) $args['target'] = $target;
        $count = $this->saction_resolve($op, $args);
        return $this->saction_stack($count, $op);
    }

    // override/stub methods here that access db and stuff
}


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
        $this->assertEquals(2, $m->tokens->getTokenState("tracker_pdelta_${color}"));
        $this->assertEquals(MA_OK, $m->playability(PCOLOR, $m->mtFindByName('Predators')));
        $m->tokens->setTokenState('tracker_o', 8);
        $this->assertEquals(MA_ERR_PREREQ, $m->playability(PCOLOR, $m->mtFindByName('Predators')));
        $m->tokens->setTokenState('tracker_t', -8);
        $this->assertEquals(MA_OK, $m->playability(PCOLOR, $m->mtFindByName('Arctic Algae')));
    }

    public function testEvalute2() {
        $m = $this->game();
        $this->assertEquals(0, $m->evaluateExpression("vptag", PCOLOR, $m->mtFindByName('Nuclear Zone')));
        $this->assertEquals(1, $m->evaluateExpression("vptag", PCOLOR, $m->mtFindByName('Lightning Harvest')));
        $this->assertEquals(1, $m->evaluateExpression("vptag", PCOLOR, $m->mtFindByName('Ants')));
        $this->assertEquals(8, $m->evaluateExpression("cost", PCOLOR, $m->mtFindByName('Lightning Harvest')));
    }

    public function testEvaluateTagCount() {
        $m = $this->game();
        $card = $m->mtFindByName('Power Infrastructure');
        $m->effect_playCard(PCOLOR, $card);
        $m->gamestate->jumpToState(STATE_GAME_DISPATCH);
        $m->st_gameDispatch();
        $this->assertEquals(1, $m->evaluateExpression("tagBuilding==1", PCOLOR, null));

        $card = $m->mtFindByName('Research Coordination');
        $m->effect_playCard(PCOLOR, $card);
        $m->gamestate->jumpToState(STATE_GAME_DISPATCH);
        $m->st_gameDispatch();
        $this->assertEquals(1, $m->evaluateExpression("tagBuilding==1", PCOLOR, null));
        $this->assertEquals(1, $m->evaluateExpression("tagBuilding==2", PCOLOR, null, ['wilds' => []]));
    }

    public function testEvaluateTagCountAdvancedEcosystems() {
        $m = $this->game();
        $color = PCOLOR;
        $card = $m->mtFindByName('Advanced Ecosystems');
        $q = $m->precondition(PCOLOR,$card);
        $this->assertEquals(MA_ERR_PREREQ, $q);

        $m->tokens->setTokenState("tracker_tagPlant_${color}", 1);
        $m->tokens->setTokenState("tracker_tagAnimal_${color}", 1);
        $m->tokens->setTokenState("tracker_tagMicrobe_${color}", 1);
        $q = $m->precondition(PCOLOR,$card);
        $this->assertEquals(MA_OK, $q);

        $m->tokens->setTokenState("tracker_tagPlant_${color}", 0);
        $q = $m->precondition(PCOLOR,$card);
        $this->assertEquals(MA_ERR_PREREQ, $q);

        $m->tokens->setTokenState("tracker_tagWild_${color}", 1);
        $q = $m->precondition(PCOLOR,$card);
        $this->assertEquals(MA_OK, $q);

        $m->tokens->setTokenState("tracker_tagWild_${color}", 1);
        $m->tokens->setTokenState("tracker_tagPlant_${color}", 0);
        $m->tokens->setTokenState("tracker_tagAnimal_${color}", 0);
        $m->tokens->setTokenState("tracker_tagMicrobe_${color}", 1);
        $q = $m->precondition(PCOLOR,$card);
        $this->assertEquals(MA_ERR_PREREQ, $q);
        $expr = "(((tagMicrobe>0) + (tagAnimal>0)) + (tagPlant>0)) + tagWild";
        $this->assertEquals(2, $m->evaluateExpression($expr, PCOLOR, null, []));
        $this->assertEquals(0, $m->evaluateExpression("($expr) >= 3", PCOLOR, null, []));

        $m->tokens->setTokenState("tracker_tagWild_${color}", 3);
        $m->tokens->setTokenState("tracker_tagPlant_${color}", 0);
        $m->tokens->setTokenState("tracker_tagAnimal_${color}", 0);
        $m->tokens->setTokenState("tracker_tagMicrobe_${color}", 0);
        $q = $m->precondition(PCOLOR,$card);
        $this->assertEquals(MA_OK, $q);
        $this->assertEquals(1, $m->evaluateExpression("($expr) >= 3", PCOLOR, null, []));
    }

    public function testClaimBuilderMilestoneWithWild() {
        $m = $this->game();
        $color = PCOLOR;
        $m->tokens->setTokenState("tracker_tagBuilding_${color}", 7);
        $m->tokens->setTokenState("tracker_tagWild_${color}", 1);
        $m->setTrackerValue(PCOLOR, 'm', 10);

        /** @var Operation_claim */
        $op = $m->getOperationInstanceFromType("claim", PCOLOR);
        $args = $op->argPrimaryDetails();
        $builder = array_get($args, 'milestone_4');
        $this->assertNotNull($builder);
        $this->assertEquals(MA_OK, $builder['q']);
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
        $this->assertEquals("w", $op['type']);
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
        $this->assertEquals(MA_ERR_PROTECTED, $args[$fish]['q']); // second its protected
    }

    public function testMultiplayer() {
        $m = $this->game();
        $p1 = $m->getPlayerIdByColor(PCOLOR);
        $m->dbUserPrefs->setPrefValue($p1,MA_PREF_CONFIRM_DRAW,1);
        $this->assertEquals(1, $m->dbUserPrefs->getPrefValue($p1,MA_PREF_CONFIRM_DRAW));
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
  
        $this->assertEquals("multiplayerDispatch", $m->gamestate->state()['name']);
        $m->st_gameDispatchMultiplayer();
        $this->assertEquals(STATE_MULTIPLAYER_CHOICE, $m->gamestate->getPrivateState($p1));
        $m->curid = $p1;
        $top1 = $m->machine->getTopOperations();
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
    }

    public function testProductionBuildCards() {
        $m = $this->game();
        $count = 0;
        /** @var Operation_copybu */
        $bu = $m->getOperationInstanceFromType("copybu", PCOLOR);
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


    public function testIsVoidComplexCount() {
        $m = $this->game();
        $m->setTrackerValue(PCOLOR, 'e', 0);
        $op = $m->getOperationInstanceFromType("counter(e,1):(ne:m)", PCOLOR);
        $this->assertNotNull($op);
        $this->assertTrue($op->isVoid());
        $m->setTrackerValue(PCOLOR, 'e', 1);
        $this->assertFalse($op->isVoid());
    }

    public function testIsVoidComplexCountInsulation() {
        $m = $this->game();
        $m->setTrackerValue(PCOLOR, 'ph', 0);
        $op = $m->getOperationInstanceFromType("counter(ph,1):(nph:pm)", PCOLOR);
        $this->assertNotNull($op);
        $this->assertTrue($op->isVoid());
        $m->setTrackerValue(PCOLOR, 'ph', 2);
        $this->assertFalse($op->isVoid());
    }

    public function testLavaFlows() {
        $m = $this->game();
        $m->tokens->setTokenState('tracker_t', +6);
        $card_id = $m->mtFindByName('Lava Flows');
        $m->putInEffectPool(PCOLOR, '2t', $card_id);
        $m->gamestate->jumpToState(STATE_GAME_DISPATCH);
        $m->st_gameDispatch();
        $tops = $m->machine->getTopOperations();
        foreach ($tops as $op) {
            if ($op['type'] == 'card') continue;
            if ($op['type'] == 'activate') continue;
            if ($op['type'] == 'pass') continue;
            $this->assertTrue(false, "Unexpected operation " . ($op['type']));
        }
        $this->assertEquals(8, $m->tokens->getTokenState("tracker_t"));
        $this->assertEquals(21, $m->tokens->getTokenState("tracker_tr_ff0000"));
    }

    public function testHasTag() {
        $m = $this->game();
        $card_id = $m->mtFindByName('Moss');
        $this->assertTrue($m->hasTag($card_id, 'Plant'));
    }

    public function testMossAndViralEnhancencers() {
        $m = $this->game();
        $moss = $m->mtFindByName('Moss');
        $vire = $m->mtFindByName('Viral Enhancers');
        $m->incTrackerValue(PCOLOR, 'm', 4);

        $ops = $m->getRulesFor($moss, 'r');
        /** @var ComplexOperation */
        $op = $m->getOperationInstanceFromType($ops, PCOLOR, 1, $moss);
        $this->assertEquals(true, $op->isVoid());
        $m->effect_playCard(PCOLOR, $vire);
        $this->assertEquals(false, $op->isVoid());
    }

    public function testExtraOcean() {
        $m = $this->game();
        $m->gamestate->changeActivePlayer(PCOLOR);
        $m->tokens->setTokenState('tracker_t', -2);
        $m->tokens->setTokenState('tracker_w', 9); // max oceans
        $card_id = $m->mtFindByName('Lava Flows');
        $m->putInEffectPool(PCOLOR, '2t', $card_id);
        $top1 = $m->machine->getTopOperations();
        $this->assertEquals(1, count($top1));
        $m->gamestate->jumpToState(STATE_GAME_DISPATCH);
        $m->st_gameDispatch();
        $top1 = $m->machine->getTopOperations();
        $this->assertEquals(1, count($top1));
        $m->gamestate->jumpToState(STATE_GAME_DISPATCH);
        $m->st_gameDispatch();
        $this->assertEquals(2, $m->tokens->getTokenState("tracker_t"));
        $this->assertEquals(22, $m->tokens->getTokenState("tracker_tr_ff0000"));
        $this->assertEquals(9, $m->tokens->getTokenState("tracker_w"));
        $top1 = $m->machine->getTopOperations();
        $this->assertEquals(1, count($top1));
        $op = array_shift($top1);
        $this->assertEquals("w", $op['type']); // unfonfirmed ocean
    }

    public function testRoverConstruction() {
        $m = $this->game();
        // setup one player has Rover Construction in play
        $rover = $m->mtFindByName('Rover Construction');
        $m->effect_playCard(BCOLOR, $rover);
        // another player plays city on tile with resources, simulate this
        $m->putInEffectPool(PCOLOR, "p");
        $m->notifyEffect(PCOLOR, 'place_city', 'tile_2_10');
        $m->gamestate->changeActivePlayer(PCOLOR);
        // dispatch
        $m->gamestate->jumpToState(STATE_GAME_DISPATCH);
        $m->st_gameDispatch();
        // player state with 2 ops - one for each player
        $top = $m->machine->getTopOperations();
        $this->assertEquals(2, count($top));
        $op = array_shift($top);
        $this->assertEquals("p", $op['type']);
        $op = array_shift($top);
        $this->assertEquals("2m", $op['type']);
        // make sure active player can pick op of another player to resolve first
        $m->action_resolve(['ops' => [['op' => $op['id']]]]);
        $top = $m->machine->getTopOperations();
        $this->assertEquals(1, count($top));
        $op = array_shift($top);
        $this->assertEquals("p", $op['type']);
        // dispatch
        $m->gamestate->jumpToState(STATE_GAME_DISPATCH);
        $m->st_gameDispatch();
        $top = $m->machine->getTopOperations();
        foreach ($top as $op) {
            if ($op['type'] == 'card') continue;
            if ($op['type'] == 'activate') continue;
            if ($op['type'] == 'pass') continue;
            $this->assertTrue(false, "Unexpected operation " . ($op['type']));
        }
    }


    public function testInstanciateAllCard() {
        $m = $this->game();
        foreach ($m->token_types as $key => $info) {
            if (array_get($info, 't', 0) == 0) continue;
            if (!startsWith($key, 'card_')) continue;
            $r = array_get($info, 'r', '');
            if (!$r) continue;
            echo ("testing $key <$r>\n");
            /** @var AbsOperation */
            $op = $m->getOperationInstanceFromType($r, PCOLOR);
            $this->assertNotNull($op);
            $this->assertTrue($op->checkIntegrity());
            $name = array_get($info, 'name', '');

            if ($r) {
                $len = strlen($r);
                $this->assertTrue($len <= 80, "type too long for $key $name $len\n");
            }
        }
    }

    public function testInstanciateAllOperations() {
        $m = $this->game();
        $tested = [];
        foreach ($m->token_types as $key => $info) {
            if (!startsWith($key, 'op_')) continue;
            echo ("testing op $key\n");
            $this->subTestOp($m, $key, $info);
            $tested[$key] = 1;
        }
        $this->subTestOp($m, 'op_acard188', ['type' => 'acard188']);

        $dir = dirname(dirname(__FILE__));
        $files = glob("$dir/operations/*.php");

        foreach ($files as $file) {
            $base = basename($file);
            if (!startsWith($base, 'Operation_')) continue;
            $mne = preg_replace("/Operation_(.*).php/", "\\1", $base);
            $key = "op_${mne}";
            if (array_key_exists($key, $tested)) continue;
            echo ("testing op $key\n");
            $this->subTestOp($m, $key,  ['type' => $mne]);
        }
    }

    public function testPass() {
        $m = $this->game();
        $op = $this->subTestOp($m, "op_pass");
        $args = $op->arg();
        $this->assertTrue($op->requireConfirmation());
        $this->assertFalse($op->noValidTargets());
        $this->assertFalse($op->isVoid());
        $this->assertFalse($op->canResolveAutomatically());
        $this->assertFalse($op->canSkipChoice());
        $this->assertEquals('pass', $op->getMnemonic());

        $ttype = $args['ttype'];
        $this->assertEquals('', $ttype);
    }

    public function testDraft() {
        $m = $this->game();
        $op = $m->getOperationInstanceFromType("2draft", PCOLOR);
        $this->assertNotNull($op);
        $this->assertTrue($op->checkIntegrity());
        $args = $op->arg();
        $this->assertFalse($op->requireConfirmation());
        $this->assertTrue($op->noValidTargets());
        $this->assertFalse($op->isVoid());
        $this->assertTrue($op->canResolveAutomatically());
        $this->assertFalse($op->canSkipChoice());
        $this->assertEquals('2draft', $op->getMnemonic());

        $ttype = $args['ttype'];
        $this->assertEquals('token', $ttype);
        $count = 2;
        $this->assertTrue($op->auto(PCOLOR, $count));
    }

    public function testPayop() {
        $m = $this->game();
        $op = $m->getOperationInstanceFromType("npu_Any:pu", PCOLOR);
        $this->assertNotNull($op);
        $this->assertTrue($op->checkIntegrity());
    }

    public function testDiscardDraw() {

        $m = $this->game();
        $op = $m->getOperationInstanceFromType("?(discard:draw)", PCOLOR);
        $this->assertNotNull($op);
        $this->assertTrue($op->checkIntegrity());
        //$args = $op->arg();
        $this->assertFalse($op->requireConfirmation());
        $this->assertTrue($op->isOptional());
        $this->assertFalse($op->canResolveAutomatically());
        $this->assertFalse($op->canSkipChoice());
        $this->assertFalse($op->canFail());
    }

    function subTestOp($m, $key, $info = []) {
        $type = array_get($info, 'type', substr($key, 3));
        $this->assertTrue(!!$type);

        /** @var AbsOperation */
        $op = $m->getOperationInstanceFromType($type, PCOLOR);
        $this->assertNotNull($op);
        $this->assertTrue($op->checkIntegrity());

        $args = $op->arg();
        $ttype = $args['ttype'];
        $ack = array_get($args, 'ack', false);

        if (!$op->isFullyAutomated()) {
            $this->assertTrue(!!$ttype, "  err: $type ttype=$ttype ack=$ack\n");
        } else if (!$ack) {
            $this->assertEquals("$ttype", "", "  err: $type ttype=$ttype ack=$ack\n");
        }

        $conf = $op->requireConfirmation();

        if ($ttype == 'player') {
            $this->assertTrue($conf, "conf $type");
        } else  if ($ttype == 'token') {
            // $this->assertTrue( $conf, "$ttype conf $type");
        } else  if ($ttype == 'enum') {
            $this->assertTrue($conf);
        } else {
            // $this->assertFalse( $conf);
        }

        if (isset($info['prompt'])) {
            $this->assertEquals($info['prompt'], $args['prompt'], $type);
        } else {
            $this->assertTrue(!!$args['prompt'], "$type");
        }
        return $op;
    }

    public function testRegolithEaters() {
        $m = $this->game();

        $p = PCOLOR;

        $eaters = $m->mtFind('name', 'Regolith Eaters');

        $m->effect_playCard($p, $eaters);
        $act = $m->getRulesFor($eaters, 'a');
        //$m->dbSetTokenLocation("resource_${p}_1", $eaters, 0); // add a microbe
        /** @var ComplexOperation */
        $op = $m->getOperationInstanceFromType("$act", $p, 1, $eaters);
        //$args = $op->argPrimaryDetails();
        $this->assertEquals(false, $op->isVoid());

        $op = $m->getOperationInstanceFromType("2nres", $p, 1, $eaters);
        //$args = $op->argPrimaryDetails();
        $this->assertEquals(true, $op->isVoid());
    }


    public function testBusinessEmpire() {
        $m = $this->game();
        $p = PCOLOR;
        $card = $m->mtFind('name', 'Business Empire');
        $effect = $m->getRulesFor($card, 'r');
        /** @var ComplexOperation */
        $op = $m->getOperationInstanceFromType($effect, $p, 1, $card);
        //$args = $op->argPrimaryDetails();
        $this->assertEquals(true, $op->isVoid());
        $m->setTrackerValue(PCOLOR, 'm', 6);
        $this->assertEquals(false, $op->isVoid());
        $this->assertEquals(true, $op->canResolveAutomatically());

        $m->putInEffectPool(PCOLOR, $effect);
        $m->gamestate->jumpToState(STATE_GAME_DISPATCH);
        $m->st_gameDispatch();
        $value = $m->getTrackerValue(PCOLOR, 'm');
        $this->assertEquals(0, $value);
        $value = $m->getTrackerValue(PCOLOR, 'pm');
        $this->assertEquals(6, $value);
    }
    public function testLavaTubeSettlement() {
        $m = $this->game();
        $p = PCOLOR;
        $m->setTrackerValue(PCOLOR, 'pe', 1);
        $card = $m->mtFind('name', 'Lava Tube Settlement');
        $effect = $m->getRulesFor($card, 'r');
        /** @var ComplexOperation */
        $op = $m->getOperationInstanceFromType($effect, $p, 1, $card);
        $this->assertEquals(false, $op->isVoid());
        $m->putInEffectPool(PCOLOR, $effect);
        $m->gamestate->jumpToState(STATE_GAME_DISPATCH);
        $m->st_gameDispatch();
        $ops = $m->machine->getTopOperations();
        $op = array_shift($ops);
        $tt = explode('(', $op['type']);
        $this->assertEquals('city', $tt[0]);
        $m->executeOperationSingle($op);

        /** @var ComplexOperation */
        $opcity = $m->getOperationInstance($op);
        $this->assertFalse($opcity->isVoid());
        //$args = $opcity->arg();
        // "hex_4_2"
        $opcity->action_resolve(['target' => 'hex_4_2']);
        return;
    }
    public function testPaymentMicrobes() {
        $m = $this->game();
        $p = PCOLOR;
        $m->incTrackerValue(PCOLOR, 's', 1);
        $m->incTrackerValue(PCOLOR, 'm', 10);
        $psyc = $m->mtFindByName('Psychrophiles');
        $m->effect_playCard(PCOLOR, $psyc);
        $m->dbSetTokenLocation("resource_${p}_1", $psyc, 0); // add a microbe


        $card = $m->mtFindByName('Greenhouses');
        $payment = $m->getPayment($p, $card);
        $this->assertEquals($payment, '6nm');
        $args = $m->debug_oparg($payment, $card);

        $targets = $args['args']['target'];
        $this->assertEquals(count($targets), 5);

        $this->assertEquals('payment', $targets[0]);
        $this->assertEquals('1s4m', $targets[1]);
        $this->assertEquals('1resMicrobe4m', $targets[2]);
        $this->assertEquals('1s1resMicrobe2m', $targets[3]);

        $this->assertEquals($targets[4], '6m');

        $m->dbSetTokenLocation("resource_${p}_2", $psyc, 0); // add a microbe
        $args = $m->debug_oparg($payment, $card);
        $targets = $args['args']['target'];
        $this->assertEquals(count($targets), 5);
        $this->assertEquals('payment', $targets[0]);
        $this->assertEquals('1s4m', $targets[1]);
        $this->assertEquals('2resMicrobe2m', $targets[2]);
        $this->assertEquals('1s2resMicrobe', $targets[3]);

        $m->setTrackerValue(PCOLOR, 'm', 2);
        $m->dbSetTokenLocation("resource_${p}_2", $psyc, 0); // add a microbe
        $payment = $m->getPayment($p, $card);
        $this->assertEquals($payment, '6nm');
        $args = $m->debug_oparg($payment, $card);
        $this->assertEquals(false, array_get($args['args'], 'void', false));
        $targets = $args['args']['target'];
        $this->assertEquals(4, count($targets));
    }

    public function testPaymentHeat() {
        $m = $this->game();
        $p = PCOLOR;
        $m->setTrackerValue(PCOLOR, 's', 1);
        $m->setTrackerValue(PCOLOR, 'u', 1);
        $m->setTrackerValue(PCOLOR, 'm', 26);
        $m->setTrackerValue(PCOLOR, 'h', 2);
        $psyc = $m->mtFindByName('Helion');
        $m->effect_playCorporation(PCOLOR, $psyc, false);

        $card = $m->mtFindByName('Space Elevator');
        $payment = $m->getPayment($p, $card);
        $this->assertEquals($payment, '27nm');
        $args = $m->debug_oparg($payment, $card);
        $targets = $args['args']['target'];
        $this->assertEquals(count($targets), 5);
        $this->assertEquals('payment', $targets[0]);
        $this->assertEquals('1s25m', $targets[1]);
        $this->assertEquals('1u24m', $targets[2]);
        $this->assertEquals('1s1u22m', $targets[3]);
        $this->assertEquals('26m1h', $targets[4]);
    }
}
