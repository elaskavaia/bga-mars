<?php declare(strict_types=1);


define("FAKE_PHPUNIT", 1); 

//require_once "DbMachine.php";


require_once "_autoload.php"; 

function getMachine($input) {
    $m = new MachineInMem();
    $m->insertRule($input);

    return $m;
}

require_once "tests/GameTest.php";

 $x=new GameTest();
 $x->testResolveAcivate();


//  $res = OpExpression::parseExpression("call(a),m");
//  echo ($res->toFunc());


