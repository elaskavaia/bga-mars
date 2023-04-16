<?php declare(strict_types=1);
use PHPUnit\Framework\TestCase;

require_once "../mars.game.php";
require_once "TokensInMem.php";

class GameUT extends mars {
    function __construct() {
        parent::__construct();
        include "../material.inc.php";
        $this->tokens = new TokensInMem();
    }

    function init(){
        $this->createTokens();
    }
    // override/stub methods here that access db and stuff
}

define("PCOLOR","ff0000");
final class GameTest extends TestCase {
    public function testGameProgression() {
        $m = new GameUT();
        $m->init();
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
        $m = new GameUT();
        $m->init();
        $op = $m->getOperationInstance('m');
        $res = $op->auto("ff0000",1);
        $this->assertTrue($res);
    }

    private function game(){
        $m = new GameUT();
        $m->init();
        return $m;
    }


    public function testArgIfo(){
         $info = $this->game()->createArgInfo(PCOLOR, ["a","b"], function ($a, $b) {
            return 0;
        });
        $this->assertTrue($info["a"]['rejected']==0);
    }
}
