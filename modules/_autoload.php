<?php

require_once __DIR__ . '/../misc/BgaFrameworkStubs.php';

spl_autoload_register(function ($class_name) {
    switch ($class_name) {
        case "MachineInMem":
            include "tests/MachineInMem.php";
            break;
        case "GameUT":
            include "tests/GameUT.php";
            break;
        case "terraformingmars":
            include "modules/terraformingmars.game.php";
        default:
            if (strpos($class_name, "Operation_") === 0) {
                include "modules/operations/" . $class_name . ".php";
            } else {
                include "modules/" . $class_name . ".php";
            }
            break;
    }
});
