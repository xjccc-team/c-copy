import { defineCommand } from 'citty'
import { sharedArgs } from './_shared'
import { consola } from 'consola'
import { resolve } from 'pathe'
import { readFile } from 'node:fs/promises'
import { isExist, __dirname, COPYJSON, getTemplate, downloadTemplateInfo, writeDefaultTemplateInfo } from '../utils'
import ini from 'ini'
import { SelectOption } from '../types'

// const files: TemplateProvider = async (input, { auth }) => {
//   return {
//     name: "rainbow",
//     url: `https://github.com/xjccc-team/template-infos/blob/main/${input}`,
//     tar: `https://raw.githubusercontent.com/xjccc-team/template-infos/main/${input}`,
//   };
// };
// const files = registryProvider("https://raw.githubusercontent.com/xjccc-team/main/template-infos")

export default defineCommand({
  meta: {
    name: 'create',
    description: 'create a new project'
  },
  args: {
    ...sharedArgs,
    template: {
      type: 'string',
      description: 'vue template name'
    },
    force: {
      type: 'boolean',
      description: 'update template json latest',
      alias: 'f',
      default: false
    },
    name: {
      type: 'positional',
      required: false,
      valueHint: 'name'
    }
  },
  async run ({ args }) {
    const projectPath = resolve(args.cwd || '.')
    let template = args.template

    const projectName = args.name || template

    consola.start('get templates ...')

    const force = args.force || false

    const hasJsonFile = await isExist(COPYJSON)

    if (force || !hasJsonFile) {
      const data = await downloadTemplateInfo()
      await writeDefaultTemplateInfo(data)
    }

    const data = ini.parse(
      await readFile(COPYJSON, {
        encoding: 'utf8'
      })
    )

    const projectOptions: SelectOption[] = Object.keys(data).map(item => {
      return data[item]
    })

    const templateNames = projectOptions.map(item => item.value)
    if (!template || !templateNames.includes(template)) {
      template = (await consola.prompt('select a template', {
        type: 'select',
        options: projectOptions
      })) as unknown as string
    }

    consola.start('start downloading ...')
    const dirName = projectName || template
    await getTemplate({
      dirName,
      template,
      cwd: projectPath
    })

    consola.success('create project successful!!')
    consola.box(`cd ${dirName} && pnpm install`)
  }
})
