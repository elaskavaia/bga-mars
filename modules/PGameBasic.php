<?php

/**
 * This class contains more useful method which is missing from Table class.
 * To use extend this instead instead of Table, i.e
 *
 <code>
 require_once (APP_GAMEMODULE_PATH . 'module/table/table.game.php');
 require_once ('modules/tokens.php');
 require_once ('modules/PGameBasic.php');

 class BattleShip extends PGameBasic {
 }
 </code>
 *
 */
define("GS_PLAYER_TURN_NUMBER", "playerturn_nbr");
require_once APP_GAMEMODULE_PATH . "module/table/table.game.php";

abstract class PGameBasic extends Table {
    protected $undoSaveOnMoveEndDup = false;
    protected array $player_colors;
    function __construct() {
        parent::__construct();
    }

    /*
     * setupNewGame:
     *
     * This method is called only once, when a new game is launched.
     * In this method, you must setup the game according to the game rules, so that
     * the game is ready to be played.
     */
    protected function setupNewGame($players, $options = []) {
        /**
         * ********** Start the game initialization ****
         */
        $this->initPlayers($players);
        $this->initStats();
        // Setup the initial game situation here
        $this->initTables();
        /**
         * ********** End of the game initialization ****
         */
    }

    /**
     * override to setup all custom tables
     */
    protected function initTables() {}

    public function initPlayers($players) {
        // Set the colors of the players with HTML color code
        // The default below is red/green/blue/orange/brown
        // The number of colors defined here must correspond to the maximum number of players allowed for the gams
        $gameinfos = self::getGameinfos();
        $default_colors = $gameinfos["player_colors"];
        shuffle($default_colors);
        // Create players
        // Note: if you added some extra field on "player" table in the database (dbmodel.sql), you can initialize it there.
        $sql = "INSERT INTO player (player_id, player_color, player_canal, player_name, player_avatar) VALUES ";
        $values = [];
        foreach ($players as $player_id => $player) {
            $color = array_shift($default_colors);
            $values[] =
                "('" .
                $player_id .
                "','$color','" .
                $player["player_canal"] .
                "','" .
                addslashes($player["player_name"]) .
                "','" .
                addslashes($player["player_avatar"]) .
                "')";
        }
        $sql .= implode(",", $values);
        $this->DbQuery($sql);
        if ($gameinfos["favorite_colors_support"]) {
            self::reattributeColorsBasedOnPreferences($players, $gameinfos["player_colors"]);
        }
        self::reloadPlayersBasicInfos();
        $this->activeNextPlayer(); // just in case so its not 0, dev code can change it later
    }

    public function initStats() {
        // INIT GAME STATISTIC
        $all_stats = $this->getStatTypes();
        $player_stats = $all_stats["player"];
        // auto-initialize all stats that starts with game_
        // we need a prefix because there is some other system stuff
        foreach ($player_stats as $key => $value) {
            if (startsWith($key, "game_")) {
                $this->initStat("player", $key, 0);
            }
            if ($key === "turns_number") {
                $this->initStat("player", $key, 0);
            }
        }
        $table_stats = $all_stats["table"];
        foreach ($table_stats as $key => $value) {
            if (startsWith($key, "game_")) {
                $this->initStat("table", $key, 0);
            }
            if ($key === "turns_number") {
                $this->initStat("table", $key, 0);
            }
        }
    }

    public function getStateIdByTransitionName($action) {
        $state = $this->gamestate->state();
        foreach ($state["transitions"] as $possible_action => $possible_next_state) {
            if ($action == $possible_action) {
                return $possible_next_state;
            }
        }
        return 0; // not found
    }

    public function notifyGameStateArgsChange($player_id) {
        $curr_id = $this->gamestate->state_id();
        $gamestate = $this->gamestate->states[$curr_id];
        $state_args = $this->gamestate->state(false, true);
        $state_args["type"] = $gamestate["type"];

        // reload game state args
        if (isset($gamestate["args"])) {
            if (!method_exists($this, $gamestate["args"])) {
                throw new feException("Invalid 'args' method for state $curr_id");
            }

            $state_args["args"] = $this->{$gamestate["args"]}();
        }

        $this->notifyPlayer($player_id, "gameStateChange", "", $state_args);
    }

    // ------ ERROR HANDLING ----------
    /**
     * This will throw an exception if condition is false.
     * The message should be translated and shown to the user.
     *
     * @param $message string
     *            user side error message, translation is needed, use totranslate() when passing string to it (because it needs to be marked but this method will wrap it into _)
     * @param $cond boolean
     *            condition of assert
     * @param $log string
     *            optional log message, not need to translate
     * @throws BgaUserException
     */
    function userAssertTrue($message, $cond = false, $log = "") {
        if ($cond) {
            return;
        }
        if ($log) {
            $move = $this->getGameStateValue("playerturn_nbr");
            $this->warn("User Error during move $move: $message $log|");
        }
        throw new BgaUserException($message);
    }

    /**
     * This will throw an exception if condition is false.
     * This only can happened if user hacks the game, client must prevent this
     *
     * @param string $log
     *            server side log message, no translation needed
     * @param bool $cond
     *            condition of assert
     * @throws BgaUserException
     */
    function systemAssertTrue($log, $cond = false) {
        if ($cond) {
            return;
        }
        $this->dumpError($log);
        throw new BgaUserException("Internal Error. That should not have happened. Reload page and Retry" . " " . $log);
    }

    function dumpError($log) {
        $move = $this->getGameStateValue("playerturn_nbr");
        $this->error("Internal Error during move $move: $log.");
        $e = new Exception($log);
        $this->error($e->getTraceAsString());
    }

    // ------ DEBUG ----------
    /*
     * @Override to trim, because debugging does not work well with spaces (i.e. not at all).
     * cannot override debugChat because 'say' calling it statically
     */
    function say($message) {
        $message = trim($message);
        try {
            if ($this->isStudio() && $this->debugChat($message)) {
                return parent::say(":" . $message);
            }
        } catch (Throwable $e) {
            $this->error($e);
            $this->debugConsole("ERROR: exception is thrown for $message", ["e" => $e]);
            return parent::say(":" . $message);
        }
        return parent::say($message);
    }

    function isStudio() {
        return $this->getBgaEnvironment() == "studio";
    }

    // Debug from chat: launch a PHP method of the current game for debugging purpose
    function debugChat($message) {
        $object = $this;
        $message = html_entity_decode($message);
        // $parts = explode("->", $message);
        // if (count($parts) > 1) {
        //     try {
        //         $code = 'return $this->' . $parts[0] . ";";
        //         $message = $parts[1];
        //         $object = e_v_a_l("$code");
        //     } catch (Throwable $t) {
        //         self::notifyPlayer($this->getCurrentPlayerId(), "simplenotif", "DEBUG: running $code; Error: method $t", []);
        //         return false;
        //     }
        // }
        $res = [];
        preg_match("/^([a-zA-Z_0-9]*) *\((.*)\)$/", $message, $res);
        if (count($res) == 3) {
            $method = $res[1];
            $args = explode(",", $res[2]);
            if ($res[2] === "") {
                $args = [];
            }
            foreach ($args as &$value) {
                if ($value === "null") {
                    $value = null;
                } elseif ($value === "[]") {
                    $value = [];
                }
            }
            if (method_exists($object, $method)) {
                self::notifyAllPlayers("simplenotif", "DEBUG: calling $message", []);
                $ret = call_user_func_array([$object, $method], $args);
                if (is_scalar($ret)) {
                    $retval = $ret;
                } elseif (!$ret) {
                    $retval = "falsy";
                } else {
                    $retval = "arr";
                }
                $this->debugConsole("RETURN: $method -> $retval", ["ret" => $ret]);
                return true;
            } else {
                self::notifyPlayer(
                    $this->getCurrentPlayerId(),
                    "simplenotif",
                    "DEBUG: running $message; Error: method $method() does not exists",
                    []
                );
                return true;
            }
        }
        return false;
    }

    function debugConsole($info, $args = []) {
        $this->notifyAllPlayers("log", $info, $args);
        $this->warn($info);
    }
    function debugLog($info, $args = []) {
        $this->notifyAllPlayers("log", "", $args + ["info" => $info]);
        $this->warn($info);
    }

    // ------ NOTIFICATIONS ----------
    /**
     * Advanced notification, which does more work on parameters
     * 1) If player id is not set it will try to determine it
     * 2) If player_id is set or passed via args it will also add player_name
     * 3) Auto add i18n tag to for all keys if they ends with _name or _tr
     * 4) Auto add preserve tag if keys end with _preserve
     * 5) If _previte is set true in args - send as private, otherwise sends to all players
     * 6) Can also pass _notifType via $args insterad of $type if needed
     * 7) Can add special animation params via args:
     * 'nod'=>true // no delay
     * 'noa'=>true // no animation
     * 'nop'=>true // ignore
     * If any of these parameters passed the type will change to be "${type}Async"
     * - which should be supported on clinet as asyncronious notification
     */
    function notifyWithName($type, $message = "", $args = null, $player_id = 0) {
        if ($args == null) {
            $args = [];
        }
        $this->systemAssertTrue("Invalid notification signature", is_array($args));
        $this->systemAssertTrue("Invalid notification signature", is_string($message));
        if (array_key_exists("player_id", $args) && !$player_id) {
            $player_id = $args["player_id"];
        }
        if (!$player_id) {
            $player_id = $this->getMostlyActivePlayerId();
        }
        $args["player_id"] = $player_id;
        if ($message) {
            // automaticaly add to i18n array all keys if they ends with _name or _tr, except reserved which are auto-translated on client side
            $i18n = array_get($args, "i18n", []);
            foreach ($args as $key => $value) {
                if (
                    is_string($value) &&
                    (endsWith($key, "_tr") ||
                        (endsWith($key, "_name") && $key != "player_name" && $key != "token_name" && $key != "place_name"))
                ) {
                    $i18n[] = $key;
                }
            }
            if (count($i18n) > 0) {
                $args["i18n"] = $i18n;
            }
        }
        if ($message) {
            $player_name = $this->getPlayerNameById($player_id);
            $args["player_name"] = $player_name;
        }
        if (isset($args["_notifType"])) {
            $type = $args["_notifType"];
            unset($args["_notifType"]);
        }
        $this->systemAssertTrue("Invalid notification signature", is_string($type));
        if (array_key_exists("noa", $args) || array_key_exists("nop", $args) || array_key_exists("nod", $args)) {
            $type .= "Async";
        }
        // automaticaly add to preserve array all keys if they ends with _preserve
        $preserve = array_get($args, "preserve", []);
        foreach ($args as $key => $arg) {
            if (is_string($arg) && endsWith($key, "_preserve")) {
                $preserve[] = $key;
            }
            if ($key == "reason_tr") {
                $preserve[] = $key;
            }
        }
        if (count($preserve) > 0) {
            $args["preserve"] = $preserve;
        }
        $private = false;
        if (array_key_exists("_private", $args)) {
            $private = $args["_private"];
            unset($args["_private"]);
        }
        if ($private) {
            $this->notifyPlayer($player_id, $type, $message, $args);
        } else {
            $this->notifyAllPlayers($type, $message, $args);
        }
    }

    function notifyMessage($message, $args = [], $player_id = 0) {
        $this->notifyWithName("message", $message, $args, $player_id);
    }

    function notifyAnimate($delay) {
        if (!$delay) {
            $delay = 1000;
        }
        $this->notifyAllPlayers("animate", "", ["time" => $delay]);
    }

    // ------ PLAYERS ----------
    /**
     *
     * @return integer first player in natural player order
     */
    function getFirstPlayer() {
        $table = $this->getNextPlayerTable();
        return $table[0];
    }

    /**
     *
     * @return string hex color as in players table for the player with $player_id
     */
    function getPlayerColorById($player_id) {
        $players = $this->loadPlayersBasicInfos();
        if (!isset($players[$player_id])) {
            return "fffff0";
        }
        return $players[$player_id]["player_color"];
    }

    function getPlayerColorByNo(int $no) {
        $players = $this->loadPlayersBasicInfos();
        foreach ($players as $player_id => $player_info) {
            if ($player_info["player_no"] == $no) {
                return $player_info["player_color"];
            }
        }
        if ($no == count($players) + 1 || $no == 0) {
            // neutural player for solo game, white
            return "ffffff";
        }
        return null;
    }

    function getActivePlayerColor() {
        return $this->getPlayerColorById($this->getActivePlayerId());
    }

    function isRealPlayer($player_id) {
        $players = $this->loadPlayersBasicInfos();
        return isset($players[$player_id]);
    }

    function isZombiePlayer($player_id) {
        $players = $this->loadPlayersBasicInfos();
        if (isset($players[$player_id])) {
            if ($players[$player_id]["player_zombie"] == 1) {
                return true;
            }
        }
        return false;
    }

    function isPlayerEliminated($player_id) {
        $players = self::loadPlayersBasicInfos();
        if (isset($players[$player_id])) {
            return $players[$player_id]["player_eliminated"] == 1;
        }
        return false;
    }

    function isPlayerAlive($player_id) {
        return $this->isRealPlayer($player_id) && !$this->isPlayerEliminated($player_id) && !$this->isZombiePlayer($player_id);
    }

    function countAlivePlayers() {
        $players = $this->loadPlayersBasicInfos();
        $count = 0;
        foreach ($players as $player_id => $info) {
            if ($info["player_zombie"] == 1) {
                continue;
            }
            if ($info["player_eliminated"] == 1) {
                continue;
            }
            $count++;
        }

        return $count;
    }

    function debug_makeZombie($player_id, $z = 1) {
        // if ($this->getActivePlayerId()==$player_id) throw new feException("Cannot call this function on active player");
        $this->o_tableinfos->setZombie($player_id, $z);
        $this->reloadPlayersBasicInfos();
        //$this->onPlayerHasBeenZombified( $player_id );
        $this->sendNotifications();
        if (!$z) {
            return;
        }
        $active_player_list = $this->gamestate->getActivePlayerList();
        //$players = self::loadPlayersBasicInfos();
        $state = $this->gamestate->state(true, false, true);
        if ($state["type"] == "activeplayer" || $state["type"] == "multipleactiveplayer") {
            // Check active player is not a zombie
            foreach ($active_player_list as $active_player) {
                if ($active_player == $player_id) {
                    $this->zombieTurn($state, $player_id);
                }
            }
        }
    }

    /**
     *
     * @return integer player id based on hex $color
     */
    function getPlayerIdByColor(?string $color) {
        if (!$color) {
            return $this->getActivePlayerId();
        }
        if ($color === 8000 || $color === "8000") {
            $color = "0080000"; // weird stuff
        }
        $players = $this->loadPlayersBasicInfos();
        if (!isset($this->player_colors)) {
            $this->player_colors = [];
            foreach ($players as $player_id => $info) {
                $this->player_colors[$info["player_color"]] = $player_id;
            }
        }
        if (!isset($this->player_colors[$color])) {
            return 0;
        }
        return $this->player_colors[$color];
    }

    /**
     *
     * @return integer player position (as player_no) from database
     */
    function getPlayerPosition($player_id) {
        $players = $this->loadPlayersBasicInfos();
        if (!isset($players[$player_id])) {
            return -1;
        }
        return $players[$player_id]["player_no"];
    }

    public function getStateName() {
        $state = $this->gamestate->state();
        return $state["name"];
    }

    /**
     *
     * @return array of player ids
     */
    function getPlayerIds() {
        $players = $this->loadPlayersBasicInfos();
        return array_keys($players);
    }

    function getPlayerIdsInOrder($starting) {
        $player_ids = $this->getPlayerIds();
        $rotate_count = array_search($starting, $player_ids);
        if ($rotate_count === false) {
            return $player_ids;
        }
        for ($i = 0; $i < $rotate_count; $i++) {
            array_push($player_ids, array_shift($player_ids));
        }
        return $player_ids;
    }

    /**
     * Return player table in order starting from $staring player id, if $starting is not in the player table
     * i.e.
     * spectator returns same as loadPlayersBasicInfos(), i.e. natural player order
     * This is useful in view.php file
     *
     * @param number $starting
     *            - player number
     * @return string[][] - map of playerId => playerInfo
     */
    function getPlayersInOrder($starting) {
        $players = $this->loadPlayersBasicInfos();
        $player_ids = $this->getPlayerIdsInOrder($starting);
        $result = [];
        foreach ($player_ids as $player_id) {
            $result[$player_id] = $players[$player_id];
        }
        return $result;
    }

    function getMostlyActivePlayerId() {
        if ($this->isMultiActive()) {
            return $this->getCurrentPlayerId();
        } else {
            return $this->getActivePlayerId();
        }
    }

    public function getPlayerColors() {
        $players_basic = $this->loadPlayersBasicInfos();
        $colors = [];
        foreach ($players_basic as $player_id => $player_info) {
            $colors[] = $player_info["player_color"];
        }
        return $colors;
    }

    /**
     * Change activate player, also increasing turns_number stats and giving extra time
     */
    function setNextActivePlayerCustom($next_player_id, $give_time = true, $inc_turn = true) {
        if ($inc_turn) {
            $this->incStat(1, "turns_number", $next_player_id);
            $this->incStat(1, "turns_number");
        }
        if ($give_time) {
            $this->giveExtraTime($next_player_id);
        }
        $this->gamestate->changeActivePlayer($next_player_id);
    }

    // Profiling
    function prof_point(string $str, string $type = "now", string $extra = "") {
        return;
        if (!$this->isStudio()) {
            return;
        }
        global $prof_times;
        $sid = $_SERVER["REQUEST_TIME_FLOAT"];
        $time = microtime(true) - $sid; // timestamp since request
        $gameid = spl_object_id($this); // object id of the game class

        $dur = null;

        if ($type == "start") {
            $prof_times[$str] = $time;
            // if (!$extra) $extra = array_get($_GET,'action','?')
        } elseif ($type == "end" || $type == "check") {
            if (array_key_exists($str, $prof_times)) {
                $dur = $time - $prof_times[$str];
            } else {
                $dur = 0;
            }
            $prof_times[$str] = $time;
        }

        if ($dur !== null) {
            $dur_s = sprintf("(%.06f)", $dur);
        } else {
            $dur_s = "-";
        }

        $this->debug(sprintf("prof:%.03f: g%3d: %s/%s %s %s", $time, $gameid, $str, $type, $dur_s, $extra));
    }

    // ------ DB ----------
    function dbGetScore(int $player_id) {
        return $this->getUniqueValueFromDB("SELECT player_score FROM player WHERE player_id='$player_id'");
    }

    function dbSetScore(int $player_id, int $count) {
        $this->DbQuery("UPDATE player SET player_score='$count' WHERE player_id='$player_id'");
    }

    function dbSetAuxScore(int $player_id, int $score) {
        $this->DbQuery("UPDATE player SET player_score_aux=$score WHERE player_id='$player_id'");
    }

    function dbIncScore(int $player_id, int $inc): int {
        $count = $this->dbGetScore($player_id);
        if ($inc != 0) {
            $count += $inc;
            $this->dbSetScore($player_id, $count);
        }
        return $count;
    }

    /**
     * Changes the player scrore and sends notification, also update statistic if provided
     *
     * @param int $player_id
     *            - player id
     * @param int $inc
     *            - increment of score, can be negative
     * @param string $notif
     *            - notification string, '*' - for default notification, '' - for none
     * @param string $stat
     *            - name of the player statistic to update (points source)
     * @return int - current score after increase/descrease
     */
    function dbIncScoreValueAndNotify($player_id, int $inc, $notif = "*", $stat = "", $args = []): int {
        $count = $this->dbIncScore($player_id, $inc);
        if ($notif == "*") {
            if ($inc >= 0) {
                $notif = clienttranslate('${player_name} scores ${inc} point/s');
            } else {
                $notif = clienttranslate('${player_name} loses ${mod} point/s');
            }
        }
        $this->notifyWithName(
            "score",
            $notif, //
            array_merge(["player_score" => $count, "inc" => $inc, "mod" => abs((int) $inc)], $args), //
            $player_id
        );
        if ($stat) {
            $this->dbIncStatChecked($inc, $stat, $player_id);
        }
        return $count;
    }

    function dbIncStatChecked($inc, $stat, $player_id) {
        try {
            $all_stats = $this->getStatTypes();
            $player_stats = $all_stats["player"];
            if (isset($player_stats[$stat])) {
                $this->incStat($inc, $stat, $player_id);
            } else {
                $this->error("statistic $stat is not defined");
            }
        } catch (Exception $e) {
            $this->error("error while setting statistic $stat");
            $this->dump("err", $e);
        }
    }

    /**
     * Changes values of multiactivity in db, does not sent notifications.
     * To send notifications after use updateMultiactiveOrNextState
     *
     * @param number $player_id,
     *            player id <=0 or null - means ALL
     * @param number $value
     *            - 1 multiactive, 0 non multiactive
     */
    function dbSetPlayerMultiactive($player_id = -1, $value = 1) {
        if (!$value) {
            if ($this->bIndependantMultiactiveTable) {
                $sql = "UPDATE playermultiactive SET ma_is_multiactive='0' WHERE 1";
            } else {
                $sql = "UPDATE player SET player_is_multiactive = '0' WHERE 1";
            }
        } else {
            if ($this->bIndependantMultiactiveTable) {
                $sql = "UPDATE playermultiactive SET ma_is_multiactive='1' WHERE ma_is_multiactive!='1'";
            } else {
                $sql = "UPDATE player SET player_is_multiactive = '1' WHERE player_zombie = 0 AND player_eliminated = 0";
            }
        }

        if ($player_id > 0) {
            $sql .= " AND player_id = $player_id";
        }
        $this->DbQuery($sql);
    }

    function dbGetFieldList(string $table) {
        $result = [];
        $fields = $this->getObjectListFromDB("SHOW COLUMNS FROM $table");
        foreach ($fields as $field) {
            $result[] = $field["Field"];
        }
        return $result;
    }

    function dbGetFieldListAsString(string $table) {
        $fields_list = $this->dbGetFieldList($table);
        $fields = "`" . implode("`,`", $fields_list) . "`";
        return $fields;
    }

    function dbInsertValues($table, $values) {
        if (count($values) == 0) {
            return;
        }
        $fields_list = $this->dbGetFieldList($table);
        $seqvalues = [];
        foreach ($values as $row) {
            $quoted = [];
            foreach ($fields_list as $field) {
                $value = array_get($row, $field, null);
                if ($value === null) {
                    $quoted[] = "NULL";
                } elseif (is_numeric($value)) {
                    $quoted[] = "$value";
                } else {
                    $value = $this->escapeStringForDB($value);
                    $quoted[] = "'$value'";
                }
            }
            $seqvalues[] = "( " . implode(",", $quoted) . " )";
        }
        $fields = "`" . implode("`,`", $fields_list) . "`";
        $sql = "INSERT INTO $table ($fields)";
        $sql .= " VALUES " . implode(",", $seqvalues);
        $this->DbQuery($sql);
    }

    public function isMultiActive() {
        $gamestate = $this->gamestate;
        $state = $gamestate->states[$gamestate->state_id()];
        return $state["type"] == "multipleactiveplayer";
    }

    /*
     * @Override
     * - have to override to track second copy of var flag as original one is private
     */
    function undoSavepoint() {
        //parent::undoSavepoint(); // do not set the original flag - it cannot be unset
        $this->setUndoSavepoint(true);
        //$this->statelog("undoSavepoint");
    }

    function setUndoSavepoint(bool $value) {
        $this->undoSaveOnMoveEndDup = $value;
    }

    function isUndoSavepoint() {
        return $this->undoSaveOnMoveEndDup;
    }

    /*
     * @Override
     * - I had to override this not fail in multiactive, it will just ignore it
     * - fixed resetting the save flag when its done
     */
    function doUndoSavePoint() {
        $this->statelog("*** doUndoSavePoint *** " . $this->undoSaveOnMoveEndDup);
        if (!$this->undoSaveOnMoveEndDup) {
            return;
        }

        try {
            $this->doCustomUndoSavePoint();
        } catch (Exception $e) {
            $this->error("undo save point failed " . $e->getMessage());
            $this->error($e->getTraceAsString());
        }
        $this->setUndoSavepoint(false);
    }

    function doCustomUndoSavePoint() {
        //$this->statelog("*** doCustomUndoSavePoint ***");
        if ($this->isMultiActive()) {
            return;
        }
        $this->bgaUndoSavePoint();
        //        parent::doUndoSavePoint(); //   UNDOX possible use original?
    }
    /*
     * @Override
     * fixed bug where it does not save state if there is no notifications
     */
    function sendNotifications() {
        //$next = $this->getNextMoveId();
        parent::sendNotifications();
        if ($this->undoSaveOnMoveEndDup) {
            try {
                $this->doUndoSavePoint();
                // $this->setGameStateValue('next_move_id', $next); // restore next move so it does not increase
                // parent::sendNotifications(); // if any notif was produced by undo save point send them also
            } catch (Exception $e) {
                $this->error($e->getTraceAsString());
            }
        }
    }

    function undoRestorePoint() {
        $this->bgaUndoRestorePoint();
    }

    function bgaUndoRestorePoint() {
        // self::notifyAllPlayers('undoRestorePoint', clienttranslate('${player_name} takes back his move'), [
        //     'player_name' => self::getActivePlayerName(),
        // ]);
        $this->notifyAllPlayers("undoRestorePoint", "", []);

        $undo_moves_player = self::getGameStateValue("undo_moves_player");
        if ($undo_moves_player != self::getActivePlayerId()) {
            throw new feException("The stored UNDO corresponds to another player's turn : you cannot restore it");
        }

        if ($this->isMultiActive()) {
            throw new feException("UNDO cannot be used for multiple active players game states");
        }

        // Copy all savepoints tables back to their respective table
        $tables = self::getObjectListFromDB("SHOW TABLES", true);
        $prefix = "zz_savepoint_";

        $player_id = $this->getActivePlayerId();

        // Particular case: keep current "zombie" states and reflexion time
        // Note: for the ACTIVE player we must NOT keep reflexion time values (start and remaining) for the case where some extra time has been added between
        //  the save and the restore. If some extra time has been added, keeping the time can lead to infinite loop (action => extratime => undo)
        //  where the player can accumulate as much time as he wants
        $this->DbQuery("UPDATE zz_savepoint_player, player
                                SET    zz_savepoint_player.player_zombie=player.player_zombie,
                                       zz_savepoint_player.player_start_reflexion_time=player.player_start_reflexion_time,
                                       zz_savepoint_player.player_remaining_reflexion_time=player.player_remaining_reflexion_time
                                WHERE  zz_savepoint_player.player_id=player.player_id
                                  AND  zz_savepoint_player.player_id!=$player_id");

        // Another particular case: keep globals that cannot be undone
        // GAMESTATE_GAME_RESULT_NEUTRALIZED
        // GAMESTATE_NEUTRALIZED_PLAYER_ID
        $this->DbQuery("UPDATE zz_savepoint_global, `global`
                                SET zz_savepoint_global.global_value=`global`.global_value
                                WHERE zz_savepoint_global.global_id=`global`.global_id
                                  AND `global`.global_id IN (301, 302)");

        foreach ($tables as $table) {
            if (startsWith($table, $prefix)) {
                // Save point => must be restored
                $original = substr($table, strlen($prefix));
                $copy = $table;
                $fields = self::getFieldsListOfTable($original);
                if ($original == "gamelog") {
                    // Particular case: keep private messages
                    $this->DbQuery("DELETE FROM $original WHERE gamelog_private!='1'");
                    $this->DbQuery("INSERT INTO $original SELECT * FROM $copy WHERE gamelog_private!='1'");
                } else {
                    $this->DbQuery("DELETE FROM $original");
                    $this->DbQuery("INSERT INTO $original ($fields) SELECT $fields FROM $copy");
                }
            } else {
                // This table is an original
            }
        }

        // At the end of the undo, we must erase the old savepoint by the new one.
        // This may be paradoxal, but this way we ensure that the savepoint gets all the recent updates that was not concerned by the undo,
        // including the latest notifications "undoRestorePoint".
        // Also, it allows us to have a reliable undoIsCurrentlyOnSavepoint
        self::undoSavepoint(); // UNDOX remove
    }

    function bgaUndoSavePoint() {
        if ($this->isMultiActive()) {
            throw new feException("UNDO cannot be used for multiple active players game states");
        }

        // Copy all tables to their respective savepoints

        $tables = self::getObjectListFromDB("SHOW TABLES", true);
        $prefix = "zz_savepoint_";
        $other_prefix = "zz_replay";
        self::setGameStateValue("undo_moves_player", self::getActivePlayerId());

        // Check that undo tables exists
        $bUndoConfigured = false;
        foreach ($tables as $table) {
            if (substr($table, 0, strlen($prefix)) == $prefix) {
                $bUndoConfigured = true;
            }
        }

        if (!$bUndoConfigured) {
            // Undo has not been configured
            // (may be because we added undo AFTER the game has been released)
            // => ignore the doUndoSave saving
            return;
        }

        foreach ($tables as $table) {
            if (substr($table, 0, strlen($prefix)) == $prefix) {
                // Save point => do not copy
            } elseif (substr($table, 0, strlen($other_prefix)) == $other_prefix) {
            } elseif ($table == "replaysavepoint" || $table == "bga_user_preferences") {
            } else {
                // This table must be saved into its copy
                $copy = $prefix . $table;
                self::DbQuery("DELETE FROM $copy");
                $fields = self::getFieldsListOfTable($table);
                $fields = str_replace(",`cancel`", "", $fields);
                try {
                    self::DbQuery("INSERT INTO $copy ($fields) SELECT $fields FROM $table");
                } catch (Exception $ex) {
                    $fields = self::getFieldsListOfTable($copy);
                    self::DbQuery("INSERT INTO $copy ($fields) SELECT $fields FROM $table");
                }
            }
        }
    }

    function getNextMoveId() {
        //getGameStateValue does not work when dealing with undo, have to read directly from db
        $next_move_index = 3;
        $subsql = "SELECT global_value FROM global WHERE global_id='$next_move_index' ";
        $dbres = $this->DbQuery($subsql);
        $row = mysql_fetch_assoc($dbres);
        $move_id = (int) array_get($row, "global_value", 0);
        return $move_id;
    }

    function statelog(string $log = "trace") {
        $state = $this->gamestate->state();
        $name = $state["name"];
        $type = $state["type"];
        $player = $this->getActivePlayerName();
        $move = $this->getGameStateValue("playerturn_nbr");
        $this->debug("$log move $move in $type state $name (act: $player)");
    }

    function getPhpConstants($prefix = null) {
        $res = [];
        $cc = get_defined_constants(true)["user"];
        foreach ($cc as $key => $value) {
            if (!$prefix || startsWith($key, $prefix)) {
                $res[$key] = $value;
            }
        }
        return $res;
    }
}

// GLOBAL utility functions
function startsWith($haystack, $needle) {
    // search backwards starting from haystack length characters from the end
    return $needle === "" || strrpos($haystack, $needle, -strlen($haystack)) !== false;
}

function endsWith($haystack, $needle) {
    if ($haystack === null) {
        return false;
    }
    $length = strlen($needle);
    return $length === 0 || substr($haystack, -$length) === $needle;
}

function getPart($haystack, $i, $bNoexeption = false) {
    $parts = explode("_", $haystack);
    $len = count($parts);
    if ($bNoexeption && $i >= $len) {
        return "";
    }
    if ($i >= $len) {
        throw new feException("Access to $i >= $len for $haystack");
    }
    return $parts[$i];
}

/**
 * Return $i parts of string (part is chunk separated by _
 * I.e.
 * getPartsPrefix("a_b_c",2)=="a_b"
 *
 * If $i is negative - it will means how much remove from tail, i.e
 * getPartsPrefix("a_b_c",-1)=="a_b"
 */
function getPartsPrefix($haystack, $i) {
    $parts = explode("_", $haystack);
    $len = count($parts);
    if ($i < 0) {
        $i = $len + $i;
    }
    if ($i <= 0) {
        return "";
    }
    for (; $i < $len; $i++) {
        unset($parts[$i]);
    }
    return implode("_", $parts);
}

function toJson($data, $options = JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_NUMERIC_CHECK) {
    $json_string = json_encode($data, $options);
    return $json_string;
}

/**
 * Right unsigned shift
 */
function uRShift($a, $b = 1) {
    if ($b == 0) {
        return $a;
    }
    return ($a >> $b) & ~((1 << 8 * PHP_INT_SIZE - 1) >> $b - 1);
}

if (!function_exists("array_key_first")) {
    function array_key_first(array $arr) {
        foreach ($arr as $key => $unused) {
            return $key;
        }
        return null;
    }
}
if (!function_exists("array_get")) {
    /**
     * Get an item from an array using "dot" notation.
     * If item does not exists return default
     *
     * @param array $array
     * @param string $key
     * @param mixed $default
     * @return mixed
     */
    function array_get($array, $key, $default = null) {
        if (is_null($key)) {
            return $array;
        }
        if (is_null($array)) {
            return $default;
        }
        if (!is_array($array)) {
            throw new BgaSystemException("array_get first arg is not array");
        }
        if (array_key_exists($key, $array)) {
            return $array[$key];
        }
        foreach (explode(".", $key) as $segment) {
            if (!is_array($array) || !array_key_exists($segment, $array)) {
                return $default;
            }
            $array = $array[$segment];
        }
        return $array;
    }
}
