<?php

declare(strict_types=1);
require_once "Operation_nmM.php";
class Operation_nR extends Operation_nmM {
    var $storm = null;
    function effect(string $owner, int $inc): int {
        if ($this->getPrimaryArgType() == 'enum') return parent::effect($owner, $inc);
        $this->game->effect_incCount($owner, $this->getType(), -$inc, ['reason_tr' => $this->getReason()]);
        return $inc;
    }

    function getType() {
        return substr($this->mnemonic, 1);
    }

    function getAlternativeResourceType() {
        return '-';
    }

    function getTypes() {
        $type = $this->getType();
        $arr = [$type];
        if ($this->getStormCount()) {
            $arr[] = "resFloater";
        }
        return $arr;
    }

    protected function getExchangeRate($type): int {
        if ($type == $this->getType()) return 1;
        if ($type == "resFloater") return 2; // for now only this
        throw new BgaSystemException("Invalid resource type $type");
    }

    function doPayWithResource($color, $type, $count) {
        if ($type == "resFloater") {
            $this->game->executeImmediately($color, "nres", $count, "card_corp_28");
        } else {
            parent::doPayWithResource($color, $type, $count);
        }
    }

    public function noValidTargets(): bool {
        $value = $this->game->getTrackerValue($this->color, $this->getType());
        $min = $this->getMinCount();
        if ($this->getType() == 'h') $value += $this->getStormCount() * 2;
        $diff = $value - $min;


        if ($diff == -1 && $this->getType() == 'p') {
            $card_id = $this->getContext(0);
            if ($card_id && $this->game->hasTag($card_id, 'Plant')) {
                if ($this->game->playerHasCard($this->color, 'card_main_74')) { // viral enhancers
                    return false; // one plant can be gained via viral enhancers
                }
            }
        }



        return  $diff < 0;
    }

    function hasNoSideEffects(): bool {
        return true;
    }

    function getPrimaryArgType() {
        if ($this->getStormCount() > 0) return 'enum';
        return '';
    }

    function canResolveAutomatically() {
        if ($this->getPrimaryArgType() == 'enum') return parent::canResolveAutomatically();
        if ($this->isOptional() && $this->noValidTargets()) return true;
        if ($this->isOptional()) return false;
        if ($this->getMinCount() != $this->getCount()) return false;
        return true;
    }

    function canFail() {
        return true;
    }

    function getStormCount() {
        if ($this->storm == null) {
            if ($this->getType() == 'h' && $this->game->getOwnCardOnTableau("card_corp_28", $this->color))
                $this->storm = $this->game->getCountOfResOnCard("card_corp_28");
            else $this->storm = 0;
        }
        return $this->storm;
    }

    function getCountOfResourceType($type) {
        if ($type ==  "resFloater") {
            return $this->getStormCount();
        } else {
            return parent::getCountOfResourceType($type);
        }
    }
}
