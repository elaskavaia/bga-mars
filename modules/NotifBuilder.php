<?php declare(strict_types=1);
class NotifBuilder {
    private $game;
    private $type;
    private $args;
    private $player_id;
    private $preserve;
    private $message;

    function __construct($game) {
        $this->game = $game;
        $this->type = "message";
        $this->args = [];
        $this->player_id = null;
        $this->preserve = [];
        $this->message = "";
    }

    function ofType($p) {
        if ($p) {
            $this->type = $p;
        }
        return $this;
    }

    function withToken($card_id) {
        if (is_array($card_id)) {
            $card_id = $card_id["token_key"];
        }
        $this->withArg("token_id", $card_id);
        $this->withArg("token_name", $card_id);
        $this->withArg("token_div", $card_id);
        return $this;
    }

    function withArgs($args) {
        $this->args = array_merge($this->args, $args);
        return $this;
    }

    function withArg($key, $value) {
        $this->args[$key] = $value;
        return $this;
    }

    function withPreserveArg($key, $value) {
        $this->args[$key] = $value;
        $this->preserve[$key] = 1;
        return $this;
    }

    /**
     * Injects ${player_id} and ${player_name} variables (should not be i18n)
     *
     * @param number $p
     *            - player id
     * @return NotifBuilder
     */
    function withPlayer($p) {
        if (!$p) {
            $p = $this->game->getActivePlayerId();
        }
        $this->player_id = $p;
        return $this;
    }

    /**
     * Injects ${player_id2} and ${player_name2} variables (should not be i18n)
     *
     * @param number $owner
     *            - player id
     * @return NotifBuilder
     */
    function withPlayer2($owner) {
        if ($owner) {
            $this->withArgs(["player_id2" => $owner, "player_name2" => $this->game->getPlayerNameById($owner)]);
        }
        return $this;
    }

    function notifyAll($message = null) {
        $this->send($message);
    }

    function notifyPlayer($message = null) {
        $this->withArg("_private", true);
        $this->send($message);
    }

    function withMessage($message) {
        if ($message !== null) {
            $this->message = $message;
        }
        return $this;
    }

    function send($message = null) {
        $this->withMessage($message);
        if (count($this->preserve) > 0) {
            $p = array_keys($this->preserve);
            if (!isset($this->args["preserve"])) {
                $this->args["preserve"] = $p;
            } else {
                $this->args["preserve"] = array_merge($this->args["preserve"], $p);
            }
        }
        $this->game->notifyWithName($this->type, $this->message, $this->args, $this->player_id);
    }
}
