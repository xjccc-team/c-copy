import {
  ResolvedTemplateRegistryConfig,
  TemplateCacheMeta,
  TemplateRegistryArgs,
  TemplateRegistryConfig,
  TemplateRegistryProvider,
} from './types'

export const REGISTRY_ENV_KEYS = {
  url: 'C_COPY_REGISTRY_URL',
  provider: 'C_COPY_REGISTRY_PROVIDER',
  repo: 'C_COPY_REGISTRY_REPO',
  branch: 'C_COPY_REGISTRY_BRANCH',
  file: 'C_COPY_REGISTRY_FILE',
} as const

export const DEFAULT_TEMPLATE_REGISTRY_CONFIG: TemplateRegistryConfig = {
  provider: 'github',
  repo: 'xjccc-team/template-infos',
  branch: 'main',
  file: 'templates.json',
}

const PROVIDER_ALIASES: Record<string, TemplateRegistryProvider> = {
  github: 'github',
  gh: 'github',
  gitlab: 'gitlab',
  gl: 'gitlab',
  gitee: 'gitee',
  ge: 'gitee',
  url: 'url',
  raw: 'url',
}

const trimPath = (value: string) => value.replace(/^\/+|\/+$/g, '')
const trimFile = (value: string) => value.replace(/^\/+/, '')

export const normalizeTemplateRegistryProvider = (
  input?: string,
): TemplateRegistryProvider => {
  const normalized = input?.trim().toLowerCase()

  if (!normalized) {
    return DEFAULT_TEMPLATE_REGISTRY_CONFIG.provider
  }

  const provider = PROVIDER_ALIASES[normalized]

  if (!provider) {
    throw new Error(`Unsupported template registry provider: ${input}`)
  }

  return provider
}

export const hasTemplateRegistryOverride = (
  args: TemplateRegistryArgs = {},
  env: NodeJS.ProcessEnv = process.env,
) => {
  return Boolean(
    args.registryUrl
    || args.registryProvider
    || args.registryRepo
    || args.registryBranch
    || args.registryFile
    || env[REGISTRY_ENV_KEYS.url]
    || env[REGISTRY_ENV_KEYS.provider]
    || env[REGISTRY_ENV_KEYS.repo]
    || env[REGISTRY_ENV_KEYS.branch]
    || env[REGISTRY_ENV_KEYS.file],
  )
}

const normalizeRegistryUrl = (input: string) => {
  let parsedUrl: URL

  try {
    parsedUrl = new URL(input)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`invalid registry url: ${input}. ${message}`)
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error(
      `invalid registry url protocol: ${parsedUrl.protocol}. Only http: and https: are supported`,
    )
  }

  return parsedUrl.toString()
}

export const buildTemplateRegistryUrl = (config: TemplateRegistryConfig) => {
  if (config.provider === 'url') {
    const input = config.url?.trim()

    if (!input) {
      throw new Error('registry url is required when provider is url')
    }

    return normalizeRegistryUrl(input)
  }

  const repo = trimPath(config.repo || '')
  const branch = trimPath(config.branch)
  const file = trimFile(config.file)

  if (!repo) {
    throw new Error('registry repo is required')
  }

  if (!branch) {
    throw new Error('registry branch is required')
  }

  if (!file) {
    throw new Error('registry file is required')
  }

  if (config.provider === 'gitlab') {
    return `https://gitlab.com/${repo}/-/raw/${branch}/${file}`
  }

  if (config.provider === 'gitee') {
    return `https://gitee.com/${repo}/raw/${branch}/${file}`
  }

  return `https://raw.githubusercontent.com/${repo}/${branch}/${file}`
}

export const resolveTemplateRegistryConfig = (
  args: TemplateRegistryArgs = {},
  env: NodeJS.ProcessEnv = process.env,
): ResolvedTemplateRegistryConfig => {
  const directUrl = args.registryUrl?.trim() || env[REGISTRY_ENV_KEYS.url]?.trim()

  if (directUrl) {
    return {
      provider: 'url',
      url: directUrl,
      repo: undefined,
      branch: '',
      file: '',
      resolvedUrl: buildTemplateRegistryUrl({
        provider: 'url',
        url: directUrl,
        branch: '',
        file: '',
      }),
    }
  }

  const provider = normalizeTemplateRegistryProvider(
    args.registryProvider
      || env[REGISTRY_ENV_KEYS.provider]
      || DEFAULT_TEMPLATE_REGISTRY_CONFIG.provider,
  )

  const repo = trimPath(
    args.registryRepo
      || env[REGISTRY_ENV_KEYS.repo]
      || DEFAULT_TEMPLATE_REGISTRY_CONFIG.repo
      || '',
  )

  const branch = trimPath(
    args.registryBranch
      || env[REGISTRY_ENV_KEYS.branch]
      || DEFAULT_TEMPLATE_REGISTRY_CONFIG.branch,
  )

  const file = trimFile(
    args.registryFile
      || env[REGISTRY_ENV_KEYS.file]
      || DEFAULT_TEMPLATE_REGISTRY_CONFIG.file,
  )

  const resolvedUrl = buildTemplateRegistryUrl({
    provider,
    repo,
    branch,
    file,
  })

  return {
    provider,
    repo,
    branch,
    file,
    resolvedUrl,
  }
}

export const createTemplateCacheMeta = (
  config: ResolvedTemplateRegistryConfig,
): TemplateCacheMeta => {
  return {
    registryUrl: config.resolvedUrl,
    provider: config.provider,
    repo: config.repo,
    branch: config.branch,
    file: config.file,
    updatedAt: new Date().toISOString(),
  }
}