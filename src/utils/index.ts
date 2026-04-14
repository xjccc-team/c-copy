import consola from 'consola'
import { stat, readFile, writeFile } from 'node:fs/promises'
import { join } from 'pathe'
import type { DownloadTemplateOptions } from 'giget'
import { downloadTemplate } from 'giget'
import ini from 'ini'
import { normalizeTemplateRegistryProvider, resolveTemplateRegistryConfig } from '../registry'
import {
  ResolvedTemplateRegistryConfig,
  TemplateCacheData,
  TemplateCacheMeta,
  TemplateOption,
  TemplateRegistry,
} from '../types'

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

export const isFile = async (path: string) => {
  try {
    const stats = await stat(path)
    return stats.isFile()
  } catch (error) {
    return false
  }
}

export const HOME =
  process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'] || '/'
  
// export const COPYDIR = join(HOME, 'c-copy')
export const COPYJSON = join(HOME, '.ccopyrc')

export const gigetDir = join(HOME, '.cache', 'giget')
export const TEMPLATE_CACHE_META_KEY = '__ccopy__'

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
  templateInfo?: TemplateOption
}

const ARCHIVE_URL_RE = /\.(tar\.gz|tgz|zip)(?:$|[?#])/i

const TEMPLATE_OPTION_FIELDS = ['name', 'label', 'value', 'hint', 'url', 'tar', 'source', 'defaultDir'] as const

const readMeaningfulString = (value: unknown) => {
  if (typeof value !== 'string') {
    return undefined
  }

  const normalized = value.trim()

  if (!normalized || normalized === 'undefined' || normalized === 'null') {
    return undefined
  }

  return normalized
}

const compactIniSection = (value: Record<string, unknown>) => {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => {
    return item !== undefined
  }))
}

const normalizeTemplateOption = (key: string, input: unknown): TemplateOption | null => {
  if (!input || typeof input !== 'object') {
    return null
  }

  if (key === TEMPLATE_CACHE_META_KEY) {
    return null
  }

  const value = input as Record<string, unknown>

  const hasTemplateField = TEMPLATE_OPTION_FIELDS.some(field => {
    return Boolean(readMeaningfulString(value[field]))
  })

  if (!hasTemplateField) {
    return null
  }

  const templateName = readMeaningfulString(value.name)

  const templateValue = readMeaningfulString(value.value) || templateName || key

  return {
    name: templateName || templateValue,
    label: readMeaningfulString(value.label) || templateValue,
    value: templateValue,
    hint: readMeaningfulString(value.hint),
    url: readMeaningfulString(value.url),
    tar: readMeaningfulString(value.tar),
    source: readMeaningfulString(value.source),
    defaultDir: readMeaningfulString(value.defaultDir),
  }
}

export const normalizeTemplateInfo = (input: Record<string, unknown>): TemplateRegistry => {
  return Object.entries(input).reduce((registry, [key, value]) => {
    const template = normalizeTemplateOption(key, value)

    if (template) {
      registry[template.value] = template
    }

    return registry
  }, {} as TemplateRegistry)
}

const normalizeTemplateCacheProvider = (value: unknown): TemplateCacheMeta['provider'] => {
  const provider = readMeaningfulString(value)

  if (!provider) {
    return 'github'
  }

  try {
    return normalizeTemplateRegistryProvider(provider)
  } catch {
    return 'github'
  }
}

const normalizeTemplateCacheMeta = (input: unknown): TemplateCacheMeta | undefined => {
  if (!input || typeof input !== 'object') {
    return undefined
  }

  const value = input as Record<string, unknown>
  const registryUrl = readMeaningfulString(value.registryUrl)

  if (!registryUrl) {
    return undefined
  }

  return {
    registryUrl,
    provider: normalizeTemplateCacheProvider(value.provider),
    repo: readMeaningfulString(value.repo),
    branch: readMeaningfulString(value.branch) || '',
    file: readMeaningfulString(value.file) || '',
    updatedAt: readMeaningfulString(value.updatedAt) || '',
  }
}

const normalizeTemplateGitSource = (value?: string) => {
  const input = value?.trim()

  if (!input) {
    return undefined
  }

  if (/^(git|github|gh|gitlab|bitbucket|sourcehut)(\+git)?:/i.test(input)) {
    return input
  }

  if (/^https?:\/\//i.test(input)) {
    return `git:${input}`
  }

  return undefined
}

export const normalizeDownloadUrl = (value: string) => {
  try {
    const url = new URL(value)

    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('download url must use http or https')
    }

    return url.toString()
  } catch (error) {
    if (error instanceof Error && error.message === 'download url must use http or https') {
      throw error
    }

    throw new Error(`invalid download url: ${value}`)
  }
}

const sanitizeTemplateDirName = (value?: string) => {
  const normalized = readMeaningfulString(value)

  if (!normalized) {
    return undefined
  }

  return normalized
    .replace(/\.(tar\.gz|tgz|zip)$/i, '')
    .replace(/\.git$/i, '')
}

export const resolveTemplateDirFromUrl = (value: string) => {
  const normalizedUrl = normalizeDownloadUrl(value)
  const { pathname } = new URL(normalizedUrl)
  const segments = pathname.split('/').filter(Boolean)
  const archiveMarkers = ['repository', 'archive']

  for (const marker of archiveMarkers) {
    const index = segments.indexOf(marker)

    if (index > 0) {
      for (let segmentIndex = index - 1; segmentIndex >= 0; segmentIndex--) {
        const segment = segments[segmentIndex]

        if (segment === '-') {
          continue
        }

        const archiveDir = sanitizeTemplateDirName(segment)

        if (archiveDir) {
          return archiveDir
        }
      }
    }
  }

  return sanitizeTemplateDirName(segments.at(-1)) || 'template'
}

export const createTemplateInfoFromUrl = (value: string, templateName: string): TemplateOption => {
  const normalizedUrl = normalizeDownloadUrl(value)
  const templateInfo: TemplateOption = {
    name: templateName,
    label: templateName,
    value: templateName,
  }

  if (ARCHIVE_URL_RE.test(normalizedUrl)) {
    templateInfo.tar = normalizedUrl
    return templateInfo
  }

  templateInfo.url = normalizedUrl
  return templateInfo
}

const resolveTemplateSource = (templateInfo: TemplateOption, templateName: string) => {
  if (templateInfo.source) {
    return templateInfo.source
  }

  if (templateInfo.tar) {
    return templateInfo.tar
  }

  const gitSource = normalizeTemplateGitSource(templateInfo.url)

  if (gitSource) {
    return gitSource
  }

  return `github:xjccc-team/${templateName}`
}

export const getTemplate = async (options: TemplateOptions) => {
  const {
    dir = '',
    template = dir,
    templateInfo,
    cwd = process.cwd() || '.',
    ...downloadOptions
  } = options
  const path = join(cwd, dir)

  let forceClean = downloadOptions.forceClean

  if (dir && await isExist(path)) {
    forceClean = await confirm(path)
  }

  if (!template) {
    consola.error('--template or -t to get template')
    process.exit(1)
  }

  const resolvedTemplateInfo = templateInfo || {
    name: template,
    label: template,
    value: template,
  }

  const source = resolveTemplateSource(resolvedTemplateInfo, template)

  return await downloadTemplate(source, {
    ...downloadOptions,
    forceClean,
    cwd,
    dir
  })
}

export async function downloadTemplateInfo (
  registryConfig: ResolvedTemplateRegistryConfig = resolveTemplateRegistryConfig(),
) {
  const response = await fetch(registryConfig.resolvedUrl)

  if (!response.ok) {
    throw new Error(`Failed to fetch template info: ${response.status} ${response.statusText}`)
  }

  const payload = await response.json()

  if (!Array.isArray(payload)) {
    throw new TypeError('Invalid template info format, expected an array')
  }

  const data = payload.reduce((registry, item) => {
    if (!item || typeof item !== 'object') {
      return registry
    }

    const template = normalizeTemplateOption('', item)

    if (template?.value) {
      registry[template.value] = template
    }

    return registry
  }, {} as TemplateRegistry)

  if (!Object.keys(data).length) {
    throw new Error('Template info is empty')
  }

  return data
}

export async function readTemplateCache (): Promise<TemplateCacheData> {
  const data = await readFile(COPYJSON, {
    encoding: 'utf8'
  })

  const parsed = ini.parse(data) as Record<string, unknown>

  return {
    meta: normalizeTemplateCacheMeta(parsed[TEMPLATE_CACHE_META_KEY]),
    templates: normalizeTemplateInfo(parsed),
  }
}

export async function writeTemplateCache ({
  meta,
  templates,
}: TemplateCacheData) {
  const payload = Object.entries(templates).reduce((result, [key, value]) => {
    result[key] = compactIniSection(value)
    return result
  }, {} as Record<string, unknown>)

  if (meta) {
    payload[TEMPLATE_CACHE_META_KEY] = compactIniSection(meta as unknown as Record<string, unknown>)
  }

  await writeFile(COPYJSON, ini.stringify(payload), {
    encoding: 'utf8'
  })
}

export async function writeDefaultTemplateInfo (
  data: TemplateRegistry,
  meta?: TemplateCacheMeta,
) {
  await writeTemplateCache({
    meta,
    templates: data,
  })
}
