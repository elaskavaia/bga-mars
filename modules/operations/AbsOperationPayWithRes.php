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
        $types = $this->getTypes();

        $type = $types[0];
        if ($type == 'm' && count($types) > 1) {
            $type = $types[1];
        }
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
        $cost = $this->getCount();

        $info['payment'] = [
            'q' => 0,
            'count' => $cost,
            'original' =>  $this->getCost(),
            'resources' => [],
            'rescount' => [],
            'rate' => [],
            'sign' => []
        ];
        $alltypes = $this->getTypes();
        foreach ($alltypes as $type) {
            $typecount = $this->game->getTrackerValue($this->color, $type);
            $er = $this->getExchangeRate($type);
            $maxres = (int)floor($cost / $er);
            $propres = min($maxres, $typecount);
            $overres = $propres;
            if ($propres < $typecount && $er * $propres < $cost) {
                $overres += 1;
            }
            $info['payment']['rescount'][$type] = $typecount;
            $info['payment']['resources'][$type] = $overres;
            $info['payment']['resopti'][$type] = $propres;
            $info['payment']['rate'][$type] = $er;
            $info['payment']['sign'][$type] =  ($overres * $er) <=> $cost;
        }

        $rem = $cost;
        $prop = [];
        foreach ($alltypes as $type) {

            $er = $info['payment']['rate'][$type];


            $propres =    $info['payment']['resopti'][$type]; // optimal res
            $overres =    $info['payment']['resources'][$type]; // overpay res

            if ($er > 1) {
                if ($this->addProposal($info,  ['m' => $cost - $propres * $er, $type => $propres])) break;
                if ($overres > $propres) $this->addProposal($info,  [$type => $overres]);
            }

            $maxres = (int)floor($rem / $er);
            $rempropres = min($maxres,  $info['payment']['rescount'][$type]);
            $rem = $rem - $rempropres * $er;
            $prop[$type] = $rempropres;
            if ($rem <= 0) {
                if ($this->addProposal($info, $prop)) break;
            }
        }
        $this->addProposal($info, $prop);

        //  proposal with minimal resource
        $mcount = $info['payment']['rescount']['m'];
        $heatcount = array_get($info['payment']['rescount'], 'h', 0);
        $mhcount = $mcount + $heatcount;
        if ($mhcount > 0) {
            $type = array_shift($alltypes);
            $er = $info['payment']['rate'][$type];
            $propres = min((int)ceil(($cost - $mhcount) / $er), $info['payment']['rescount'][$type]);
            $propm = min($mcount, $cost - $propres * $er);
            $map = ['m' => $propm, $type => $propres];
            if ($heatcount > 0) {
                $map['h'] = $mhcount - $propm;
            }
            if ($this->addProposal($info, $map)) return $info;
        }


        return $info;
    }

    private function addProposal(array &$info, array $map): bool {
        $total = 0;
        $proposal = '';
        foreach ($map as $type => $type_try) {
            if ($type_try < 0) return false;
            if ($type_try == 0) continue;
            $type_count = $info['payment']['rescount'][$type];
            if ($type_try > $type_count) return false;
            $er = $info['payment']['rate'][$type];
            $total += $type_try * $er;
            $proposal .= "${type_try}${type}";
        }
        // already there
        if (array_get($info, $proposal)) return false;
        if (!$proposal) return false;

        $q = 0;
        $count =  $this->getCount();
        $info["$proposal"] = [
            'q' => $q,
            'count' => min($total, $count),
            'resources' => $map,
            'sign' => $total <=> $count
        ];
        return true;
    }

    function canResolveAutomatically() {
        $possible = $this->getStateArg('target');
        if (count($possible) == 1) return false; // this is only Custom option
        if (count($possible) == 2) return true; // custom + a singe choice, means other resources are at 0
        return false;
    }

    function effect(string $owner, int $inc): int {
        if ($inc <= 0 || $this->getCost() <= 0) return $inc;
        $value = $this->getUncheckedArg('target');
        $possible = $this->getStateArg('target');
        if (!$value) {
            $value = array_shift($possible);
            if ($value == 'payment') {
                $value = array_shift($possible);
            }
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
            $realinc = 0;
            foreach ($uservalue as $type => $ut) {
                if (isset($info[$value]['resources'][$type])) {
                    $tt = $info[$value]['resources'][$type];
                    if ($ut <= 0 || !((int)$ut)) continue;

                    if ($ut > 0 && $ut <= $tt) $this->game->effect_incCount($owner, $type, -$ut);

                    else {
                        $message = sprintf(self::_("Invalid amount of %s used for payment: %d of %d (max)"), $this->game->getTokenName($type), $ut, $tt);
                        throw new BgaUserException($message);
                    }
                    $rate = $info[$value]['rate'][$type];
                    $realinc += $rate * $ut;
                    $this->game->warn("User pay $type: $ut of $tt * $rate => $realinc/$inc");
                } else {

                    throw new BgaUserException("Invalid payment of type $type"); // FIX XSS
                }
            }
            return min($inc, $realinc);
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
