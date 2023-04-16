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
 $x->testOps();

//  $m = getMachine("a/b/c;d");
//  echo ($m->gettableexpr());
//  $resolve = "a";
//  $index = $m->findByType($resolve);
//  $ret = $m->resolve($index, 1);
//  echo ($m->gettableexpr());
 //OpExpression::json("m");


