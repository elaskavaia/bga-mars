<?php

/**
 *------
 * BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
 * mars implementation : © Alena Laskavaia <laskava@gmail.com>
 *
 * This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
 * See http://en.boardgamearena.com/#!doc/Studio for more information.
 * -----
 *
 * mars.action.php
 *
 * dojoless main action entry point
 *
 *
 * In this file, you are describing all the methods that can be called from your
 * user interface logic (javascript).
 *
 * If you define a method "myAction" here, then you can call it from your javascript code with:
 * this.ajaxcall( "/mars/mars/myAction.html", ...)
 *
 */
class action_mars extends APP_GameAction {
    // Constructor: please do not modify
    public function __default() {
        if (self::isArg("notifwindow")) {
            $this->view = "common_notifwindow";
            $this->viewArgs["table"] = self::getArg("table", AT_posint, true);
        } else {
            $this->view = "mars_mars";
            self::trace("Complete reinitialization of board game");
        }
    }

    public function undo() {
        self::setAjaxMode();
        $this->game->action_undo();
        self::ajaxResponse();
    }

    public function userAction() {
        self::setAjaxMode();
        $mainaction = self::getArg("call", AT_alphanum, true);
        $args = $this->getJsArg("args");
        $this->invoke($mainaction, $args);
        self::ajaxResponse();
    }

    function invoke($action, $args) {
        $game = $this->game;
        $game->checkAction($action);
        $method = new ReflectionMethod(get_class($game), "action_${action}");
        if (!$method) {
            return;
        }
        $method->invoke($game, $args);
    }

    function getJsArg($var) {
        $value = self::getArg($var, AT_json, true);
        $this->validateJSonAlphaNum($value, $var);
        return $value;
    }

    function validateJSonAlphaNum($value, $argName = "unknown") {
        if (is_array($value)) {
            foreach ($value as $key => $v) {
                $this->validateJSonAlphaNum($key, $argName);
                $this->validateJSonAlphaNum($v, $argName);
            }
            return true;
        }
        if (is_int($value)) {
            return true;
        }
        $bValid = preg_match("/^[0-9a-zA-Z_\- ]*$/", $value) === 1; // NOI18N
        if (!$bValid) {
            throw new feException(
                "Bad value for: $argName",
                true,
                true,
                FEX_bad_input_argument
            );
        }
        return true;
    }
}
