<?php

/**
 * This class contants functions that work with tokens SQL model and tokens class
 *
 <code>
 require_once (APP_GAMEMODULE_PATH . 'module/table/table.game.php');

 require_once ('modules/PGameTokens.php');

 class EpicKingdom extends PGameTokens {
 }
 </code>
 *
 */
require_once "PGameBasic.php";
require_once "DbTokens.php";


abstract class PGameTokens extends PGameBasic {
    public $tokens;
    public $token_types;
    private $token_types_adjusted;

    public function __construct() {
        parent::__construct();
        $this->tokens = new DbTokens();
    }

    protected function setCounter(&$array, $key, $value) {
        $array[$key] = ["counter_value" => $value, "counter_name" => $key];
    }

    protected function counterNameOf($location) {
        return "counter_$location";
    }

    protected function fillCounters(&$array, $locs, $create = true) {
        foreach ($locs as $location => $count) {
            $key = $this->counterNameOf($location);
            if ($create || array_key_exists($key, $array)) {
                $this->setCounter($array, $key, $count);
            }
        }
    }

    protected function fillTokensFromArray(&$array, $cards) {
        foreach ($cards as $pos => $card) {
            $id = $card["key"];
            $array[$id] = $card;
        }
    }

    public function getTokenName($token_id) {
        if (is_array($token_id)) {
            return $token_id;
        }
        if ($token_id == null) {
            return "null";
        }
        return $this->getRulesFor($token_id, "name", $token_id);
    }

    protected function getAllDatas() {
        $result = [];
        $current_player_id = self::getCurrentPlayerId(); // !! We must only return informations visible by this player !!
        // Get information about players
        // Note: you can retrieve some extra field you added for "player" table in "dbmodel.sql" if you need it.
        $sql = "SELECT player_id id, player_score score, player_no no FROM player ";
        $result["players"] = self::getCollectionFromDb($sql);
        $result["token_types"] = $this->token_types;
        $result["tokens"] = [];
        $result["counters"] = $this->getDefaultCounters();
        $locs = $this->tokens->countTokensInLocations();
        //$color = $this->getPlayerColor($current_player_id);
        foreach ($locs as $location => $count) {
            $sort = $this->getRulesFor($location, "sort", null);
            if ($this->isCounterAllowedForLocation($current_player_id, $location)) {
                $this->fillCounters($result["counters"], [$location => $count]);
            }
            $content = $this->isContentAllowedForLocation($current_player_id, $location);

            if ($content === false) continue;
            if ($content === true) {
                $tokens = $this->tokens->getTokensInLocation($location, null, $sort);
                $this->fillTokensFromArray($result["tokens"], $tokens);
            } else {
                $num = floor($content);
                if ($count < $num) {
                    $num = $count;
                }
                $tokens = $this->tokens->getTokensOnTop($num, $location);
                $this->fillTokensFromArray($result["tokens"], $tokens);
            }
        }
        $table_options = $this->getTableOptions();
        $result["table_options"] = [];
        foreach ($table_options as $option_id => $option) {
            $value = 0;
            if (array_key_exists($option_id, $this->gamestate->table_globals)) {
                $value = (int) $this->gamestate->table_globals[$option_id];
            }
            $result["table_options"][$option_id] = $option;
            $result["table_options"][$option_id]["value"] = $value;
        }
        return $result;
    }

    protected function getDefaultCounters() {
        $types = $this->token_types;
        $res = [];
        $players_basic = $this->loadPlayersBasicInfos();
        foreach ($types as $key => $info) {
            if (!$this->isConsideredLocation($key)) continue;
            $scope = array_get($info, "scope");
            $counter = array_get($info, "counter");
            if ($scope && $counter != "hidden") {
                if ($scope == "player") {
                    // per player location
                    foreach ($players_basic as $player_info) {
                        $color = $player_info["player_color"];
                        $this->setCounter($res, $this->counterNameOf("{$key}_{$color}"), 0);
                    }
                } else {
                    $this->setCounter($res, $this->counterNameOf("{$key}"), 0);
                }
            }
        }
        return $res;
    }

    function createCounterInfoForLocation($location) {
        $counter = $this->counterNameOf($location);
        $location_name = $this->getRulesFor($location,'name');
        return [
            "counter_name" => $counter,
            "location" => $location,
            "name" => [
                "log" => clienttranslate('${location_name} Counter'),
                "args" => ["location_name" => $location_name, 'i18n' => ['location_name']],
            ],
        ];
    }

    // Material utilities
    function adjustedMaterial() {
        if ($this->token_types_adjusted) {
            return $this->token_types;
        }
        $this->token_types_adjusted = true;
        $players_basic = $this->loadPlayersBasicInfos();
        foreach ($this->token_types as $key => $info) {
            if (!$this->isConsideredLocation($key)) continue;
            $scope = array_get($info, "scope");
            if ($scope) {
                if ($scope == "player") {
                    // per player location
                    foreach ($players_basic as $player_id => $player_info) {
                        $color = $player_info["player_color"];
                        $info = $this->createCounterInfoForLocation("{$key}_{$color}");
                        if (!isset($this->token_types[$info["counter_name"]])) {
                            $this->token_types[$info["counter_name"]] = $info;
                        }
                    }
                } else {
                    $info = $this->createCounterInfoForLocation("{$key}");
                    if (!isset($this->token_types[$info["counter_name"]])) {
                        $this->token_types[$info["counter_name"]] = $info;
                    }
                }
            }
        }
        return $this->token_types;
    }

    function debug_initTables() {
        $this->DbQuery("DELETE FROM token");
        $this->initTables();
        $newGameDatas = $this->getAllTableDatas(); // this is framework function
        $this->notifyPlayer($this->getActivePlayerId(), "resetInterfaceWithAllDatas", "", $newGameDatas); // this is notification to reset all data
        $this->notifyAllPlayers("message", "setup called", []);
    }

    /**
     * This is called before every action, unlike constructor this method has initialized state of the table so it can
     * access db
     *
     *       @Override
     */
    protected function initTable() {
        // this fiddles with material file depending on the extension selected
        $this->adjustedMaterial();
    }

    function getAllRules($token_id, $default = []) {
        return $this->getRulesFor($token_id, "*", $default);
    }

    function getRulesFor($token_id, $field = "r", $default = "") {
        $tt = $this->token_types;
        $key = $token_id;
        while ($key) {
            $data = array_get($tt, $key, null);
            if ($data) {
                if ($field === "*") {
                    $data['_key'] = $key;
                    return $data;
                }
                return array_get($data, $field, $default);
            }
            $new_key = getPartsPrefix($key, -1);
            if ($new_key == $key) {
                break;
            }
            $key = $new_key;
        }
        //$this->systemAssertTrue("bad token $token_id for rule $field", false);
        return $default;
    }

    /**
     * Create tokens based on fields found in $this->token_types
     * Only tokens with 'create' field set will be considered
     * 'create' field can be one the following values:
     * 1 - the token with id $id will be created, count must be set to 1 if used
     * 4 - the token with id "${id}_{COLOR}" for each player will be created, count must be 1
     * 2 - the token with id "${id}_{INDEX}" will be created, using count
     * 3 - the token with id "${id}_{COLOR}_{INDEX}" will be created, using count, per player
     * 'location' - if set token will be created on this location, if not set in 'limbo'
     * 'state' - if set token will be create with this state, otherwise it is 0
     */
    protected function createTokens() {
        foreach ($this->token_types as $id => $info) {
            $this->createTokenFromInfo($id, $info);
        }
    }
    protected function createTokenFromInfo($id, $info) {
        $create_type = array_get($info, "create", 0);
        if (!$create_type) {
            return;
        }
        $count = array_get($info, "count", 1);

        if (!$count) {
            return;
        }

        try {
            $token_id = $id;
            if ($create_type === 1 || $create_type === "single") {
                $token_id = $id;
            } elseif ($create_type === 2 || $create_type === "index") {
                $token_id = "{$id}_{INDEX}";
            } elseif ($create_type === 3 || $create_type === "color_index") {
                $token_id = "{$id}_{COLOR}_{INDEX}";
            } elseif ($create_type === 4 || $create_type === "color") {
                $token_id = "{$id}_{COLOR}";
            } elseif ($create_type === 5 || $create_type === "index_color") {
                $token_id = "{$id}_{INDEX}_{COLOR}";
            }
            if (strpos($token_id, "{INDEX}") === false) {
                $count = 1;
            }
            $location = array_get($info, "location", "limbo");
            $state = array_get($info, "state", 0);
            $token_id = preg_replace("/\{COLOR\}/", "{TYPE}", $token_id);
            $location = preg_replace("/\{COLOR\}/", "{TYPE}", $location);
            if (strpos($token_id, "{TYPE}") === false) {
                $this->tokens->createTokensPack($token_id, $location, $count, 1, null, $state);
            } else {
                $this->tokens->createTokensPack($token_id, $location, $count, 1, $this->getPlayerColors(), $state);
            }
        } catch (Exception $e) {
            $this->error("Failed to create tokens in location $token_id $location x $count ");
        }
    }

    protected function isConsideredLocation(string $id) {
        $type = $this->getRulesFor($id, 'type', '');
        return ($type == "location"); // XXX contains?
    }

    protected function isContentAllowedForLocation($player_id, $location, $attr = "content") {
        if ($location === "dev_null") {
            return false;
        }

        if ($this->isConsideredLocation($location)) {
            $info = $this->getAllRules($location, null);
            $scope = array_get($info, "scope");
            $content_type = array_get($info, $attr);

            if ($scope) {
                if ($content_type == "public") {
                    // content allowed for everyboady
                    return true;
                }
                if ($content_type == "private") {
                    // content allow only if location of same color
                    $color = $this->getPlayerColorById($player_id);
                    return endsWith($location, $color);
                }
                return false;
            } else {
                return false; // not listed as location
            }
        }

        if ($attr == 'counter') return false; // not listed - do not need counter
        return true; // otherwise it location ok
    }

    protected function isCounterAllowedForLocation($player_id, $location) {
        return $this->isContentAllowedForLocation($player_id, $location, "counter");
    }

    function dbSetTokenState($token_id, $state = null, $notif = "*", $args = [],  int $player_id = 0) {
        $this->dbSetTokenLocation($token_id, null, $state, $notif, $args, $player_id);
    }

    function dbSetTokenLocation($token_id, $place_id, $state = null, $notif = "*", $args = [], int $player_id = 0) {
        $this->systemAssertTrue("token_id is null/empty $token_id, $place_id $notif", $token_id != null && $token_id != "");
        if ($notif === "*") {
            $notif = clienttranslate('${player_name} moves ${token_name} into ${place_name}');
        }
        if ($state === null) {
            $state = $this->tokens->getTokenState($token_id) ?? 0;
        }
        $place_from = $this->tokens->getTokenLocation($token_id) ?? "limbo";
        $this->systemAssertTrue("token_id does not exists, create first: $token_id", $place_from);
        if ($place_id === null) {
            $place_id = $place_from;
        }
        $this->tokens->moveToken($token_id, $place_id, $state);
        $notifyArgs = [
            "token_id" => $token_id,
            "place_id" => $place_id,
            "token_name" => $token_id,
            "place_name" => $place_id,
            "new_state" => $state,
        ];
        $args = array_merge($notifyArgs, $args);
        //$this->warn("$type $notif ".$args['token_id']." -> ".$args['place_id']."|");
        if ($player_id != 0) {
            // use it
        } elseif (array_key_exists("player_id", $args)) {
            $player_id = $args["player_id"];
        } else {
            $player_id = $this->getMostlyActivePlayerId();
        }
        if (strstr($notif, '${you}')) {
            $notifyArgs["you"] = "You"; // translated on client side, this is for replay after
        }
        if (strstr($notif, '${token_div}')) {
            $notifyArgs["token_div"] = $token_id;
        }
        $this->notifyWithName("tokenMoved", $notif, $args, $player_id);
        if ($this->isCounterAllowedForLocation($player_id, $place_from)) {
            $this->notifyCounterChanged($place_from, ["nod" => true]);
        }
        if ($place_id != $place_from && $this->isCounterAllowedForLocation($player_id, $place_id)) {
            $this->notifyCounterChanged($place_id, ["nod" => true]);
        }
    }

    /**
     * Sends tokenMove notification with multiple objects, parameters of notication (must be handled by tokenMove)
     * list - array of token ids
     * token_divs - comma separate list of tokens (to inject visualisation)
     * token_names - comma separate list of tokens (to inject names)
     * new_state - if same state - new state of all tokens
     * new_states - if multiple states array of integer states
     *
     * @param [] $token_arr
     *            - array of tokens keys or token info
     * @param string $place_id
     *            - location of all tokens will be set to $place_id value
     * @param null|int $state
     *            - if null is passed state won't be changed
     * @param string $notif
     * @param array $args
     */
    function dbSetTokensLocation($token_arr, $place_id, $state = null, $notif = "*", $args = [], $player_id = 0) {
        $type = $this->tokens->checkListOrTokenArray($token_arr);
        if ($type == 0) {
            return;
        }
        $this->systemAssertTrue("place_id cannot be null", $place_id != null);
        if ($notif === "*") {
            $notif = clienttranslate('${player_name} moves ${token_names} into ${place_name}');
        }
        $keys = [];
        $states = [];
        if (isset($args["place_from"])) {
            $place_from = $args["place_from"];
        } else {
            $place_from = null;
        }
        foreach ($token_arr as $token) {
            if (is_array($token)) {
                $token_id = $token["key"];
                $states[] = $token["state"];
                if ($place_from == null) {
                    $place_from = $token["location"];
                }
            } else {
                $token_id = $token;
            }
            $keys[] = $token_id;
        }
        $this->tokens->moveTokens($keys, $place_id, $state);
        $notifyArgs = [
            "list" => $keys, //
            "place_id" => $place_id, //
            "place_name" => $place_id,
        ];
        if ($state !== null) {
            $notifyArgs["new_state"] = $state;
        } elseif (count($states) > 0) {
            $notifyArgs["new_states"] = $states; // this only used for visualization, state won't change in db
        }
        if (strstr($notif, '${you}')) {
            $notifyArgs["you"] = "you"; // translated on client side, this is for replay after
        }
        if (strstr($notif, '${token_divs}')) {
            $notifyArgs["token_divs"] = implode(",", $keys);
        }
        if (strstr($notif, '${token_div}')) {
            $notifyArgs["token_div"] = $keys[0];
        }
        if (strstr($notif, '${token_names}')) {
            $notifyArgs["token_names"] = implode(",", $keys);
        }
        if (strstr($notif, '${token_name}')) {
            $notifyArgs["token_name"] = $keys[0];
        }
        $num = count($keys);
        if (strstr($notif, '${token_div_count}')) {
            $notifyArgs["token_div_count"] = [
                "log" => clienttranslate('${token_div} x ${mod}'),
                "args" => ["token_div" => $token_id, "mod" => $num],
            ];
        }
        $args = array_merge($notifyArgs, $args);
        //$this->warn("$type $notif ".$args['token_id']." -> ".$args['place_id']."|");
        if (!$player_id) {
            if (array_key_exists("player_id", $args)) {
                $player_id = $args["player_id"];
            } else {
                $player_id = $this->getMostlyActivePlayerId();
            }
        }
        $this->notifyWithName("tokenMoved", $notif, $args, $player_id);
        // send counter update if required
        if ($place_from && $this->isCounterAllowedForLocation($player_id, $place_from)) {
            $this->notifyCounterChanged($place_from, ["nod" => true]);
        }
        if ($place_id != $place_from && $this->isCounterAllowedForLocation($player_id, $place_id)) {
            $this->notifyCounterChanged($place_id, ["nod" => true]);
        }
    }

    /**
     * This method will increase/descrease resource counter (as state)
     *
     * @param string $token_id
     *            - token key
     * @param int $num
     *            - increment of the change
     * @param string $place
     *            - optional $place, only used in notification to show where "resource"
     *            is gain or where it "goes" when its paid, used in client for animation
     */
    function dbResourceInc($token_id, $num, $message = "*", $args = [], $player_id = null, $options = []) {
        $current = $this->tokens->getTokenState($token_id);
        $value = $current + $num;

        $min = array_get($options, 'min', 0);
        $check = array_get($options, 'check', true);
        $ifpossible = array_get($options, 'ifpossible', false);

        if ($num < 0) {
            if ($value < $min && $ifpossible) {
                $num = 0;
                $value = $min;
            } else if ($value < $min && $check) {
                $this->userAssertTrue(clienttranslate("Not enough resources to pay")); 
            }
        }
        if (array_get($options, 'onlyCheck')) {
            return;
        }
        $this->tokens->setTokenState($token_id, $value);

        if ($message == "*") {
            if ($num <= 0) {
                $message = clienttranslate('${player_name} pays ${token_div_count}');
            } else {
                $message = clienttranslate('${player_name} gains ${token_div_count}');
            }
        }

        $args = array_merge($args, [
            "mod" => abs($num),
            "inc" => $num,
            "token_div_count" => [
                "log" => '${mod} ${token_name}',
                "args" => [
                    "token_name" => $token_id,
                    "mod" => abs($num)
                ],
            ],
        ]);
        $this->notifyCounterDirect($token_id, $value, $message, $args, $player_id);
    }


    function notifyCounterChanged($location, $notifyArgs = null) {
        $key = $this->counterNameOf($location);
        $value = $this->tokens->countTokensInLocation($location);
        $this->notifyCounterDirect($key, $value, "", $notifyArgs);
    }

    function notifyCounterDirect($key, $value, $message, $notifyArgs = null, $player_id = null) {
        $args = ["counter_name" => $key, "counter_value" => $value];
        if ($notifyArgs != null) {
            $args = array_merge($notifyArgs, $args);
        }
        $this->notifyWithName("counter", $message, $args, $player_id);
    }
}
