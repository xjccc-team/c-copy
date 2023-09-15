import { defineCommand } from "citty";
import consola from "consola";
import { readFile } from "node:fs/promises";
import { COPYJSON } from "../utils";
import ini from 'ini'

export default defineCommand({
  meta: {
    name: 'show',
    description: 'show .ccopyrc config'
  },
  async run () {
    const json = await readFile(COPYJSON, {encoding: 'utf8'})
    if (!json) {
      consola.error('cant find .ccopyrc')
      process.exit(1)
    }
    consola.log(JSON.stringify(ini.parse(json), null, 2))
  }
})