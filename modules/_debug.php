<?php declare(strict_types=1);


//define("APP_GAMEMODULE_PATH", getenv('APP_GAMEMODULE_PATH')); 

//require_once "DbMachine.php";

class TestCase {
    function assertNotNull($exp,$string = null) {}
    function assertEquals($expected,$exp,$string = null) {}
}

require_once "_autoload.php"; 

function getMachine($input) {
    $m = new MachineInMem();
    $m->insertRule($input);

    return $m;
}

require_once "tests/GameTest.php";

 $x=new GameTest();
 $x->testInstanciate();


//  $res = OpExpression::parseExpression("call(a),m");
//  echo ($res->toFunc());


