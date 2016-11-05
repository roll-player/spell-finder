'use strict';

var _inquirer = require('inquirer');

var _inquirer2 = _interopRequireDefault(_inquirer);

var _fuse = require('fuse.js');

var _fuse2 = _interopRequireDefault(_fuse);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _chalk = require('chalk');

var _chalk2 = _interopRequireDefault(_chalk);

var _spells = require('../data/spells.json');

var _spells2 = _interopRequireDefault(_spells);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var debug = (0, _debug2.default)('spellFinder:main');
var mappedSpells = Object.keys(_spells2.default).map(function (name) {
  var spell = _spells2.default[name];
  spell.name = name;
  return spell;
});

var whatSpellQuestion = {
  type: 'string',
  name: 'spellQuery',
  message: 'Name of the Spell?'
};

var asLevelText = function asLevelText(level) {
  switch (level) {
    case 0:
      return 'Cantrip';
    case 1:
      return '1st Level';
    case 2:
      return '2nd Level';
    case 3:
      return '3rd Level';
    default:
      return level + 'th Level';
  }
};

var renderLine = function renderLine(label, value) {
  return console.log(_chalk2.default.white.underline(label + '\r\n\t' + _chalk2.default.white.bold(value)));
};

var savingThrowReplacer = function savingThrowReplacer(match) {
  return _chalk2.default.green.bold(match);
};
var diceReplacer = function diceReplacer(match) {
  return _chalk2.default.yellow.bold(match);
};
var componentCostReplacer = function componentCostReplacer(match) {
  return _chalk2.default.green.bold(match);
};

var renderSpell = function renderSpell(spell) {
  // first thing to do is to make the spell friendly
  var name = spell.name;
  var castingTime = spell.casting_time;
  var components = spell.components;
  components = _chalk2.default.white(components.replace(/\d+ [s|g|c]+p/ig, componentCostReplacer));
  var description = spell.description;
  description = _chalk2.default.white(description.replace(/\w+ saving throw/g, savingThrowReplacer));
  description = _chalk2.default.white(description.replace(/\d+d\d+(\+\d)*/g, diceReplacer));
  var duration = spell.duration;
  var level = asLevelText(spell.level);
  var range = spell.range;
  var school = spell.school;

  renderLine('Name', name);
  renderLine('Level', level);
  renderLine('School', school);
  renderLine('Casting Time', castingTime);
  renderLine('Range', range);
  renderLine('Components', components);
  renderLine('Duration', duration);

  renderLine('Description', description);
};

var asChoice = function asChoice(spell) {
  return spell.name;
};

var generateWhichSpellQuestion = function generateWhichSpellQuestion(spells) {
  return {
    type: 'list',
    choices: spells.map(asChoice),
    name: 'spellName',
    message: 'No exact match, here are closest matches:'
  };
};

var askPickSpell = function askPickSpell(spells) {
  return new Promise(function (resolve, reject) {
    _inquirer2.default.prompt(generateWhichSpellQuestion(spells)).then(function (answers) {
      var foundSpell = spells.reduce(function (found, spell) {
        if (!found && spell.name === answers.spellName) {
          return spell;
        }

        return found;
      }, false);

      if (foundSpell) {
        resolve(foundSpell);
      } else {
        reject('somehow unable to find spell');
      }
    }).catch(function (err) {
      debug('rejecting inquirer', err);
      reject(err);
    });
  });
};

var handleSpellMatches = function handleSpellMatches(query, matches) {
  switch (matches.length) {
    case 0:
      debug('found no spells');
      return Promise.reject('Could not find a spell with the name ' + query);
      break;
    default:
      var spells = matches.map(function (match) {
        var spell = match.item;
        spell.score = match.score;
        return spell;
      });

      if (spells[0].score === 0.0 || spells.length === 1) {
        debug('found one spell');
        return Promise.resolve(spells[0]);
      } else {
        debug('asking');
        return askPickSpell(spells);
      }
      break;
  }
};

var fuseOptions = {
  keys: ['name'],
  include: ['score'],
  threshold: 0.3
};

var fuse = new _fuse2.default(mappedSpells, fuseOptions);

var askSpell = function askSpell() {
  return _inquirer2.default.prompt(whatSpellQuestion).then(function (answer) {
    var query = answer.spellQuery;
    var matches = fuse.search(query);

    return handleSpellMatches(query, matches).then(function (spell) {
      return renderSpell(spell);
    }).catch(function (err) {
      console.log(_chalk2.default.red(_chalk2.default.green(':(') + ' ' + err));
      debug('Handle Spell Matches Error: ', err);
    }).then(function (_) {
      return askSpell();
    });
  }).catch(function (err) {
    return debug('Ask Spell Error: ', err);
  });
};

askSpell();