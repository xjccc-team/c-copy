import { defineCommand } from 'citty'
import { sharedArgs } from './_shared'
import { downloadTemplate } from 'giget'
import { consola } from 'consola'
import { resolve, join } from 'pathe'
import { readFile } from 'fs/promises'
import { isExistDir, removeDir } from '../utils'

type SelectOption = {
  label: string
  value: string
  hint?: string
}

const getTemplate = async (dirName: string, cwd = process.cwd()) => {
  const path = join(process.cwd(), dirName)
  
  if (await isExistDir(path)) {
    await removeDir(path)
  }
  const { source, dir } = await downloadTemplate(
    `github:xjccc-team/${dirName}`,
    {
      dir: dirName,
      force: true,
      cwd
    }
  )

  return {
    source,
    dir
  }
}

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
    name: {
      type: 'positional',
      required: true,
      valueHint: 'name'
    }
  },
  async run ({ args }) {
    const projectPath = resolve(args.cwd || '.')
    let template: SelectOption = { label: args.template,value: args.template }
    consola.start('search templates ...')
    const { dir } = await getTemplate('template-infos')
    const data = await readFile(join(dir, 'templates.json'), { encoding: 'utf8' })
    const projectOptions: SelectOption[] = JSON.parse(data)
    removeDir(dir)
    const templateNames = projectOptions.map(item => item.value)
    if (!template.value || !templateNames.includes(template.value)) {
      template = await consola.prompt('select a template', {
        type: 'select',
        options: projectOptions
      })
    }

    if (await isExistDir(join(projectPath, template.value))) {
      const confirm = await consola.prompt('project is exist, do you want continue?', {
        type: 'confirm'
      })
      if (!confirm) {
        process.exit(1)
      }
    }

    await getTemplate(template.value, join(projectPath, template.value))

    consola.success('create project successful!!')
  }
})
