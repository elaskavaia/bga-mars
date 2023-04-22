<?php declare(strict_types=1);
use PHPUnit\Framework\TestCase;

require_once "../mars.game.php";
require_once "TokensInMem.php";

class GameUT extends mars {
    function __construct() {
        parent::__construct();
        include "../material.inc.php";
        include "../states.inc.php";
        $this->tokens = new TokensInMem();
        $this->machine = new MachineInMem();
    }

    function init(){
        $this->createTokens();
    }
    // override/stub methods here that access db and stuff
}

define("PCOLOR","ff0000");
final class GameTest extends TestCase {
    public function testGameProgression() {
        $m = $this->game();
        $this->assertNotFalse($m);
        $this->assertEquals(0,$m->getGameProgression());
        $m->tokens->setTokenState('tracker_o',5);
        $this->assertTrue($m->getGameProgression()>0);
        $m->tokens->setTokenState('tracker_o',14);
        $m->tokens->setTokenState('tracker_w',9);
        $m->tokens->setTokenState('tracker_t',8);
        $this->assertTrue($m->getGameProgression()==100);
    }

    public function testOps() {
        $m = $this->game();
        $op = $m->getOperationInstance('m');
        $res = $op->auto("ff0000",1);
        $this->assertTrue($res);
    }

    private function game() {
        $m = new GameUT();
        $m->init();
        return $m;
    }


    public function testArgIfo(){
         $info = $this->game()->createArgInfo(PCOLOR, ["a","b"], function ($a, $b) {
            return 0;
        });
        $this->assertTrue($info["a"]['q']==0);
    }

    public function testEvalute() {
        $m = $this->game();

        $m->tokens->setTokenState('tracker_u_'.PCOLOR,8);
        $this->assertEquals(8,$m->evaluateExpression("u",PCOLOR));
        $this->assertEquals(1,$m->evaluateExpression("u > 1",PCOLOR));
        $m->tokens->setTokenState('tracker_u_'.PCOLOR,7);
        $this->assertEquals(3,$m->evaluateExpression("u/2",PCOLOR));
        $this->assertEquals(3,$m->evaluateExpression("(u>0)*3",PCOLOR));
        $m->tokens->setTokenState('tracker_t_'.PCOLOR,0);
        $this->assertEquals(0,$m->evaluateExpression("(t>0)*3",PCOLOR));
    }


    public function testCounterCall() {
        $m = $this->game();
        $m->tokens->setTokenState('tracker_u_'.PCOLOR,8);
       // $m->incTrackerValue(PCOLOR,'u',8);
        $m->machine->insertRule("counter(u) m",1,1,1,PCOLOR);
        $ops=$m->machine->getTopOperations();
        $op = array_shift($ops);
        $m->executeOperationSingle($op);
        $ops=$m->machine->getTopOperations();
        $op = array_shift($ops);
        $this->assertEquals(8,$op['count']);
    }

    public function testPut() {
        $m = $this->game();
        $value = $m->getTrackerValue(PCOLOR,'s');
        $this->assertEquals(0,$value);
        $m->put(PCOLOR,"2s");
        $m->st_gameDispatch();
        $value = $m->getTrackerValue(PCOLOR,'s');
        $this->assertEquals(2,$value);

    }
}
