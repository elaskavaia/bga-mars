# bga.terraformingmars
Bga project for tm game
Only usable when you develop games for https://boardgamearena.com

Warning: Not for begginers!

It uses typescript and  scss

To use you need tsc (typescript), which will be installed by npm, which is part of nodejs
* Install nodejs (search web on how to install for your platform), i.e. sudo apt-get install nodejs
* Type "npm i" in the project directory - it will install tsc and scss compilers

To have auto-upload in vscode:
* Install SFTP and configure, see https://en.doc.boardgamearena.com/Setting_up_BGA_Development_environment_using_VSCode

Run the following command to auto-compile typescript (auto-upload will be enabled if you configure SFTP extension)
* npm run watch:ts

If you want both typescript and scc type
* npm run watch

To run tests you need to install phpunit-9
* If using vscode you need to install phpunit using composer somehwere in home directory (not in project dir!)
* Add this directory into include path for php (for vscode symbol resolution)
* Then can run tasks from this project that runs the tests (phpunit must be in your path)
  * If you not using vscode run: npm run test

Structures of project:
* src - source of typescript and css
* src/css - scss files 
* src/types - type definition for IDE
* src/*.ts - type script files for the game
* src/Zain.ts - its the only dojo file, include everythings. Zain its like Main but starts with Z because I want it to be last
* src/GameBasics.ts - boilerplate code for basics
* src/GameTokens.ts - boilerplate code for working DbTokens table and related notifications
* src/GameXBody.ts - main unique game code
* modules/* -  classes and modules of PHP server side
* modules/tests/* - test for phpunit
* misc/*.csv - csv files for material, need to run php script on it to inject in material file

The following files are GENERATED
terraformingmars.js - main game file generated from typescript from src dir
terraformingmars.css - generated from scss files
material.inc.php - content generated from csv files in misc directory (some sections, others manually written)

For the game design see DESIGN.md