<?php

define("APP_GAMEMODULE_PATH", getenv("APP_GAMEMODULE_PATH"));

spl_autoload_register(function ($class_name) {
    switch ($class_name) {
        case "MachineInMem":
            include "tests/MachineInMem.php";
            break;
        case "APP_GameClass":
        case "APP_Object":
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
        case "terraformingmars":
            include "modules/terraformingmars.game.php";
        default:
            if (strpos($class_name, "Operation_") === 0) {
                include "modules/operations/". $class_name . ".php";
            } else {
                include "modules/". $class_name . ".php";
            }
            break;
    }
});
