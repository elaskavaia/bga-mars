<?php

define("APP_GAMEMODULE_PATH", getenv("APP_GAMEMODULE_PATH"));

spl_autoload_register(function ($class_name) {
    switch ($class_name) {
        case "MachineInMem":
            include "tests/MachineInMem.php";
            break;
        case "APP_GameClass":
            //var_dump($class_name);
            //var_dump(APP_GAMEMODULE_PATH);
            include APP_GAMEMODULE_PATH . "/module/table/table.game.php";
            break;
        case "PHPUnit\\Framework\\TestCase":
            if (FAKE_PHPUNIT) {
                include "tests/FakeTestCase.php";
                break;
            }
            include $class_name . ".php";
            break;
        default:

            include $class_name . ".php";
            break;
    }
});
