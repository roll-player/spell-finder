import Inquirer from 'inquirer'
import Fuse from 'fuse.js'
import debugModule from 'debug'
import chalk from 'chalk'
import Spells from '../data/spells.json'

const debug = debugModule('spellFinder:main')
console.log(debug)
const mappedSpells = Object.keys(Spells).map(name => {
  let spell = Spells[name]
  spell.name = name
  return spell
})

const whatSpellQuestion = {
  type: 'string',
  name: 'spellQuery',
  message: 'Name of the Spell?'
}

const asLevelText = level => {
  switch (level) {
    case 0:
      return 'Cantrip'
    case 1:
      return '1st Level'
    case 2:
      return '2nd Level'
    case 3:
      return '3rd Level'
    default:
      return `${level}th Level`
  }
}

const renderLine = (label, value) => console.log(chalk.white.underline(`${label}\r\n\t${chalk.white.bold(value)}`))

const savingThrowReplacer = match => chalk.green.bold(match)
const diceReplacer = match => chalk.yellow.bold(match)
const componentCostReplacer = match => chalk.green.bold(match)

const renderSpell = spell => {
  // first thing to do is to make the spell friendly
  const name = spell.name
  const castingTime = spell.casting_time
  let components = spell.components
  components = chalk.white(components.replace(/\d+ [s|g|c]+p/ig, componentCostReplacer))
  let description = spell.description
  description = chalk.white(description.replace(/\w+ saving throw/g, savingThrowReplacer))
  description = chalk.white(description.replace(/\d+d\d+(\+\d)*/g, diceReplacer))
  const duration = spell.duration
  const level = asLevelText(spell.level)
  const range = spell.range
  const school = spell.school

  renderLine('Name', name) 
  renderLine('Level', level) 
  renderLine('School', school) 
  renderLine('Casting Time', castingTime) 
  renderLine('Range', range) 
  renderLine('Components', components) 
  renderLine('Duration', duration) 

  renderLine('Description', description) 
}

const asChoice = spell => spell.name

const generateWhichSpellQuestion = spells => {
  return {
    type: 'list',
    choices: spells.map(asChoice),
    name: 'spellName',
    message: 'No exact match, here are closest matches:'
  }
}

const askPickSpell = spells => {
  return new Promise((resolve, reject) => {
    Inquirer.prompt(generateWhichSpellQuestion(spells))
      .then(answers => {
        const foundSpell = spells.reduce((found, spell) => {
          if (!found && spell.name === answers.spellName) {
            return spell
          }

          return found
        }, false)

        if (foundSpell) {
          resolve(foundSpell)
        } else {
          reject('somehow unable to find spell')
        }
      })
      .catch(err => { 
        debug('rejecting inquirer', err)
        reject(err) 
      })
  })
}

const handleSpellMatches = (query, matches) => {
  switch (matches.length) {
    case 0:
      debug('found no spells')
      return Promise.reject(`Could not find a spell with the name ${query}`)
      break
    default:
      const spells = matches.map(match => { 
        let spell = match.item
        spell.score = match.score
        return spell
      })

      if (spells[0].score === 0.0 || spells.length === 1) {
        debug('found one spell')
        return Promise.resolve(spells[0])
      } else {
        debug('asking')
        return askPickSpell(spells)
      }
      break
  }
}

const fuseOptions = {
  keys: ['name'],
  include: ['score'],
  threshold: 0.3
}

const fuse = new Fuse(mappedSpells, fuseOptions)

const askSpell = () => Inquirer.prompt(whatSpellQuestion)
  .then(answer => {
    const query = answer.spellQuery
    const matches = fuse.search(query)

    return handleSpellMatches(query, matches)
      .then(spell => renderSpell(spell))
      .catch(err =>  {
        console.log(chalk.red(`${chalk.green(':(')} ${err}`))
        debug('Handle Spell Matches Error: ', err)
      })
      .then(_ => askSpell())
  })
  .catch(err => debug('Ask Spell Error: ', err))

askSpell()
