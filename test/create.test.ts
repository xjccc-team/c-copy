import { mkdir, mkdtemp, rm } from 'node:fs/promises'
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

  const registry = await import('../src/registry')
  const utils = await import('../src/utils/index')
  const create = (await import('../src/commands/create')).default

  return {
    create,
    registry,
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

describe('create command', () => {
  it('rejects offline create when cache belongs to another registry', async () => {
    const home = await createTempHome()
    const { create, utils } = await loadModules(home)

    silenceConsola()
    await utils.writeDefaultTemplateInfo({
      demo: {
        name: 'demo',
        label: 'Demo',
        value: 'demo',
      }
    }, {
      registryUrl: 'https://raw.githubusercontent.com/xjccc-team/template-infos/main/templates.json',
      provider: 'github',
      repo: 'xjccc-team/template-infos',
      branch: 'main',
      file: 'templates.json',
      updatedAt: '2026-04-14T00:00:00.000Z',
    })

    const getTemplateSpy = vi.spyOn(utils, 'getTemplate').mockResolvedValue({} as never)
    const exitSpy = mockProcessExit()

    await expect(create.run!({
      args: {
        cwd: home,
        template: 'demo',
        force: false,
        offline: true,
        registryProvider: 'gitlab',
        registryRepo: 'team/template-infos',
      }
    } as never)).rejects.toThrow('process.exit')

    expect(exitSpy).toHaveBeenCalledWith(1)
    expect(getTemplateSpy).not.toHaveBeenCalled()
    expect(consola.error).toHaveBeenCalledWith(
      'offline mode cannot use cache from another registry, run `c-copy update` first',
    )
  })

  it('treats a .ccopyrc directory as missing cache instead of reading it as a file', async () => {
    const home = await createTempHome()
    const { create, utils } = await loadModules(home)

    silenceConsola()
    await mkdir(utils.COPYJSON)

    const readTemplateCacheSpy = vi.spyOn(utils, 'readTemplateCache')
    const exitSpy = mockProcessExit()

    await expect(create.run!({
      args: {
        cwd: home,
        template: 'demo',
        force: false,
        offline: true,
      }
    } as never)).rejects.toThrow('process.exit')

    expect(exitSpy).toHaveBeenCalledWith(1)
    expect(readTemplateCacheSpy).not.toHaveBeenCalled()
    expect(consola.error).toHaveBeenCalledWith(
      'offline mode requires cached template info, run `c-copy update` first',
    )
  })

  it('downloads directly from --url without requiring registry cache', async () => {
    const home = await createTempHome()
    const invocationCwd = await createTempHome()
    const { create, utils } = await loadModules(home)

    silenceConsola()
    vi.stubEnv('INIT_CWD', invocationCwd)
    vi.stubEnv('C_COPY_REGISTRY_PROVIDER', 'invalid-provider')

    const getTemplateSpy = vi.spyOn(utils, 'getTemplate').mockResolvedValue({} as never)
    const downloadTemplateInfoSpy = vi.spyOn(utils, 'downloadTemplateInfo')

    await create.run!({
      args: {
        cwd: './projects',
        url: 'https://github.com/acme/demo-template.git',
        force: false,
        offline: false,
      }
    } as never)

    expect(downloadTemplateInfoSpy).not.toHaveBeenCalled()
    expect(getTemplateSpy).toHaveBeenCalledWith(expect.objectContaining({
      cwd: resolve(invocationCwd, './projects'),
      dir: 'demo-template',
      template: 'demo-template',
      templateInfo: expect.objectContaining({
        url: 'https://github.com/acme/demo-template.git',
      }),
    }))
  })

  it('rejects mixing --url with template or registry arguments', async () => {
    const home = await createTempHome()
    const { create, utils } = await loadModules(home)

    silenceConsola()
    const getTemplateSpy = vi.spyOn(utils, 'getTemplate').mockResolvedValue({} as never)
    const exitSpy = mockProcessExit()

    await expect(create.run!({
      args: {
        url: 'https://github.com/acme/demo-template.git',
        template: 'demo',
        force: false,
        offline: false,
      }
    } as never)).rejects.toThrow('process.exit')

    expect(exitSpy).toHaveBeenCalledWith(1)
    expect(getTemplateSpy).not.toHaveBeenCalled()
    expect(consola.error).toHaveBeenCalledWith('--template cannot be used together with --url')

    vi.restoreAllMocks()
    silenceConsola()
    const secondExitSpy = mockProcessExit()
    const secondGetTemplateSpy = vi.spyOn(utils, 'getTemplate').mockResolvedValue({} as never)

    await expect(create.run!({
      args: {
        url: 'https://github.com/acme/demo-template.git',
        registryProvider: 'gitlab',
        force: false,
        offline: false,
      }
    } as never)).rejects.toThrow('process.exit')

    expect(secondExitSpy).toHaveBeenCalledWith(1)
    expect(secondGetTemplateSpy).not.toHaveBeenCalled()
    expect(consola.error).toHaveBeenCalledWith('registry options cannot be used together with --url')
  })

  it('refreshes cache and uses new template info when registry changes', async () => {
    const home = await createTempHome()
    const { create, registry, utils } = await loadModules(home)

    silenceConsola()
    await utils.writeDefaultTemplateInfo({
      legacy: {
        name: 'legacy',
        label: 'Legacy',
        value: 'legacy',
      }
    }, {
      registryUrl: 'https://raw.githubusercontent.com/xjccc-team/template-infos/main/templates.json',
      provider: 'github',
      repo: 'xjccc-team/template-infos',
      branch: 'main',
      file: 'templates.json',
      updatedAt: '2026-04-14T00:00:00.000Z',
    })

    const registryConfig = registry.resolveTemplateRegistryConfig({
      registryProvider: 'gitlab',
      registryRepo: 'team/template-infos',
    }, {})

    const refreshedTemplates = {
      demo: {
        name: 'demo-template',
        label: 'Demo',
        value: 'demo',
        source: 'gitlab:team/demo-template',
        defaultDir: 'starter-app',
      }
    }

    const downloadSpy = vi.spyOn(utils, 'downloadTemplateInfo').mockResolvedValue(refreshedTemplates)
    const getTemplateSpy = vi.spyOn(utils, 'getTemplate').mockResolvedValue({} as never)

    await create.run!({
      args: {
        cwd: home,
        template: 'demo',
        name: 'my-app',
        force: false,
        offline: false,
        registryProvider: 'gitlab',
        registryRepo: 'team/template-infos',
      }
    } as never)

    expect(downloadSpy).toHaveBeenCalledWith(registryConfig)
    expect(getTemplateSpy).toHaveBeenCalledWith(expect.objectContaining({
      cwd: home,
      dir: 'my-app',
      template: 'demo',
      templateInfo: refreshedTemplates.demo,
    }))

    const cache = await utils.readTemplateCache()
    expect(cache.meta?.registryUrl).toBe(registryConfig.resolvedUrl)
    expect(cache.templates).toEqual(refreshedTemplates)
  })

  it('uses template defaultDir when name is omitted', async () => {
    const home = await createTempHome()
    const { create, utils } = await loadModules(home)

    silenceConsola()
    await utils.writeDefaultTemplateInfo({
      demo: {
        name: 'demo-template',
        label: 'Demo',
        value: 'demo',
        defaultDir: 'starter-app',
      }
    }, {
      registryUrl: 'https://raw.githubusercontent.com/xjccc-team/template-infos/main/templates.json',
      provider: 'github',
      repo: 'xjccc-team/template-infos',
      branch: 'main',
      file: 'templates.json',
      updatedAt: '2026-04-14T00:00:00.000Z',
    })

    const getTemplateSpy = vi.spyOn(utils, 'getTemplate').mockResolvedValue({} as never)

    await create.run!({
      args: {
        cwd: home,
        template: 'demo',
        force: false,
        offline: false,
      }
    } as never)

    expect(getTemplateSpy).toHaveBeenCalledWith(expect.objectContaining({
      cwd: home,
      dir: 'starter-app',
      template: 'demo',
    }))
  })

  it('applies the requested log level before downloading', async () => {
    const home = await createTempHome()
    const { create, utils } = await loadModules(home)

    silenceConsola()
    await utils.writeDefaultTemplateInfo({
      demo: {
        name: 'demo-template',
        label: 'Demo',
        value: 'demo',
        defaultDir: 'starter-app',
      }
    }, {
      registryUrl: 'https://raw.githubusercontent.com/xjccc-team/template-infos/main/templates.json',
      provider: 'github',
      repo: 'xjccc-team/template-infos',
      branch: 'main',
      file: 'templates.json',
      updatedAt: '2026-04-14T00:00:00.000Z',
    })

    const getTemplateSpy = vi.spyOn(utils, 'getTemplate').mockImplementation(async () => {
      expect(consola.level).toBe(LogLevels.warn)
      return {} as never
    })

    await create.run!({
      args: {
        cwd: home,
        template: 'demo',
        logLevel: 'warn',
        force: false,
        offline: false,
      }
    } as never)

    expect(getTemplateSpy).toHaveBeenCalledOnce()
  })

  it('uses INIT_CWD as the default target directory when invoked through pnpm', async () => {
    const home = await createTempHome()
    const invocationCwd = await createTempHome()
    const { create, utils } = await loadModules(home)

    silenceConsola()
    vi.stubEnv('INIT_CWD', invocationCwd)

    await utils.writeDefaultTemplateInfo({
      demo: {
        name: 'demo-template',
        label: 'Demo',
        value: 'demo',
        defaultDir: 'starter-app',
      }
    }, {
      registryUrl: 'https://raw.githubusercontent.com/xjccc-team/template-infos/main/templates.json',
      provider: 'github',
      repo: 'xjccc-team/template-infos',
      branch: 'main',
      file: 'templates.json',
      updatedAt: '2026-04-14T00:00:00.000Z',
    })

    const getTemplateSpy = vi.spyOn(utils, 'getTemplate').mockResolvedValue({} as never)

    await create.run!({
      args: {
        template: 'demo',
        force: false,
        offline: false,
      }
    } as never)

    expect(getTemplateSpy).toHaveBeenCalledWith(expect.objectContaining({
      cwd: invocationCwd,
      dir: 'starter-app',
      template: 'demo',
    }))
  })

  it('resolves relative --cwd from INIT_CWD when invoked through pnpm', async () => {
    const home = await createTempHome()
    const invocationCwd = await createTempHome()
    const { create, utils } = await loadModules(home)

    silenceConsola()
    vi.stubEnv('INIT_CWD', invocationCwd)

    await utils.writeDefaultTemplateInfo({
      demo: {
        name: 'demo-template',
        label: 'Demo',
        value: 'demo',
        defaultDir: 'starter-app',
      }
    }, {
      registryUrl: 'https://raw.githubusercontent.com/xjccc-team/template-infos/main/templates.json',
      provider: 'github',
      repo: 'xjccc-team/template-infos',
      branch: 'main',
      file: 'templates.json',
      updatedAt: '2026-04-14T00:00:00.000Z',
    })

    const getTemplateSpy = vi.spyOn(utils, 'getTemplate').mockResolvedValue({} as never)

    await create.run!({
      args: {
        cwd: './projects',
        template: 'demo',
        force: false,
        offline: false,
      }
    } as never)

    expect(getTemplateSpy).toHaveBeenCalledWith(expect.objectContaining({
      cwd: resolve(invocationCwd, './projects'),
      dir: 'starter-app',
      template: 'demo',
    }))
  })

  it('falls back to PWD when INIT_CWD is missing', async () => {
    const home = await createTempHome()
    const invocationCwd = await createTempHome()
    const { create, utils } = await loadModules(home)

    silenceConsola()
    vi.stubEnv('INIT_CWD', '')
    vi.stubEnv('PWD', invocationCwd)

    await utils.writeDefaultTemplateInfo({
      demo: {
        name: 'demo-template',
        label: 'Demo',
        value: 'demo',
        defaultDir: 'starter-app',
      }
    }, {
      registryUrl: 'https://raw.githubusercontent.com/xjccc-team/template-infos/main/templates.json',
      provider: 'github',
      repo: 'xjccc-team/template-infos',
      branch: 'main',
      file: 'templates.json',
      updatedAt: '2026-04-14T00:00:00.000Z',
    })

    const getTemplateSpy = vi.spyOn(utils, 'getTemplate').mockResolvedValue({} as never)

    await create.run!({
      args: {
        template: 'demo',
        force: false,
        offline: false,
      }
    } as never)

    expect(getTemplateSpy).toHaveBeenCalledWith(expect.objectContaining({
      cwd: invocationCwd,
      dir: 'starter-app',
      template: 'demo',
    }))
  })
})