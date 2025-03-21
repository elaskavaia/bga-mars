<?php

declare(strict_types=1);

// run this before deploy!

define("FAKE_PHPUNIT", 1);

//require_once "DbMachine.php";


require_once "_autoload.php";
require_once "tests/GameTest.php";
require_once "tests/MathExpressionTest.php";
require_once "tests/DbMachineTest.php";
require_once "tests/OpExpressionTest.php";

function runClassTests(object $x) {
    $methods = get_class_methods($x);
    foreach ($methods as $method) {
        if (startsWith($method,"test")) {
            //echo("calling $method\n");
            try {
            call_user_func_array([$x, $method], []);
            } catch (Exception $e) {
               echo("FAIL: $method $e\n");  
               throw new Error();
            }
        }
    }
}


runClassTests(new MathExpressionTest("MathExpressionTest"));
runClassTests(new OpExpressionTest("OpExpressionTest"));
runClassTests(new DbMachineTest("DbMachineTest"));
runClassTests(new GameTest("GameTest"));


echo "DONE, ALL GOOD\n";