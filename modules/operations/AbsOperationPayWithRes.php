<?php

declare(strict_types=1);
// ops like nmu and nms - pay with titanium/ pay with steal
class AbsOperationPayWithRes extends AbsOperation {

    protected function getPrimaryArgType() {
        return 'enum';
    }
    protected function getPrompt() {
        return  clienttranslate('${you} must pay ${count} MC (can use ${res_name}) for ${card_name}');
    }
    protected function getVisargs() {
        $type = $this->getTypes()[0];
        $ttoken = $this->game->getTrackerId('', $type);
        return [
            "name" => $this->getOpName(),
            'count' => $this->getCount(),
            'res_name' => $this->game->getTokenName($ttoken),
            'card_name' => $this->game->getTokenName($this->getContext())
        ];
    }


    protected function argPrimaryDetails() {
        if ($this->isVoid()) return [];
        $info = [];
        $count = $this->getCount();
        $mcount = $this->game->getTrackerValue($this->color, 'm');
        foreach ($this->getTypes() as $type) {
            $typecount = $this->game->getTrackerValue($this->color, $type);
            $er = $this->getExchangeRate($type);
            $maxres = (int)floor($count / $er);
            $maxres = min($maxres, $typecount);
            $this->addProposal($info, $type, $mcount, $typecount, $er, $count - $maxres * $er,  $maxres);
            // $this->addProposal($info, $type, $mcount, $typecount, $er, 0, 1);
            // $this->addProposal($info, $type, $mcount, $typecount, $er, 0, ($maxres - 1));
            // $this->addProposal($info, $type, $mcount, $typecount, $er, 0, $maxres);
        }

        $this->addProposal($info, $type, $mcount, $typecount, $er, $count, 0);
        $cost = $this->getCost();



        $info['payment'] = [
            'q' => 0,
            'count' => $count,
            'original' => $cost,
            'resources' => [],
            'rate' => []
        ];
        foreach ($this->getTypes() as $type) {
            $typecount = $this->game->getTrackerValue($this->color, $type);
            $er = $this->getExchangeRate($type);
            $maxres = (int)floor($count / $er);
            $propres = min($maxres, $typecount);
            if ($propres < $typecount && $er * $propres < $count) {
                $propres += 1;
            }
            $info['payment']['resources'][$type] = $propres;
            $info['payment']['rate'][$type] = $er;
            $info['payment']['sign'][$type] =  ($propres * $er) <=> $this->getCount();
        }


        return $info;
    }

    private function addProposal(array &$info, $type,  int $mc_count, int $type_count, int $er, int $mc_try, int $type_try) {
        if ($mc_try < 0) return;
        if ($type_try < 0) return;
        if ($type_try == 0 && $mc_try == 0) return;
        $q = 0;
        if ($mc_try > $mc_count || $type_try > $type_count) {
            $q = MA_ERR_COST;
        }

        $proposal = '';
        if ($mc_try) $proposal .= "${mc_try}m";
        if ($type_try) $proposal .= "${type_try}${type}";
        if (array_get($info, $proposal)) return;
        $tryc = $mc_try + $type_try * $er;
        $info["$proposal"] = [
            'q' => $q,
            'count' => min($tryc, $this->getCount()),
            'resources' => [
                'm' => $mc_try,
                $type => $type_try
            ],
            'sign' => $tryc <=> $this->getCount()
        ];
    }

    function canResolveAutomatically() {
        $possible = $this->getStateArg('target');
        if (count($possible) <= 2) return true;
        return false;
    }

    function effect(string $owner, int $inc): int {
        $possible = $this->getStateArg('target');
        if (count($possible) <= 2) {
            $value = array_shift($possible);
        } else {
            $value = $this->getCheckedArg('target');
        }

        $info = $this->getStateArg('info');
        $inc = $info[$value]['count'];
        if ($value == 'payment') {
            $uservalue = $this->getUncheckedArg('payment');
            if (!$uservalue) throw new BgaUserException("Expecting payment parameter");
            if (!is_array($uservalue)) throw new BgaUserException("Expecting payment parameter to be array $uservalue");
            // array of restype=>count
            $inc = 0;
            foreach ($uservalue as $type => $ut) {
                if (isset($info[$value]['resources'][$type])) {
                    $tt = $info[$value]['resources'][$type];

                    if ($ut > 0 && $ut <= $tt) $this->game->effect_incCount($owner, $type, -$ut);
                    else throw new BgaUserException("Invalid payment of $ut? $type"); // FIX XSS
                    $rate = $info[$value]['rate'][$type];
                    $inc += $rate * $ut;
                    //$this->game->warn("User pay $type: $ut of $tt * $rate => $inc");
                } else {

                    throw new BgaUserException("Invalid payment of type $type"); // FIX XSS
                }
            }
            return $inc;
        }

        foreach ($this->getTypes() as $type) {
            if (isset($info[$value]['resources'][$type])) {
                $tt = $info[$value]['resources'][$type];
                if ($tt > 0) $this->game->effect_incCount($owner, $type, -$tt);
            }
        }
        return $inc;
    }

    private function getTypes() {
        $card_id = $this->getContext();
        $effect = $this->getContext(1);
        if ($effect === 'a' || !$card_id) {
            $types = substr($this->mnemonic, 2);
            $others = $this->game->getPaymentTypes($this->getOwner(), '');
            if (!$types) return $others;
            return array_merge(str_split($types), $others);
        }
        return $this->game->getPaymentTypes($this->getOwner(), $card_id);
    }

    private function getCost() {
        $card_id = $this->getContext();
        $effect = $this->getContext(1);
        if ($effect === 'a' || !$card_id) {
            $cost = $this->getCount(); // XXX
        } else {
            $cost = $this->game->getRulesFor($card_id, 'cost', 0);
        }
        return $cost;
    }

    private function getExchangeRate($type): int {
        if ($type == 'm') return 1;
        if ($type == 'h') return 1;
        if ($type == 's' || $type == 'u') {
            $er = $this->game->getTrackerValue($this->color, "er$type");
            return $er;
        }
        throw new BgaSystemException("Invalid resource type $type");
    }

    public function isVoid(): bool {
        $count = $this->getCount();
        $value = 0;
        foreach ($this->getTypes() as $type) {
            $typecount = $this->game->getTrackerValue($this->color, $type);
            $er = $this->getExchangeRate($type);
            $value += $typecount * $er;
        }

        if ($value >= $count) return false;
        return true;
    }
}
