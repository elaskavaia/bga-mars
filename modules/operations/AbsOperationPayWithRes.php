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

        $info['payment'] = [
            'q' => 0,
            'count' => $count,
            'original' => $this->game->getRulesFor($this->getContext(), 'cost', 0),
            'resources' => [],
            'rate' => []
        ];
        foreach ($this->getTypes() as $type) {
            $typecount = $this->game->getTrackerValue($this->color, $type);
            $er = $this->getExchangeRate($type);
            $maxres = (int)floor($count / $er);
            $maxres = min($maxres, $typecount);
            $info['payment']['resources'][$type] = $maxres;
            $info['payment']['rate'][$type] = $er;
        }
        $info['payment']['resources']['m'] = min($count, $mcount);
        $info['payment']['rate']['m'] = 1;

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

    function effect(string $owner, int $inc): int {
        $value = $this->getCheckedArg('target');

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
        $mc = $info[$value]['resources']['m'];
        if ($mc > 0) $this->game->effect_incCount($owner, 'm', -$mc);
        foreach ($this->getTypes() as $type) {
            if (isset($info[$value]['resources'][$type])) {
                $tt = $info[$value]['resources'][$type];
                if ($tt > 0) $this->game->effect_incCount($owner, $type, -$tt);
            }
        }
        return $inc;
    }

    private function getTypes() {
        $types =  substr($this->mnemonic, 2);
        return str_split($types);
    }

    private function getExchangeRate($type): int {
        if ($type == 'm') return 1;
        $er = $this->game->getTrackerValue($this->color, "er$type");
        return $er;
    }

    public function isVoid(): bool {
        $count = $this->getCount();
        $mcount = $this->game->getTrackerValue($this->color, 'm');
        $value = $mcount;
        foreach ($this->getTypes() as $type) {
            $typecount = $this->game->getTrackerValue($this->color, $type);
            $er = $this->getExchangeRate($type);
            $value += $typecount * $er;
        }

        if ($value >= $count) return false;
        return true;
    }
}
