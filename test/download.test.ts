import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { LogLevels, consola } from 'consola'
import { afterEach, describe, expect, it, vi } from 'vitest'

const tempDirs: string[] = []
const defaultConsolaLevel = consola.level

const createTempHome = async () => {
  const dir = await mkdtemp(join(tmpdir(), 'c-copy-'))
  tempDirs.push(dir)
  return dir
}

const loadModules = async (home: string) => {
  vi.resetModules()
  vi.stubEnv('HOME', home)
  vi.stubEnv('USERPROFILE', home)

  const utils = await import('../src/utils/index')
  const download = (await import('../src/commands/download')).default

  return {
    download,
    utils,
  }
}

const silenceConsola = () => {
  vi.spyOn(consola, 'start').mockImplementation(() => consola as typeof consola)
  vi.spyOn(consola, 'success').mockImplementation(() => consola as typeof consola)
  vi.spyOn(consola, 'warn').mockImplementation(() => consola as typeof consola)
  vi.spyOn(consola, 'error').mockImplementation(() => consola as typeof consola)
  vi.spyOn(consola, 'box').mockImplementation(() => '')
}

const mockProcessExit = () => {
  return vi.spyOn(process, 'exit').mockImplementation((() => {
    throw new Error('process.exit')
  }) as never)
}

afterEach(async () => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.resetModules()
  consola.level = defaultConsolaLevel

  await Promise.all(tempDirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })))
})

describe('download command', () => {
  it('downloads a repository URL into the requested directory', async () => {
    const home = await createTempHome()
    const invocationCwd = await createTempHome()
    const { download, utils } = await loadModules(home)

    silenceConsola()
    vi.stubEnv('INIT_CWD', invocationCwd)

    const getTemplateSpy = vi.spyOn(utils, 'getTemplate').mockResolvedValue({} as never)

    await download.run!({
      args: {
        cwd: './projects',
        url: 'https://github.com/acme/demo-template.git',
        name: 'my-app',
        force: false,
        offline: false,
      }
    } as never)

    expect(getTemplateSpy).toHaveBeenCalledWith(expect.objectContaining({
      cwd: resolve(invocationCwd, './projects'),
      dir: 'my-app',
      template: 'my-app',
      templateInfo: expect.objectContaining({
        url: 'https://github.com/acme/demo-template.git',
      }),
    }))
  })

  it('treats archive URLs as tarball downloads and derives the repository directory name', async () => {
    const home = await createTempHome()
    const { download, utils } = await loadModules(home)

    silenceConsola()
    const getTemplateSpy = vi.spyOn(utils, 'getTemplate').mockResolvedValue({} as never)

    await download.run!({
      args: {
        url: 'https://github.com/acme/demo-template/archive/refs/heads/main.tar.gz',
        force: false,
        offline: false,
      }
    } as never)

    expect(getTemplateSpy).toHaveBeenCalledWith(expect.objectContaining({
      dir: 'demo-template',
      template: 'demo-template',
      templateInfo: expect.objectContaining({
        tar: 'https://github.com/acme/demo-template/archive/refs/heads/main.tar.gz',
      }),
    }))
  })

  it('derives the repository directory name for gitee repository archive URLs', async () => {
    const home = await createTempHome()
    const { download, utils } = await loadModules(home)

    silenceConsola()
    const getTemplateSpy = vi.spyOn(utils, 'getTemplate').mockResolvedValue({} as never)

    await download.run!({
      args: {
        url: 'https://gitee.com/acme/demo-template/repository/archive/main.tar.gz',
        force: false,
        offline: false,
      }
    } as never)

    expect(getTemplateSpy).toHaveBeenCalledWith(expect.objectContaining({
      dir: 'demo-template',
      template: 'demo-template',
      templateInfo: expect.objectContaining({
        tar: 'https://gitee.com/acme/demo-template/repository/archive/main.tar.gz',
      }),
    }))
  })

  it('applies the requested log level before downloading', async () => {
    const home = await createTempHome()
    const { download, utils } = await loadModules(home)

    silenceConsola()
    const getTemplateSpy = vi.spyOn(utils, 'getTemplate').mockImplementation(async () => {
      expect(consola.level).toBe(LogLevels.warn)
      return {} as never
    })

    await download.run!({
      args: {
        url: 'https://github.com/acme/demo-template.git',
        logLevel: 'warn',
        force: false,
        offline: false,
      }
    } as never)

    expect(getTemplateSpy).toHaveBeenCalledOnce()
  })

  it('rejects invalid download urls', async () => {
    const home = await createTempHome()
    const { download, utils } = await loadModules(home)

    silenceConsola()
    const getTemplateSpy = vi.spyOn(utils, 'getTemplate').mockResolvedValue({} as never)
    const exitSpy = mockProcessExit()

    await expect(download.run!({
      args: {
        url: 'git@github.com:acme/demo-template.git',
        force: false,
        offline: false,
      }
    } as never)).rejects.toThrow('process.exit')

    expect(exitSpy).toHaveBeenCalledWith(1)
    expect(getTemplateSpy).not.toHaveBeenCalled()
    expect(consola.error).toHaveBeenCalledWith('invalid download url: git@github.com:acme/demo-template.git')
  })
})