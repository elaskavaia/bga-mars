<?php

declare(strict_types=1);

// run this before deploy!

define("FAKE_PHPUNIT", 1);

//require_once "DbMachine.php";


require_once "_autoload.php";
require_once "tests/GameTest.php";
require_once "tests/MathExpressionTest.php";

$x = new GameTest("GameTest");
$methods = get_class_methods($x);
foreach ($methods as $method) {
    if (startsWith($method,"test")) {
        echo("calling $method\n");
        call_user_func_array([$x, $method], []);
    }
}
$x = new MathExpressionTest("MathExpressionTest");
$x->testOpExpressionEval();
echo "DONE, ALL GOOD\n";