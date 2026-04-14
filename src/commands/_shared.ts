import { LogLevels, type LogLevel } from 'consola'

const namedLogLevels = {
  silent: LogLevels.silent,
  fatal: LogLevels.fatal,
  error: LogLevels.error,
  warn: LogLevels.warn,
  log: LogLevels.log,
  info: LogLevels.info,
  debug: LogLevels.debug,
  trace: LogLevels.trace,
  verbose: LogLevels.verbose,
} as const

export const supportedLogLevels = Object.freeze(Object.keys(namedLogLevels))

export const sharedArgs = {
  cwd: {
    type: 'string',
    description: 'Target directory, defaults to the directory where the command was invoked',
  },
  logLevel: {
    type: 'string',
    description: `Log level: ${supportedLogLevels.join(', ')} or a numeric level`,
  },
} as const

export const resolveLogLevel = (value?: string): LogLevel | undefined => {
  if (typeof value !== 'string') {
    return undefined
  }

  const normalized = value.trim().toLowerCase()

  if (!normalized) {
    return undefined
  }

  if (/^\d+$/.test(normalized)) {
    return Number(normalized) as LogLevel
  }

  const namedLevel = namedLogLevels[normalized as keyof typeof namedLogLevels]

  if (namedLevel !== undefined) {
    return namedLevel
  }

  throw new Error(
    `invalid log level \"${value}\", expected one of ${supportedLogLevels.join(', ')} or a numeric level`,
  )
}

export const registryArgs = {
  registryUrl: {
    type: 'string',
    alias: 'r',
    description: 'Direct template registry URL',
  },
  registryProvider: {
    type: 'string',
    description: 'Template registry provider: github, gitlab, gitee or url',
  },
  registryRepo: {
    type: 'string',
    description: 'Template registry repository path, for example xjccc-team/template-infos',
  },
  registryBranch: {
    type: 'string',
    description: 'Template registry branch or ref',
  },
  registryFile: {
    type: 'string',
    description: 'Template registry file path',
  },
} as const