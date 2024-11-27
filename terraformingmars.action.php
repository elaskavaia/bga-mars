<?php

/**
 *------
 * BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
 * game implementation : © Alena Laskavaia <laskava@gmail.com>
 *
 * This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
 * See http://en.boardgamearena.com/#!doc/Studio for more information.
 * -----
 *
 * .action.php
 *
 * dojoless main action entry point
 *
 *
 * In this file, you are describing all the methods that can be called from your
 * user interface logic (javascript).
 *
 * If you define a method "myAction" here, then you can call it from your javascript code with:
 * this.ajaxcall( "/game/game/myAction.html", ...)
 *
 */
class action_terraformingmars extends APP_GameAction {
    // Constructor: please do not modify
    public function __default() {
        if (self::isArg("notifwindow")) {
            $this->view = "common_notifwindow";
            $this->viewArgs["table"] = self::getArg("table", AT_posint, true);
        } else {
            $this->view = "terraformingmars_terraformingmars";
            self::trace("Complete reinitialization of board game");
        }
    }
    
    // REST API FUNCTIONS
    public function undo() {
        self::setAjaxMode();
        $move_id = self::getArg('move_id', AT_posint, false, 0);
        $this->game->action_undo($move_id);
        self::ajaxResponse();
    }

    public function passauto() {
        self::setAjaxMode();
        $this->game->action_passauto();
        self::ajaxResponse();
    }

    public function userAction() {
        self::setAjaxMode();
        $mainaction = self::getArg("call", AT_alphanum, true);
        $args = $this->getJsArg("args");
        $this->invoke($mainaction, $args);
        self::ajaxResponse();
    }

    public function changePreference()
    {
        self::setAjaxMode();
        $pref = self::getArg('pref_id', AT_posint);
        $value = self::getArg('pref_value', AT_int);
        $player_id = self::getArg('player_id', AT_posint);
        $this->game->action_changePreference($player_id, $pref, $value);
        self::ajaxResponse();
    }

    public function getRollingVp() {
        self::setAjaxMode();

        $category = self::getArg("category", AT_alphanum, false, ''); // if only interested in score for specific category
        $player_id = (int) self::getArg("player_id", AT_posint, false, 0); // if only interested in score for specific player (otherwise all)
        
        $res = $this->game->getRollingVp($player_id, $category);
        self::ajaxResponseWithResult([ 'contents' => $res,'length' => count($res) ]);
    }

    public function getUiProgressUpdate() {
        self::setAjaxMode();
        
        $res = $this->game->getProgressTable();
        self::ajaxResponseWithResult([ 'contents' => $res,'length' => count($res) ]);
    }

    // UTILS
    private function invoke($action, $args) {
        $game = $this->game;
        $game->checkAction($action); // this makes sure action is in the list of declared action by state, so its a whitelist 
        $method = new ReflectionMethod(get_class($game), "action_${action}");
        if (!$method) {
            return;
        }
        $this->game->prof_point("userAction_$action","start");
        $method->invoke($game, $args);
        $this->game->prof_point("userAction_$action","end");
    }

    private  function getJsArg($var) {
        $value = self::getArg($var, AT_json, true);
        $this->validateJSonAlphaNum($value, $var);
        return $value;
    }

    private  function validateJSonAlphaNum($value, $argName = "unknown") {
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
