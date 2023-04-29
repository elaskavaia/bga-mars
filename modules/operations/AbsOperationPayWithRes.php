<?php

declare(strict_types=1);
// ops like nmu and nms - pay with titanium/ pay with steal
class AbsOperationPayWithRes extends AbsOperation {

    protected function getPrimaryArgType() {
        return 'enum';
    }


    protected function argPrimaryDetails() {
        $count = $this->getCount();
        $type = $this->getType();
        $typecount = $this->game->getTrackerValue($this->color, $type);
        $mcount = $this->game->getTrackerValue($this->color, 'm');
        $er = $this->getExchangeRate();
        if ($typecount * $er + $mcount < $count) return [];
        $info = [];
        $maxres = (int)floor($count / $er);
        $maxres = min($maxres, $typecount);
        $this->addProposal($info, $mcount, $typecount, $er, $count - $maxres * $er,  $maxres);
        $this->addProposal($info, $mcount, $typecount, $er, $count, 0);
        $this->addProposal($info, $mcount, $typecount, $er, $count - ($maxres - 1) * $er, ($maxres - 1));
        $this->addProposal($info, $mcount, $typecount, $er, 0, $maxres);
        $this->addProposal($info, $mcount, $typecount, $er, 0, 1);
        return $info;
    }

    private function addProposal(array &$info,   int $mc_count, int $type_count, int $er, int $mc_try, int $type_try) {
        if ($mc_try < 0) return;
        if ($type_try < 0) return;
        if ($type_try == 0 && $mc_try == 0) return;
        $q = 0;
        if ($mc_try > $mc_count || $type_try > $type_count) {
            $q = MA_ERR_COST;
        }
        $type = $this->getType();
        $proposal = "${mc_try}m${type_try}${type}";
        if (array_get($info, $proposal)) return;
        $info["$proposal"] = [
            'q' => $q,
            'count' => $mc_try + $type_try * $er,
            'm' => $mc_try,
            $type => $type_try
        ];
    }

    function effect(string $owner, int $inc): int {
        $value = $this->getCheckedArg('target');
        $info = $this->getStateArg('info');
        $inc = $info[$value]['count'];
        $type = $this->getType();
        $mc = $info[$value]['m'];
        $tt = $info[$value][$type];
        $this->game->effect_incCount($owner, $type, -$tt);
        $this->game->effect_incCount($owner, 'm', -$mc);
        return $inc;
    }

    private function getType() {
        return  substr($this->mnemonic, 2, 1);
    }

    private function getExchangeRate(): int {
        $type = $this->getType();
        $er = $this->game->getTrackerValue($this->color, "er$type");
        if ($er == 0) {
            if ($type == 's')
                $er = 2;
            else $er = 3;
        }
        return $er;
    }

    public function isVoid(): bool {
        $count = $this->getCount();
        $type = $this->getType();
        $typecount = $this->game->getTrackerValue($this->color, $type);
        $mcount = $this->game->getTrackerValue($this->color, 'm');
        $er = $this->getExchangeRate();
        if ($typecount * $er + $mcount >= $count) return false;
        return true;
    }
}
