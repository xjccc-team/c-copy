import { defineCommand } from 'citty'
import { commands } from './commands'
import pkg from '../package.json' assert { type: 'json' }

// import { checkForUpdates } from './utils/update'

export const main = defineCommand({
  meta: {
    name: pkg.name,
    version: pkg.version,
    description: pkg.description,
  },
  subCommands: commands,
  async setup(ctx) {
    // console.log(ctx)
  }
})