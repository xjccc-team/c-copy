import consola from 'consola'
import { stat, rm, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'pathe'
import { DownloadTemplateOptions, downloadTemplate } from 'giget'
import { SelectOption } from '../types'
import ini from 'ini'

// import { createDefu } from 'defu'

// export const defuExt = createDefu((obj, key, value) => {
//   obj[key] = value || obj[key]
//   return true
// })

export const isExist = async (path: string) => {
  try {
    const stats = await stat(path)
    return stats.isDirectory() || stats.isFile()
  } catch (error) {
    return false
  }
}

export const removeDir = async (path: string) => {
  return rm(path, { recursive: true, force: true })
}

export const __filename = fileURLToPath(import.meta.url)
export const __dirname = dirname(__filename)

export const HOME =
  process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'] || '/'
  
// export const COPYDIR = join(HOME, 'c-copy')
export const COPYJSON = join(HOME, '.ccopyrc')

export const gigetDir = join(HOME, '.cache', 'giget')

export async function confirm (path: string) {
  const isConfirm = await consola.prompt(
    `project: ${path} is exist, do you want continue?`,
    {
      type: 'confirm'
    }
  )

  if (!isConfirm || typeof isConfirm !== 'boolean') {
    process.exit(1)
  }

  consola.success('continue ...')

  return isConfirm
}

interface TemplateOptions extends DownloadTemplateOptions {
  template?: string
  fileName?: string
}

export const getTemplate = async (options: TemplateOptions) => {
  const { dir = '', template = dir, fileName = '' } = options
  const cwd = options.cwd || process.cwd() || '.'
  const path = join(cwd, dir)

  if (await isExist(path)) {
    options.forceClean = await confirm(path)
  }
  if (!template) {
    consola.error('--template or -t to get template')
    process.exit(1)
  }

  const defaultGithub = `github:xjccc-team/${template}`

  const source = fileName ? fileName : defaultGithub

  return await downloadTemplate(source, {
    ...options,
    cwd,
    dir
  })
}

export async function downloadTemplateInfo () {
  const { dir } = await getTemplate({
    template: 'template-infos',
    // fileName: 'files:templates.json',
    // providers: { files },
    dir: '__temp__',
    force: true
  })

  const json = await readFile(join(dir, 'templates.json'), {
    encoding: 'utf8'
  })

  const data = (JSON.parse(json) as SelectOption[]).reduce((prev, next) => {
    prev[next.value] = next
    return prev
  }, {} as { [key: string]: SelectOption })

  await removeDir(dir)
  return data
}

export async function writeDefaultTemplateInfo (data: { [key: string]: SelectOption }) {
  await writeFile(COPYJSON, ini.stringify(data))
}
