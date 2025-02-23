<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

use function PHPUnit\Framework\assertEmpty;
use function PHPUnit\Framework\assertEquals;
use function PHPUnit\Framework\assertNotNull;
use function PHPUnit\Framework\assertTrue;

require_once "terraformingmars.game.php";
require_once "TokensInMem.php";


class GameStateInMem extends GameState {
}

define("PCOLOR", "008000");
define("BCOLOR", "0000ff");

class GameUT extends terraformingmars {
    var $multimachine;
    var $xtable;
    var $map_number = 0;
    var $_colors = [];
    function __construct() {
        include "./material.inc.php";
        include "./states.inc.php";
        parent::__construct();
        $this->gamestate = new GameStateInMem($machinestates);

        $this->tokens = new TokensInMem();
        $this->xtable = [];
        $this->machine = new MachineInMem($this, 'machine', 'main', $this->xtable);
        $this->multimachine = new MachineInMem($this, 'machine', 'multi', $this->xtable);
        $this->curid = 1;
        $this->_colors = array(PCOLOR, BCOLOR);
    }

    function init(int $map = 0) {
        $this->map_number = $map;
        $this->adjustedMaterial(true);
        $this->createTokens();
        $this->gamestate->changeActivePlayer(PCOLOR);
        $this->gamestate->jumpToState(STATE_PLAYER_TURN_CHOICE);
    }

    function clean_cache() {
        $this->map = null;
    }

    function getMapNumber() {
        return $this->map_number;
    }

    function setListerts(array $l) {
        $this->eventListners = $l;
    }

    function getMultiMachine() {
        return $this->multimachine;
    }

    public $curid;

    public function getCurrentPlayerId($bReturnNullIfNotLogged = false): string|int {
        return $this->curid;
    }


    protected function getCurrentPlayerColor() {
        return $this->getPlayerColorById($this->curid);
    }

    function _getColors() {
        return $this->_colors;
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
    var $game;

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

    private function game(int $map = 0) {
        $m = new GameUT();
        $m->init($map);
        $this->game = $m;
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
        $this->assertEquals(2, $m->tokens->getTokenState("tracker_pdelta_{$color}"));
        $this->assertEquals(MA_OK, $m->playability(PCOLOR, $m->mtFindByName('Predators')));
        $m->tokens->setTokenState('tracker_o', 8);
        $this->assertEquals(MA_ERR_PREREQ, $m->playability(PCOLOR, $m->mtFindByName('Predators')));
        $info = [];
        $this->assertEquals(MA_OK, $m->playability(PCOLOR, $m->mtFindByName('Predators'), $info, 'card_prelude_P10'));
        $m->tokens->setTokenState('tracker_t', -8);
        $this->assertEquals(MA_OK, $m->playability(PCOLOR, $m->mtFindByName('Arctic Algae')));
    }


    public function testCanAfford() {
        $m = $this->game();
        $info = [];
        $m->setTrackerValue(PCOLOR, 'm', 10);
        $this->assertEquals(false, $m->canAfford(PCOLOR, $m->mtFindByName('Convoy From Europa'), null, $info, 'card_prelude_P10'));
        // eccentric sponsor
        $this->assertEquals(true, $m->canAfford(PCOLOR, $m->mtFindByName('Convoy From Europa'), null, $info, 'card_prelude_P11'));

        $this->assertEquals(true, $m->canAfford(PCOLOR, $m->mtFindByName('Deimos Down'), null, $info, 'card_prelude_P11'));
        $this->assertEquals("6nm", $info['payop']);

        $m->effect_playCard(PCOLOR, 'card_prelude_P11');
        $this->assertEquals(true, $m->canAfford(PCOLOR, $m->mtFindByName('Deimos Down'), null, $info, 'card_prelude_P11'));
        $this->assertEquals("6nm", $info['payop']);
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
        $q = $m->precondition(PCOLOR, $card);
        $this->assertEquals(MA_ERR_PREREQ, $q);

        $m->tokens->setTokenState("tracker_tagPlant_{$color}", 1);
        $m->tokens->setTokenState("tracker_tagAnimal_{$color}", 1);
        $m->tokens->setTokenState("tracker_tagMicrobe_{$color}", 1);
        $q = $m->precondition(PCOLOR, $card);
        $this->assertEquals(MA_OK, $q);

        $m->tokens->setTokenState("tracker_tagPlant_{$color}", 0);
        $q = $m->precondition(PCOLOR, $card);
        $this->assertEquals(MA_ERR_PREREQ, $q);

        $m->tokens->setTokenState("tracker_tagWild_{$color}", 1);
        $q = $m->precondition(PCOLOR, $card);
        $this->assertEquals(MA_OK, $q);

        $m->tokens->setTokenState("tracker_tagWild_{$color}", 1);
        $m->tokens->setTokenState("tracker_tagPlant_{$color}", 0);
        $m->tokens->setTokenState("tracker_tagAnimal_{$color}", 0);
        $m->tokens->setTokenState("tracker_tagMicrobe_{$color}", 1);
        $q = $m->precondition(PCOLOR, $card);
        $this->assertEquals(MA_ERR_PREREQ, $q);
        $expr = "(((tagMicrobe>0) + (tagAnimal>0)) + (tagPlant>0)) + tagWild";
        $this->assertEquals(2, $m->evaluateExpression($expr, PCOLOR, null, []));
        $this->assertEquals(0, $m->evaluateExpression("($expr) >= 3", PCOLOR, null, []));

        $m->tokens->setTokenState("tracker_tagWild_{$color}", 3);
        $m->tokens->setTokenState("tracker_tagPlant_{$color}", 0);
        $m->tokens->setTokenState("tracker_tagAnimal_{$color}", 0);
        $m->tokens->setTokenState("tracker_tagMicrobe_{$color}", 0);
        $q = $m->precondition(PCOLOR, $card);
        $this->assertEquals(MA_OK, $q);
        $this->assertEquals(1, $m->evaluateExpression("($expr) >= 3", PCOLOR, null, []));
    }

    public function testClaimBuilderMilestoneWithWild() {
        $m = $this->game();
        $color = PCOLOR;
        $m->tokens->setTokenState("tracker_tagBuilding_{$color}", 7);
        $m->tokens->setTokenState("tracker_tagWild_{$color}", 1);
        $m->setTrackerValue(PCOLOR, 'm', 10);

        /** @var Operation_claim */
        $op = $m->getOperationInstanceFromType("claim", PCOLOR);
        $args = $op->argPrimaryDetails();
        $builder = array_get($args, 'milestone_4');
        $this->assertNotNull($builder);
        $this->assertEquals(MA_OK, $builder['q']);
    }

    function assertOperationTargetStatus(string $optype, string $target, int $status = MA_OK, string $color = PCOLOR) {
        /** @var AbsOperation */
        $op = $this->game->getOperationInstanceFromType($optype, $color);
        $args = $op->argPrimaryDetails();
        $ms = array_get($args, $target);
        $this->assertNotNull($ms);
        $this->assertEquals($status, $ms['q']);
    }

    public function testClaimMilestone_HellasRimSettler() {
        //3|POLAR EXPLORER|7||8|(polartiles>=5)|Requires that you have 3 tiles on the two bottom rows|
        $this->game(2);
        $color = PCOLOR;
        $this->game->tokens->setTokenState("tracker_tagJovian_{$color}", 7);
        $this->game->setTrackerValue(PCOLOR, 'm', 10);
        $this->assertEquals("RIM SETTLER", $this->game->getTokenName("milestone_5"));
        $this->assertOperationTargetStatus("claim", "milestone_5");
    }

    public function testClaimMilestone_HellasENERGIZER() {
        //4|ENERGIZER|7||8|(pe>=6)|Requires that you have 6 energy production|
        $this->game(2);
        $color = PCOLOR;
        $this->game->tokens->setTokenState("tracker_pe_{$color}", 7);
        $this->game->setTrackerValue(PCOLOR, 'm', 10);
        $milestone = "milestone_4";
        $this->assertEquals("ENERGIZER", $this->game->getTokenName($milestone));
        $this->assertOperationTargetStatus("claim", $milestone);
    }


    public function testClaimMilestone_HellasPolar() {
        //    3|POLAR EXPLORER|7||8|(polartiles>=3)|Requires that you have 3 tiles on the two bottom rows|
        $game = $this->game(2);
        $color = PCOLOR;

        $this->game->setTrackerValue(PCOLOR, 'm', 10);
        $milestone = "milestone_3";
        $this->assertEquals("POLAR EXPLORER", $this->game->getTokenName($milestone));

        $game->tokens->moveToken('tile_64', 'hex_4_9', 1);
        $game->tokens->moveToken('tile_67', 'hex_7_8', 1);
        $game->tokens->moveToken('tile_3_1', 'hex_6_8', 2);
        $this->assertEquals(2, $this->game->getCountOfPolarTiles($color));
        $this->assertOperationTargetStatus("claim", $milestone, MA_ERR_PREREQ);
        $game->tokens->moveToken('tile_85', 'hex_5_9', 1);
        $game->clean_cache();
        $this->assertEquals(3, $this->game->getCountOfPolarTiles($color));
        $this->assertOperationTargetStatus("claim", $milestone, MA_OK);
    }

    public function testClaimMilestone_HellasTACTICIAN() {
        //           2|TACTICIAN|7||8|(cardreq>=5)|Requires that you have 5 cards with requirements in play|
        $game = $this->game(2);
        $color = PCOLOR;

        $this->game->setTrackerValue(PCOLOR, 'm', 10);
        $milestone = "milestone_2";

        $this->game->tokens->moveToken($game->mtFindByName('Lava Flows'), "tableau_{$color}", 1);

        $this->assertOperationTargetStatus("claim", $milestone, MA_ERR_PREREQ);
        $this->assertEquals(0, $this->game->getCountOfCardsWithPre($color));
        $this->game->tokens->moveToken($game->mtFindByName('Advanced Ecosystems'), "tableau_{$color}", 1);
        $this->assertEquals(1, $this->game->getCountOfCardsWithPre($color));
        $this->assertOperationTargetStatus("claim", $milestone, MA_ERR_PREREQ);
        //
        $this->game->tokens->moveToken($game->mtFindByName('Zeppelins'), "tableau_{$color}", 1);
        $this->game->tokens->moveToken($game->mtFindByName('Worms'), "tableau_{$color}", 1);
        $this->game->tokens->moveToken($game->mtFindByName('Caretaker Contract'), "tableau_{$color}", 1);
        $this->game->tokens->moveToken($game->mtFindByName('Power Supply Consortium'), "tableau_{$color}", 1);
        $this->game->tokens->moveToken($game->mtFindByName('Martian Survey'), "tableau_{$color}", 1); // event does not count

        $this->assertEquals(5, $this->game->getCountOfCardsWithPre($color));
        $this->assertOperationTargetStatus("claim", $milestone, MA_OK);
        $this->assertMilestone(2, "TACTICIAN", 5);
    }

    public function testClaimMilestone_HellasDIVERSIFIER() {
        // 1|DIVERSIFIER|7||8|(uniquetags>=8)|Requires that you have 8 different tags in play|
        $this->game(2);
        $color = PCOLOR;
        $this->game->tokens->setTokenState("tracker_tagJovian_{$color}", 7);
        $this->game->tokens->setTokenState("tracker_tagScience_{$color}", 7);
        $this->assertEquals(2, $this->game->getCountOfUniqueTags($color));
        $this->game->setTrackerValue(PCOLOR, 'm', 10);
        $milestone = "milestone_1";
        $this->assertEquals("DIVERSIFIER", $this->game->getTokenName($milestone));
        $this->assertOperationTargetStatus("claim", $milestone, MA_ERR_PREREQ);
        $this->game->tokens->setTokenState("tracker_tagSpace_{$color}", 1);
        $this->assertEquals(3, $this->game->getCountOfUniqueTags($color));
        $this->game->tokens->setTokenState("tracker_tagEvent_{$color}", 1);
        $this->assertEquals(3, $this->game->getCountOfUniqueTags($color));
        $this->game->tokens->setTokenState("tracker_tagWild_{$color}", 1);
        $this->assertEquals(4, $this->game->getCountOfUniqueTags($color));
        $this->game->tokens->setTokenState("tracker_tagMicrobe_{$color}", 1);
        $this->game->tokens->setTokenState("tracker_tagPlant_{$color}", 1);
        $this->game->tokens->setTokenState("tracker_tagAnimal_{$color}", 1);
        $this->game->tokens->setTokenState("tracker_tagCity_{$color}", 1);
        $this->game->tokens->setTokenState("tracker_tagEarth_{$color}", 1);
        $this->assertEquals(9, $this->game->getCountOfUniqueTags($color));
        $this->assertOperationTargetStatus("claim", $milestone, MA_OK);
    }

    function assertMilestone(int $num, string $name, int $value = 1, string $color = PCOLOR) {
        $this->game->clean_cache();
        $token = "milestone_$num";
        $this->assertEquals($name, $this->game->getTokenName($token));
        $expr = $this->game->getRulesFor($token, 'r');
        $res = $this->game->evaluateExpression($expr, $color);
        $this->assertEquals($value, $res);
    }
    function assertAward(int $num, string $name, int $value = 1, string $color = PCOLOR) {
        $this->game->clean_cache();
        $token = "award_$num";
        $this->assertEquals($name, $this->game->getTokenName($token));
        $expr = $this->game->getRulesFor($token, 'r');
        $res = $this->game->evaluateExpression($expr, $color);
        $this->assertEquals($value, $res);
    }

    public function testAward_Hellas1() {
        $this->game(2);
        $this->game->setTrackerValue(PCOLOR, 'forest', 5);
        //1|Cultivator|8|forest|20||Owning the most greenery tiles
        $this->assertAward(1, "Cultivator", 5);
    }

    public function testAward_Hellas2() {
        $game = $this->game(2);
        $color = PCOLOR;
        // 2|Magnate|8|card_green|20||Having most automated cards in play (green cards).

        $this->game->tokens->moveToken($game->mtFindByName('Lava Flows'), "tableau_{$color}", 1);
        $this->assertEquals(0, $this->game->getCountOfCardsGreen($color));
        $this->game->tokens->moveToken($game->mtFindByName('Advanced Ecosystems'), "tableau_{$color}", 1);
        $this->assertEquals(1, $this->game->getCountOfCardsGreen($color));

        $this->assertAward(2, "Magnate", 1);
    }

    public function testAward_Hellas3() {
        $this->game(2);
        $this->game->setTrackerValue(PCOLOR, 'tagSpace', 5);
        // 3|Space Baron|8|tagSpace|20||Having the most space tags (event cards do not count).
        $this->assertAward(3, "Space Baron", 5);
    }
    public function testAward_Hellas4() {
        $game = $this->game(2);
        $color = PCOLOR;

        $fish = $game->mtFind('name', 'Fish');

        $game->effect_playCard($color, $fish);
        $num = 5;
        for ($i = 0; $i < $num; $i++) {
            $game->dbSetTokenLocation("resource_{$color}_$i", $fish, 1); // add a fish
        }

        // 4|Eccentric|8|res|20||Having the most resources on cards.
        $this->assertEquals($num, $this->game->getCountOfResOnCards($color));
        $this->assertAward(4, "Eccentric", $num);
    }
    public function testAward_Hellas5() {
        $this->game(2);
        $this->game->setTrackerValue(PCOLOR, 'tagBuilding', 2);
        // 5|Contractor|8|tagBuilding|20||Having the most building tags (event cards do not count).
        $this->assertAward(5, "Contractor", 2);
    }

    // 1|GENERALIST|7|generalist|8|requires that you have increased all 6 productions by at least 1 step (starting production from corporation cards count as increase).|6

    public function testClaimMilestone_Elysium1() {
        $this->game(1);
        $color = PCOLOR;
        $num = 1;
        $kind = 'milestone';
        $token =  "{$kind}_{$num}";
        $this->game->setTrackerValue(PCOLOR, 'm', 10);
        $this->assertEquals("GENERALIST", $this->game->getTokenName($token));
        $this->assertOperationTargetStatus("claim", $token, MA_ERR_PREREQ);
        $production = ['pm', 'ps', 'pu', 'pp', 'pe', 'ph'];
        foreach ($production as $key) {
            $this->game->setTrackerValue(PCOLOR, $key, 2);
        }
        $count = $this->game->getGeneralistCount($color);
        $this->assertEquals(6, $count);
        $this->assertOperationTargetStatus("claim", $token);
    }
    public function testClaimMilestone_Elysium2() {
        // 2|SPECIALIST|7|specialist|8|requires that you have at least 10 in production of any resource.|10
        $this->game(1);
        $color = PCOLOR;
        $num = 2;
        $kind = 'milestone';
        $token =  "{$kind}_{$num}";
        $this->game->setTrackerValue(PCOLOR, 'm', 10);
        $this->assertEquals("SPECIALIST", $this->game->getTokenName($token));
        $this->assertOperationTargetStatus("claim", $token, MA_ERR_PREREQ);
        $this->game->setTrackerValue(PCOLOR, "pm", 2);
        $this->game->setTrackerValue(PCOLOR, "pe", 11);
        $count = $this->game->getSpecialistCount($color);
        $this->assertEquals(11, $count);
        $this->assertOperationTargetStatus("claim", $token);
    }

    public function testClaimMilestone_Elysium3() {
        // 3|ECOLOGIST|7|ecologist|8|requires that you have 4 bio tags (plant-, microbe- and animal tags count as bio tags).|4
        $this->game(1);
        $color = PCOLOR;
        $num = 3;
        $kind = 'milestone';
        $token =  "{$kind}_{$num}";
        $this->game->setTrackerValue(PCOLOR, 'm', 10);
        $this->assertEquals("ECOLOGIST", $this->game->getTokenName($token));
        $this->assertOperationTargetStatus("claim", $token, MA_ERR_PREREQ);
        $this->game->setTrackerValue(PCOLOR, 'tagAnimal', 1);
        $this->game->setTrackerValue(PCOLOR, 'tagPlant', 2);
        $this->game->setTrackerValue(PCOLOR, 'tagMicrobe', 1);
        $count = $this->game->getEcologistCount($color);
        $this->assertEquals(4, $count);
        $this->assertOperationTargetStatus("claim", $token);
        $this->game->setTrackerValue(PCOLOR, 'tagWild', 1);
        $count = $this->game->getEcologistCount($color);
        $this->assertEquals(5, $count);
    }
    public function testClaimMilestone_Elysium4() {
        // 4|TYCOON|7|tycoon|8|requires that you have 15 project cards in play (blue and green cards).|15
        $game = $this->game(1);
        $color = PCOLOR;
        $num = 4;
        $kind = 'milestone';
        $token =  "{$kind}_{$num}";
        $this->game->setTrackerValue(PCOLOR, 'm', 10);
        $this->assertEquals("TYCOON", $this->game->getTokenName($token));
        $this->assertOperationTargetStatus("claim", $token, MA_ERR_PREREQ);

        $this->playProjectCards(MA_CARD_TYPE_GREEN, 2);
        $this->assertOperationTargetStatus("claim", $token, MA_ERR_PREREQ);
        $this->playProjectCards(MA_CARD_TYPE_BLUE, 18);

        $count = $this->game->getTycoonCount($color);
        $this->assertEquals(20, $count);
        $this->assertOperationTargetStatus("claim", $token);
    }

    function playProjectCards(int $ptype, int $max) {
        $count = 0;
        $game = $this->game;
        foreach ($game->token_types as $key => $info) {
            if (!startsWith($key, 'card_main')) continue;
            $t = array_get($info, 't');
            if ($t != $ptype) continue;
            $game->effect_playCard(PCOLOR, $key);
            $count++;
            if ($count >= $max) break;
        }
    }

    public function testClaimMilestone_Elysium5() {
        // 5|LEGEND|7|tagEvent|8|requires 5 played events (red cards).|5
        $game = $this->game(1);
        $color = PCOLOR;
        $num = 5;
        $kind = 'milestone';
        $token =  "{$kind}_{$num}";
        $this->game->setTrackerValue(PCOLOR, 'm', 10);
        $this->assertEquals("LEGEND", $this->game->getTokenName($token));
        $this->assertOperationTargetStatus("claim", $token, MA_ERR_PREREQ);
        $this->playProjectCards(MA_CARD_TYPE_EVENT, 10);
        $this->assertEquals(10, $game->getCountOfCardsRed($color));
        $this->assertOperationTargetStatus("claim", $token, MA_OK);
    }

    public function testAward_Elysium1() {
        $game = $this->game(1);
        $color = PCOLOR;
        $this->assertAward(1, "Celebrity", 0);
        $card = $game->mtFindByName('Strip Mine');
        $game->effect_playCard($color, $card);
        // 1|Celebrity|8|celebrity|20|Having most cards in play (not events) with a cost of at least 20 megacredits.
        $this->assertAward(1, "Celebrity", 1);
    }

    public function testAward_Elysium2() {
        $this->game(1);
        $this->game->setTrackerValue(PCOLOR, 's', 1);
        $this->game->setTrackerValue(PCOLOR, 'e', 2);
        // 2|Industrialist|8|s+e|20|Having most steel and energy resources.
        $this->assertAward(2, "Industrialist", 3);
    }

    public function testAward_Elysium3() {
        $game = $this->game(1);
        $color = PCOLOR;
        $game->tokens->moveToken('tile_67', 'hex_7_8', 1);
        $game->tokens->moveToken('tile_44', 'hex_6_8', 1);
        $this->assertEquals(2, $this->game->getCountOfDesertTiles($color));
        // 3|Desert Settler|8|desert|20|Owning most tiles south of the equator (the four bottom rows).
        $this->assertAward(3, "Desert Settler", 2);
    }
    public function testAward_Elysium4() {
        $game = $this->game(1);
        $game->tokens->moveToken('tile_67', 'hex_4_2', 1);
        $game->tokens->moveToken('tile_44', 'hex_5_2', 1);
        $game->tokens->moveToken('tile_2_1', 'hex_3_2', 1); // not adj
        $game->tokens->moveToken('tile_3_1', 'hex_4_1', 0); // ocean
        // 4|Estate Dealer|8|estate|20|Owning most tiles adjacent to ocean tiles.
        $this->assertAward(4, "Estate Dealer", 2);
    }
    public function testAward_Elysium5() {
        $game = $this->game(1);
        $game->setTrackerValue(PCOLOR, 'tr', 20);
        // 5|Benefactor|8|tr|20|Having highest terraform rating. Count this award first!
        $this->assertAward(5, "Benefactor", 20);
    }

    public function testMilestone_Vastitas5_Farmer() {
        $game = $this->game(3);
        $color = PCOLOR;

        $fish = $game->mtFind('name', 'Fish');

        $game->effect_playCard($color, $fish);
        $num = 5;
        for ($i = 0; $i < $num; $i++) {
            $game->dbSetTokenLocation("resource_{$color}_$i", $fish, 1); // add a fish
        }

        // 5|FARMER|7|farmer|8|requires to have 5 animal and microbe resources combined|5
        $this->assertEquals($num, $this->game->getCountOfResOnCards($color, 'Animal'));
        $this->assertEquals(0, $this->game->getCountOfResOnCards($color, 'Science'));
        $this->assertMilestone(5, "FARMER", $num);
        $this->game->setTrackerValue(PCOLOR, 'm', 20);
        $this->assertOperationTargetStatus("claim", "milestone_5", MA_OK);
    }


    public function testMilestone_Amazonis2_Landshaper() {
        $game = $this->game(4);
        $color = PCOLOR;
        //2|LANDSHAPER|7|landshaper|8|Requires that you own 1 greenery tile, 1 special tile, and 1 city tile (do not need to be adjacent to each other)|3
        $game->tokens->moveToken('tile_67', 'hex_4_2', 1);
        $game->tokens->moveToken('tile_44', 'hex_5_2', 1);
        $this->assertMilestone(2, "LANDSHAPER", 1);
        $game->tokens->moveToken('tile_8', 'hex_5_5', 1);
        $this->assertMilestone(2, "LANDSHAPER", 2);
    }
    public function testAward_Amazonis1_Collector() {
        $game = $this->game(4);
        $color = PCOLOR;

        $fish = $game->mtFind('name', 'Fish');
        $game->effect_playCard($color, $fish);
        $num = 5;
        for ($i = 0; $i < $num; $i++) {
            $game->dbSetTokenLocation("resource_{$color}_$i", $fish, 1); // add a fish
        }
        $this->assertEquals(1, $this->game->getCountOfUniqueTypesOfResources($color));
        $this->assertAward(1, "Collector", 1);
        $this->game->setTrackerValue(PCOLOR, 'm', 20);
        $this->assertEquals(2, $this->game->getCountOfUniqueTypesOfResources($color));
    }

    public function test_getTerraformingProgression_Amazonis() {
        $game = $this->game(4);

        $game->tokens->setTokenState('tracker_o', 18);
        $game->tokens->setTokenState('tracker_t', 14);
        $game->tokens->setTokenState('tracker_w', 11); // max oceans
        $this->assertEquals(100, $this->game->getTerraformingProgression());
    }

    public function test_getAmazonisMapBonuses() {
        $game = $this->game(4);
        $map = $game->getPlanetMap();

        foreach ($map as $hex => $info) {
            $rules = $game->getRulesFor($hex, 'r');
            if (!$rules) continue;

            $op = $game->getOperationInstanceFromType($rules, PCOLOR, 1, $hex);
            $this->assertTrue(!!$op, "cannot instanciat $rules for $hex");
        }
    }

    public function testVolcanic() {
        $game = $this->game(3);
        $color = PCOLOR;
        $volc = $game->mtFind('name', 'Hecates Tholus');
        $this->assertEquals(1, $game->getRulesFor($volc, 'vol'));
        $this->assertOperationTargetStatus("city(vol)", "hex_5_1");
        $this->assertOperationTargetStatus("city(vol)", "hex_4_1", MA_ERR_NOTRESERVED);


        $game->effect_placeTile($color, 'tile_2_2', 'hex_4_1');
        $this->assertEquals(1, $this->game->getCountOfGeologistTiles($color));
        $game->effect_placeTile($color, 'tile_2_1', 'hex_5_1');
        $this->assertEquals(2, $this->game->getCountOfGeologistTiles($color));
    }

    public function testConnected() {
        $game = $this->game(3);
        $color = PCOLOR;
        $game->effect_placeTile($color, 'tile_2_2', 'hex_4_1');
        $this->assertEquals(1, $this->game->getCountOfLandscapeTiles($color));
        $game->effect_placeTile($color, 'tile_2_1', 'hex_5_1');
        $this->assertEquals(2, $this->game->getCountOfLandscapeTiles($color));
        $game->effect_placeTile($color, 'tile_2_3', 'hex_5_6');
        $this->assertEquals(2, $this->game->getCountOfLandscapeTiles($color));
    }



    public function testNoctisCity() {
        $this->game(3);
        $this->assertOperationTargetStatus("city('Noctis City')", "hex_5_1");
        $this->assertOperationTargetStatus("w", "hex_3_5");
        $this->assertOperationTargetStatus("city(vol)", "hex_5_1");
        $this->game->effect_placeTile(PCOLOR, 'tile_2_1', 'hex_1_5');
        $this->assertOperationTargetStatus("city('Noctis City')", "hex_2_5", MA_ERR_CITYPLACEMENT);
        // on default map its 3_5
        $this->game(0);
        $this->assertOperationTargetStatus("city('Noctis City')", "hex_3_5");
        $this->assertOperationTargetStatus("w", "hex_3_5", MA_ERR_NOTRESERVED);
        $this->assertOperationTargetStatus("city", "hex_3_5", MA_ERR_RESERVED); // other city cannot be placed there
    }

    public function testSoloSetupRandom() {
        for ($map = 0; $map <= 3; $map++) {
            $game = new GameUT();
            $game->map_number = 0;
            $game->adjustedMaterial(true);
            $game->init($map);
            $this->game = $game;

            for ($i = 0; $i < 100; $i++) {
                $places = $game->getSoloMapPlacements();
                $all = array_merge($places['city'], $places['forest']);
                $this->assertEquals(4, count($all), "map $map: " . toJson($all));
                foreach ($all as $hex) {
                    $this->assertEquals(0, $game->getRulesFor($hex, 'ocean', 0));
                    $this->assertEquals(0, $game->getRulesFor($hex, 'reserved', 0));
                }
                $this->assertEquals(4, count(array_unique($all)));

                $adj = $game->getAdjecentHexes($places['city'][0]);
                $index = array_search($places['city'][1], $adj);
                $this->assertEquals(false, $index);
            }
        }
    }

    public function testSoloSetup() {
        for ($map = 0; $map <= 3; $map++) {
            $game = $this->game($map);
            $game->setupSoloMap();
            $this->assertEquals(2, $game->getCountOfCitiesOnMars('ffffff'));
        }
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
        $m->dbSetTokenLocation("resource_{$p2}_1", $fish, 0); // add a fish
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
        $m->dbUserPrefs->setPrefValue($p1, MA_PREF_CONFIRM_DRAW, 1);
        $this->assertEquals(1, $m->dbUserPrefs->getPrefValue($p1, MA_PREF_CONFIRM_DRAW));
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

        $color = PCOLOR;
        $card_id = $m->mtFindByName('Mining Area');
        $subrules = $bu->getProductionOnlyRules('', $card_id);
        $this->assertEquals("pu", $subrules);

        $m->dbSetTokenLocation($card_id, "tableau_$color", 1);
        $this->assertFalse($bu->isVoid());
  
    }

    public function testRoboticWorkforceWithResearchNetwork() {
        $m = $this->game();
        $card_id = $m->mtFindByName('Research Network');
        //$card2 = $m->mtFindByName('Robotic Workforce');
        $color = PCOLOR;
        $m->dbSetTokenLocation($card_id, "tableau_$color", 1);
    
        /** @var Operation_copybu */
        $bu = $m->getOperationInstanceFromType("copybu", PCOLOR);
        $this->assertNotNull($bu);
        $this->assertFalse($bu->isVoid());
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
        $color = PCOLOR;
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
        $this->assertEquals(21, $m->tokens->getTokenState("tracker_tr_$color"));
    }

    public function testLavaFlowsHellas() {
        $m = $this->game(2);
        $color = PCOLOR;
        $m->tokens->setTokenState('tracker_t', +6);
        $card_id = $m->mtFindByName('Lava Flows');
        $r = $m->getRulesFor($card_id);
        $m->putInEffectPool(PCOLOR, $r, $card_id);
        $m->gamestate->jumpToState(STATE_GAME_DISPATCH);
        $m->st_gameDispatch();
        $tops = $m->machine->getTopOperations();
        foreach ($tops as $op) {
            if ($op['type'] == 'tile(vol)') continue;
            if ($op['type'] == '2t') continue;
            $this->assertTrue(false, "Unexpected operation " . ($op['type']));
        }
        $op = $m->getOperationInstanceFromType('tile(vol)', PCOLOR, 1, $card_id);
        $this->assertEquals(true, !$op->isVoid());
        /** @var ComplexOperation */
        $op = $m->getOperationInstanceFromType($r, PCOLOR, 1, $card_id);
        $this->assertEquals(true, !$op->isVoid());
    }

    public function testLavaTubeSettlementHellas() {
        $m = $this->game(2);
        $color = PCOLOR;
        $m->setTrackerValue(PCOLOR, 'pe', 2);
        $card = $m->mtFind('name', 'Lava Tube Settlement');
        $op = $m->getOperationInstanceFromType('city(vol)', $color, 1, $card);
        $this->assertEquals(true, !$op->isVoid());
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
        $color = PCOLOR;
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
        $this->assertEquals(22, $m->tokens->getTokenState("tracker_tr_$color"));
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
            $this->subTestOperationIntegrity($op);
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
            $key = "op_{$mne}";
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

    public function testSteal() {
        $game = $this->game();
        $game->_colors = array(PCOLOR);
        $this->assertTrue($game->isSolo());

        $optype = 'steal_s';
        $op = $game->getOperationInstanceFromType($optype, PCOLOR);
        $this->assertFalse($op->canSkipChoice());
        $this->subTestOperationIntegrity($op);
        $args = $op->arg();


        $card = $game->mtFindByName('Hired Raiders');
        $optype = $game->getRulesFor($card, 'r');
        $op = $game->getOperationInstanceFromType($optype, PCOLOR);


        $this->subTestOperationIntegrity($op);
        $args = $op->arg();

        $this->assertFalse($op->noValidTargets());
        $this->assertFalse($op->isVoid());
        $this->assertFalse($op->canResolveAutomatically());
        $this->assertFalse($op->canSkipChoice());
        $this->assertFalse($op->isFullyAutomated());
        //$this->assertTrue($op->requireConfirmation());
        $this->assertEquals($optype, $op->getMnemonic());

        $game->putInEffectPool(PCOLOR, $optype, "$card");
        $top = $this->dispatchOneStep($game);
        $this->assertEquals(2, count($top)); // expanded into 2


        $top = $this->dispatchOneStep($game, true);
        $this->assertEquals(2, count($top));
    }

    public function testDraft() {
        $m = $this->game();
        $op = $m->getOperationInstanceFromType("2draft", PCOLOR);
        $this->subTestOperationIntegrity($op);
        $args = $op->arg();
        $this->assertFalse($op->requireConfirmation());
        $this->assertTrue($op->noValidTargets());
        $this->assertFalse($op->isVoid()); // is not void if no cards its skipped
        $this->assertTrue($op->canResolveAutomatically());
        $this->assertTrue($op->canSkipChoice());
        $this->assertEquals('2draft', $op->getMnemonic());

        $ttype = $args['ttype'];
        $this->assertEquals('token', $ttype);
        $count = 2;
        $this->assertTrue($op->auto(PCOLOR, $count));
    }

    public function testPayop() {
        $m = $this->game();
        $op = $m->getOperationInstanceFromType("npu_Any:pu", PCOLOR);
        $this->subTestOperationIntegrity($op);
    }

    public function testDiscardDraw() {

        $m = $this->game();
        $op = $m->getOperationInstanceFromType("?(discard:draw)", PCOLOR);
        $this->subTestOperationIntegrity($op);
        //$args = $op->arg();
        $this->assertFalse($op->requireConfirmation());
        $this->assertTrue($op->isOptional());
        $this->assertTrue($op->noValidTargets());
        $this->assertTrue($op->canResolveAutomatically());
        $this->assertTrue($op->canSkipChoice());
        $this->assertFalse($op->canFail());

        $count = 1;
        $this->assertTrue($op->auto(PCOLOR, $count));
    }

    public function testDiscardOpt() {

        $m = $this->game();
        $op = $m->getOperationInstanceFromType("?discard", PCOLOR);
        $this->subTestOperationIntegrity($op);
        //$args = $op->arg();
        $this->assertFalse($op->requireConfirmation());
        $this->assertTrue($op->isOptional());
        $this->assertTrue($op->noValidTargets());
        $this->assertTrue($op->canResolveAutomatically());
        $this->assertTrue($op->canSkipChoice());
        $this->assertFalse($op->canFail());

        $count = 1;
        $this->assertTrue($op->auto(PCOLOR, $count));
    }

    public function testDiscardNVT() {

        $m = $this->game();
        $op = $m->getOperationInstanceFromType("discard", PCOLOR);
        $this->subTestOperationIntegrity($op);
        //$args = $op->arg();
        $this->assertTrue($op->requireConfirmation());
        $this->assertFalse($op->isOptional());
        $this->assertTrue($op->noValidTargets());
        $this->assertFalse($op->canResolveAutomatically());
        $this->assertTrue($op->canSkipChoice());
        $this->assertTrue($op->canFail());

        $count = 1;
        $this->assertFalse($op->auto(PCOLOR, $count));
    }

    public function testComplex() {
        $m = $this->game();
        $card = $m->mtFind('name',  'Olympus Conference');
        //$m->effect_playCard(PCOLOR, $card);

        $optype = "res,m/nres";
        $op = $m->getOperationInstanceFromType($optype, PCOLOR, 1, "$card:e:$card");
        $this->subTestOperationIntegrity($op);
        $this->assertFalse($op->requireConfirmation());
        $this->assertFalse($op->isOptional());
        $this->assertFalse($op->noValidTargets());
        $this->assertFalse($op->canResolveAutomatically());
        $m->putInEffectPool(PCOLOR, $optype, "$card:e:$card");
        $top = $this->dispatchOneStep($m);
        $this->assertEquals(2, count($top)); // expended into 2
        $top = $this->dispatchOneStep($m);
        $this->assertEquals(1, count($top)); // reduced to one because nres is void
        $top = $this->dispatchOneStep($m);
        $this->assertEquals(2, count($top)); // res, m 
        $top = $this->dispatchOneStep($m); // m left
        $this->assertEquals(0,  $m->getTrackerValue(PCOLOR, 'm'));
        $this->dispatchOneStep($m, false); // done

        $this->assertEquals(1,  $m->getTrackerValue(PCOLOR, 'm'));
    }

    public function testComplex2() {
        $m = $this->game();
        $optype = "1npp,4pm";
        $op = $m->getOperationInstanceFromType($optype, PCOLOR, 1);
        $this->subTestOperationIntegrity($op);
    }

    public function test_res() {
        $m = $this->game();
        $optype = "p/res";
        $card = $m->mtFind('name',  'Arctic Algae');
        $op = $m->getOperationInstanceFromType($optype, PCOLOR, 1, $card);
        $this->subTestOperationIntegrity($op);
        $m->putInEffectPool(PCOLOR, $optype, $card);
        $top = $this->dispatchOneStep($m);
        $this->assertEquals(2, count($top)); // p/res
        $top = $this->dispatchOneStep($m);
        $this->assertEquals(1, count($top)); // p
        $this->dispatchOneStep($m, false); // done

        $this->assertEquals(1,  $m->getTrackerValue(PCOLOR, 'p'));
    }

    function dispatchOneStep($game, $done = false) {
        $this->assertEquals($done, $game->machineDistpatchOneStep());
        return $game->machine->getTopOperations();
    }

    function subTestOperationIntegrity($op) {
        $this->assertNotNull($op);
        $this->assertTrue($op->checkIntegrity());
        $mne = ($op->getMnemonic());
        $opargs = $op->arg();
        $this->assertNotNull($opargs);
        $visargs = $opargs['args'];
        $this->assertNotNull($visargs);
        $complex = $op instanceof ComplexOperation;
        if ($op->isOptional()) {
            $this->assertFalse($op->isVoid());
            if ($op->canSkipChoice()) {
                $this->assertTrue($op->noValidTargets(), "can skip choice but valid targets $mne");
                $this->assertTrue($op->canResolveAutomatically());
            }
        } else {
            if ($op->canSkipChoice()) {
                $this->assertTrue($op->isVoid(), "can skip choice but not void $mne");
                if (!$complex)
                    $this->assertTrue($op->noValidTargets(), "can skip choice but valid targets $mne");
            }
        }
        if (!$op->noValidTargets()) {
            if (!$complex)
                $this->assertFalse($op->isVoid(), "void with valid targets $mne");
        }
        if ($op->isVoid()) {
            $this->assertTrue($op->canFail(), "can fail $mne");
        }
    }

    function subTestOp($m, $key, $info = []) {
        $type = array_get($info, 'type', substr($key, 3));
        $this->assertTrue(!!$type);

        /** @var AbsOperation */
        $op = $m->getOperationInstanceFromType($type, PCOLOR);
        $this->subTestOperationIntegrity($op);

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

        $m->effect_placeTile($p, 'tile_2_1', 'hex_3_2');
        $card = $m->mtFind('name', 'Lava Tube Settlement');
        $effect = $m->getRulesFor($card, 'r');
        /** @var ComplexOperation */
        $op = $m->getOperationInstanceFromType($effect, $p, 1, $card);
        $m->setTrackerValue(PCOLOR, 'pe', 0);
        $this->assertEquals(true, $op->isVoid());
        /** @var ComplexOperation */
        $op = $m->getOperationInstanceFromType($effect, $p, 1, $card);
        $m->setTrackerValue(PCOLOR, 'pe', 1);
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
        $m->dbSetTokenLocation("resource_{$p}_1", $psyc, 0); // add a microbe


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

        $m->dbSetTokenLocation("resource_{$p}_2", $psyc, 0); // add a microbe
        $args = $m->debug_oparg($payment, $card);
        $targets = $args['args']['target'];
        $this->assertEquals(count($targets), 5);
        $this->assertEquals('payment', $targets[0]);
        $this->assertEquals('1s4m', $targets[1]);
        $this->assertEquals('2resMicrobe2m', $targets[2]);
        $this->assertEquals('1s2resMicrobe', $targets[3]);

        $m->setTrackerValue(PCOLOR, 'm', 2);
        $m->dbSetTokenLocation("resource_{$p}_2", $psyc, 0); // add a microbe
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


    public function test_getProductionPlacementBonus() {
        $game = $this->game(4);
        $bo=$game->getProductionPlacementBonus('hex_3_5');
        $this->assertEquals('ps/pu', $bo);
    }

    public function test_getMiningGuild() {
        $game = $this->game(4);
        $p = PCOLOR;

        $corp = $game->mtFindByName('Mining Guild');
        $game->effect_playCorporation(PCOLOR, $corp, false);
        $game->effect_playCorporation(PCOLOR, $corp, true);
        $game->st_gameDispatch();
        $this->assertEquals(1,  $game->getTrackerValue(PCOLOR, 'ps'));
        $game->effect_placeTile($p, 'tile_2_2', 'hex_3_5');
        $game->st_gameDispatch();
        // asks what resource to gain
        $tops = $game->machine->getTopOperations(PCOLOR);
        $op =  array_shift($tops);
        $this->assertEquals("q", $op['type']);
        $op =  array_shift($tops);
        $this->assertEquals("ps", $op['type']); // gain steel
    }
}
