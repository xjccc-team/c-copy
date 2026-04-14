export type TemplateOption = {
  name: string
  label: string
  value: string
  hint?: string
  url?: string
  tar?: string
  source?: string
  defaultDir?: string
}

export type TemplateRegistry = Record<string, TemplateOption>

export type TemplateRegistryProvider = 'github' | 'gitlab' | 'gitee' | 'url'

export type TemplateRegistryArgs = {
  registryUrl?: string
  registryProvider?: string
  registryRepo?: string
  registryBranch?: string
  registryFile?: string
}

export type TemplateRegistryConfig = {
  provider: TemplateRegistryProvider
  repo?: string
  branch: string
  file: string
  url?: string
}

export type ResolvedTemplateRegistryConfig = TemplateRegistryConfig & {
  resolvedUrl: string
}

export type TemplateCacheMeta = {
  registryUrl: string
  provider: TemplateRegistryProvider
  repo?: string
  branch: string
  file: string
  updatedAt: string
}

export type TemplateCacheData = {
  meta?: TemplateCacheMeta
  templates: TemplateRegistry
}
