<?php

/*
 * This is a generic class to manage game user prefrences (needed if some of them control server behavior).
 *
 *
 *
CREATE TABLE IF NOT EXISTS `user_preferences` (
  `player_id` int(10) NOT NULL,
  `pref_id` int(10) NOT NULL,
  `pref_value` int(10) NOT NULL,
  PRIMARY KEY (`player_id`, `pref_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
 *
 *
 */

class DbUserPrefs extends APP_GameClass {
    var $table;
    public PGameXBody $game; // game ref
    function __construct(PGameXBody $game) {
        $this->table = 'user_preferences';
        $this->game = $game;
    }

    // MUST be called before any other method if db table is not called 'user_preferences'
    function init($table) {
        $this->table = $table;
    }

    public function setup($players, $prefs) {
        // Load user preferences
        //include dirname(__FILE__) . '/../gameoptions.inc.php';
        $game_preferences = $this->game->getTablePreferences();

        $values = [];
        //$players = $this->loadPlayersBasicInfos();
        foreach ($game_preferences as $id => $data) {
            $defaultValue = $data['default'] ?? array_keys($data['values'])[0];

            foreach ($players as $pId => $infos) {
                $values[] = [
                    $pId,
                    $id,
                    $prefs[$pId][$id] ?? $defaultValue,
                ];
            }
        }

        $seqvalues = [];
        foreach ($values as $row) {
            $seqvalues[] = "( '$row[0]', '$row[1]', '$row[2]' )";
        }
        $sql = "INSERT INTO " . $this->table . " (player_id,pref_id,pref_value)";
        $sql .= " VALUES " . implode(",", $seqvalues);
        $this->DbQuery($sql);
    }

    function getSelectQuery() {
        $sql = "SELECT *";
        $sql .= " FROM " . $this->table;
        return $sql;
    }

    function getAllPrefs($player_id) {
        $player_id = (int) $player_id;
        $sql = "SELECT pref_id, pref_value ";
        $sql .= " FROM " . $this->table;
        $sql .= " WHERE player_id='$player_id'";
        return $this->getCollectionFromDB($sql, true);
    }

    function getPrefValue($player_id, $pref_id) {
        $res = $this->getPrefInfo($player_id, $pref_id);
        if ($res == null)
            return null;
        return (int) $res ['pref_value'];
    }

    function setPrefValue($player_id, $pref_id, $pref_value) {
        $pref_id = (int) $pref_id;
        $player_id = (int) $player_id;
        $pref_value = (int) $pref_value;
        $sql = "UPDATE " . $this->table;
        $sql .= " SET pref_value='$pref_value'";
        $sql .= " WHERE player_id='$player_id' AND pref_id='$pref_id'";
        self::DbQuery($sql);
        return $pref_value;
    }

    function getPrefInfo($player_id, $pref_id) {
        $pref_id = (int) $pref_id;
        $player_id = (int) $player_id;
        $sql = $this->getSelectQuery();
        $sql .= " WHERE player_id='$player_id' AND pref_id='$pref_id'";
        $dbres = self::DbQuery($sql);
        return mysql_fetch_assoc($dbres);
    }
}
