<?php

declare(strict_types=1);

define("MA_RES_MICROBE", "resMicrobe");
// ops like nmu and nms - pay with titanium/ pay with steal
class Operation_nmM extends AbsOperation {

    public function __construct(string $type, array $opinfo, PGameXBody $game) {
        parent::__construct($type  == "nmM" ? "nm" : $type, $opinfo, $game);
    }

    function getPrimaryArgType() {
        return 'enum';
    }
    protected function getPrompt() {
        return  clienttranslate('${you} must pay ${count} M€ (can use ${res_name}) for ${card_name}');
    }
    protected function getVisargs() {
        $types = $this->getTypes();

        $type = $types[0];
        if ($type == 'm' && count($types) > 1) {
            $type = $types[1];
        }
        $ttoken = $type;
        $ttoken = $this->game->getTrackerId('', $type);

        return [
            "name" => $this->getOpName(),
            'count' => $this->getCount(),
            'res_name' => $this->game->getTokenName($ttoken),
            'card_name' => $this->game->getTokenName($this->getContext()),
            'i18n' => ['res_name', 'card_name']
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
            $typecount = $this->getCountOfResourceType($type);
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
            $propres = $info['payment']['resopti'][$type]; // optimal res
            $overres = $info['payment']['resources'][$type]; // overpay res
            $typecount = $info['payment']['rescount'][$type]; // total res
            if ($er > 1) {
                // default proposal
                $this->addProposal($info,  [ $type => $propres,'m' => $cost - $propres * $er]);
                // overpayment proposal (no money)
                if ($overres > $propres) $this->addProposal($info,  [$type => $overres]);
            }

            $maxres = (int)floor($rem / $er);
            $rempropres = min($maxres, $typecount);
            $rem = $rem - $rempropres * $er;
            $prop[$type] = $rempropres;
            if ($rem <= 0) {
                  // multi-resource proposal
                $this->addProposal($info, $prop);
            }
        }
        $this->addProposal($info, $prop);

        //  proposal with minimal resource
        $mcount = $info['payment']['rescount']['m'];
        $heatcount = array_get($info['payment']['rescount'], 'h', 0);
        $mhcount = min ($mcount + $heatcount,$cost);
        if ($mhcount > 0) {
            $type = array_shift($alltypes);
            $er = $info['payment']['rate'][$type];
            $propres = min((int)ceil(($cost - $mhcount) / $er), $info['payment']['rescount'][$type]);
            $propm = min($mcount, $cost - $propres * $er);
            $map = ['m' => $propm, $type => $propres];
            if ($heatcount > 0 && $mhcount - $propm > 0) {
                $map['h'] = $mhcount - $propm;
            }
            if ($this->addProposal($info, $map)) return $info;
        }


        return $info;
    }

    function getCountOfResourceType($type) {
        if ($type == MA_RES_MICROBE) {
            //P39|Psychrophiles
            if ($this->game->playerHasCard($this->color, 'card_main_P39')) {
                $resources = $this->game->tokens->getTokensOfTypeInLocation("resource", 'card_main_P39');
                $num = count($resources);
                return $num;
            }
            return 0;
        } else {
            $typecount = $this->game->getTrackerValue($this->color, $type);
        }
        return $typecount;
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
        $info = $this->getStateArg('info');
        if ($info['payment']['rescount']['m'] == 0) return false; // no money, force choice
        $alltypes = $this->getTypes();
        $uniqueRes = 0;
        foreach ($alltypes as $type) {
            $typecount = $info['payment']['rescount'][$type];
            if ($typecount) $uniqueRes++;
        }
        if (count($possible) == 2 && $uniqueRes == 1) return true; // custom + a singe choice, means other resources are at 0
        return false;
    }

    function canFail() {
        return true;
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
                $this->payWithResource($type, $ut, $info[$value]);
                $rate = $info[$value]['rate'][$type];
                $realinc += $rate * $ut;
            }
            return min($inc, $realinc);
        }

        foreach ($this->getTypes() as $type) {
            $this->payWithResource($type, 'full', $info[$value]);
        }
        return $inc;
    }

    private function payWithResource($type, $ut, $infores) {
        if (isset($infores['resources'][$type])) {
            $tt = $infores['resources'][$type];
            if ($ut === 'full') $ut = $tt;
            if ($ut <= 0 || !((int)$ut)) return 0;

            if ($ut > 0 && $ut <= $tt) {
                if ($type == MA_RES_MICROBE) {
                    $this->game->executeImmediately($this->color, "nres", $ut, 'card_main_P39');
                } else {
                    $this->game->effect_incCount($this->color, $type, -$ut);
                }
            } else {
                $message = sprintf(self::_("Invalid amount of %s used for payment: %d of %d (max)"), $this->game->getTokenName($type), $ut, $tt);
                throw new BgaUserException($message);
            }
            return $ut;
        } else {
            if ($ut <= 0 || !((int)$ut)) return 0;
            $this->game->systemAssertTrue("Invalid payment type $type"); // XSS
        }
    }

    private function getTypes() {
        $card_id = $this->getContext();
        $effect = $this->getContext(1);
        if ($effect === 'a' || !$card_id) {
            $types = substr($this->mnemonic, 2);
            $others = $this->getPaymentTypes($this->getOwner(), '');
            if (!$types) return $others;
            return array_merge(str_split($types), $others);
        }
        return $this->getPaymentTypes($this->getOwner(), $card_id);
    }

    function getPaymentTypes(string $color, string $card_id) {
        $tags = $this->game->getRulesFor($card_id, "tags", '');
        $types = [];
        if (strstr($tags, "Building"))
            $types[] = 's';
        if (strstr($tags, "Space"))
            $types[] = 'u';
        if ($this->game->playerHasCard($color, 'card_main_P39')) {
            //P39|Psychrophiles
            if (strstr($tags, "Plant"))
                $types[] = MA_RES_MICROBE; // resources
        }

        $types[] = 'm';
        // heat is last choice
        if ($this->game->playerHasCard($color, 'card_corp_4')) {
            // Helion
            $types[] = 'h';
        }
        return $types;
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
        if ($type == MA_RES_MICROBE) return 2; // for now only microbes
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
