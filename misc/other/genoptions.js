const fs = require("node:fs");

function main(argv) {
  try {
    let toRemove = [];
    if (argv.length > 0) {
      for (let i=0;i<argv.length;i++) {
        const opt = argv[i];
        if (opt=='-remove') {
          const arg = argv[++i];
          toRemove.push(arg);
        }
      }
    }
    const gameOpitionsStr = fs.readFileSync("misc/other/gameoptions.json", "utf8");
    const gameBodyStr = fs.readFileSync("modules/PGameXBody.php", "utf8");
    const materialStr = fs.readFileSync("./material.inc.php", "utf8");
    const options = JSON.parse(gameOpitionsStr);
    for (const optNum in options) {
      const optionInfo = options[optNum];
      const varName = `var_${optionInfo.$varname}`;
      const pattern = `"${varName}" => ${optNum}`;
      if (gameBodyStr.indexOf(pattern) < 0) {
        console.error(`${pattern},`);
      }
      const defined = `define("MA_OPT_${optionInfo.$varname.toUpperCase()}", ${optNum});`;
      if (materialStr.indexOf(defined) < 0) {
        console.log(defined);
      }

      for (const value in optionInfo.values) {
        const valuename = optionInfo.values[value].name.replace(" ", "_").toUpperCase();
        const v = `define("MA_OPTVALUE_${optionInfo.$varname.toUpperCase()}_${valuename}", ${value});`;
        if (materialStr.indexOf(v) < 0) {
          console.log(v);
        }
      }
    }
    for (let opt of toRemove) {
      delete options[opt];
    }
    fs.writeFileSync("gameoptions.json", JSON.stringify(options, undefined, 4));
  } catch (err) {
    console.error(err);
  }
}

const argv = [...process.argv]
argv.splice(0, 2);
main(argv);
