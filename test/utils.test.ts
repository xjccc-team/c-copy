import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { downloadTemplateMock } = vi.hoisted(() => {
  return {
    downloadTemplateMock: vi.fn(),
  }
})

vi.mock('giget', () => {
  return {
    downloadTemplate: downloadTemplateMock,
  }
})

const tempDirs: string[] = []

const createTempHome = async () => {
  const dir = await mkdtemp(join(tmpdir(), 'c-copy-'))
  tempDirs.push(dir)
  return dir
}

const loadUtils = async (home: string) => {
  vi.resetModules()
  vi.stubEnv('HOME', home)
  vi.stubEnv('USERPROFILE', home)

  return await import('../src/utils/index')
}

afterEach(async () => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.resetModules()
  downloadTemplateMock.mockReset()

  await Promise.all(tempDirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })))
})

describe('utils', () => {
  it('distinguishes regular files from directories', async () => {
    const home = await createTempHome()
    const utils = await loadUtils(home)

    await mkdir(utils.COPYJSON)

    expect(await utils.isExist(utils.COPYJSON)).toBe(true)
    expect(await utils.isFile(utils.COPYJSON)).toBe(false)

    await rm(utils.COPYJSON, { recursive: true, force: true })
    await writeFile(utils.COPYJSON, '')

    expect(await utils.isFile(utils.COPYJSON)).toBe(true)
  })

  it('persists template cache metadata separately from templates', async () => {
    const home = await createTempHome()
    const utils = await loadUtils(home)

    await utils.writeDefaultTemplateInfo({
      demo: {
        name: 'demo',
        label: 'Demo',
        value: 'demo',
        tar: 'https://example.com/demo.tar.gz',
        defaultDir: 'demo-app',
      }
    }, {
      registryUrl: 'https://gitlab.com/team/template-infos/-/raw/main/templates.json',
      provider: 'gitlab',
      repo: 'team/template-infos',
      branch: 'main',
      file: 'templates.json',
      updatedAt: '2026-04-14T00:00:00.000Z',
    })

    const cache = await utils.readTemplateCache()

    expect(cache.meta?.registryUrl).toBe('https://gitlab.com/team/template-infos/-/raw/main/templates.json')
    expect(cache.templates).toEqual({
      demo: {
        name: 'demo',
        label: 'Demo',
        value: 'demo',
        tar: 'https://example.com/demo.tar.gz',
        defaultDir: 'demo-app',
      }
    })

    const raw = await readFile(utils.COPYJSON, 'utf8')
    expect(raw).not.toContain('source=undefined')
  })

  it('prefers explicit source when downloading templates', async () => {
    downloadTemplateMock.mockResolvedValue({
      source: 'gitlab:team/demo-template',
      dir: '/tmp/demo-template',
    })

    const home = await createTempHome()
    const utils = await loadUtils(home)

    await utils.getTemplate({
      cwd: home,
      dir: 'demo-template',
      template: 'demo-template',
      templateInfo: {
        name: 'demo-template',
        label: 'Demo',
        value: 'demo-template',
        source: 'gitlab:team/demo-template',
      },
    })

    expect(downloadTemplateMock).toHaveBeenCalledWith(
      'gitlab:team/demo-template',
      expect.objectContaining({
        cwd: home,
        dir: 'demo-template',
      }),
    )
  })

  it('uses a tarball URL directly when registry item exposes tar', async () => {
    downloadTemplateMock.mockResolvedValue({
      source: 'https://gitee.com/team/demo-template/repository/archive/main.tar.gz',
      dir: '/tmp/demo-template',
    })

    const home = await createTempHome()
    const utils = await loadUtils(home)

    await utils.getTemplate({
      cwd: home,
      dir: 'demo-template',
      template: 'demo-template',
      templateInfo: {
        name: 'demo-template',
        label: 'Demo',
        value: 'demo-template',
        tar: 'https://gitee.com/team/demo-template/repository/archive/main.tar.gz',
        url: 'https://gitee.com/team/demo-template',
        defaultDir: 'demo-template',
      },
    })

    expect(downloadTemplateMock).toHaveBeenCalledWith(
      'https://gitee.com/team/demo-template/repository/archive/main.tar.gz',
      expect.objectContaining({
        cwd: home,
        dir: 'demo-template',
      }),
    )
  })

  it('uses template url from registry when tar and source are missing', async () => {
    downloadTemplateMock.mockResolvedValue({
      source: 'git:https://gitlab.com/team/demo-template',
      dir: '/tmp/demo-template',
    })

    const home = await createTempHome()
    const utils = await loadUtils(home)

    await utils.getTemplate({
      cwd: home,
      dir: 'demo-template',
      template: 'demo-template',
      templateInfo: {
        name: 'demo-template',
        label: 'Demo',
        value: 'demo-template',
        url: 'https://gitlab.com/team/demo-template',
      },
    })

    expect(downloadTemplateMock).toHaveBeenCalledWith(
      'git:https://gitlab.com/team/demo-template',
      expect.objectContaining({
        cwd: home,
        dir: 'demo-template',
      }),
    )
  })

  it('ignores legacy undefined strings in cached template fields', async () => {
    downloadTemplateMock.mockResolvedValue({
      source: 'https://example.com/demo-template.tar.gz',
      dir: '/tmp/demo-template',
    })

    const home = await createTempHome()
    const utils = await loadUtils(home)

    await writeFile(utils.COPYJSON, [
      '[demo-template]',
      'name=demo-template',
      'label=Demo',
      'value=demo-template',
      'source=undefined',
      'tar=https://example.com/demo-template.tar.gz',
      '',
      '[__ccopy__]',
      'registryUrl=https://raw.githubusercontent.com/xjccc-team/template-infos/main/templates.json',
      'provider=github',
      'repo=xjccc-team/template-infos',
      'branch=main',
      'file=templates.json',
      'updatedAt=2026-04-14T00:00:00.000Z',
      '',
    ].join('\n'))

    const cache = await utils.readTemplateCache()

    expect(cache.templates['demo-template']).toEqual({
      name: 'demo-template',
      label: 'Demo',
      value: 'demo-template',
      tar: 'https://example.com/demo-template.tar.gz',
    })

    await utils.getTemplate({
      cwd: home,
      dir: 'demo-template',
      template: 'demo-template',
      templateInfo: cache.templates['demo-template'],
    })

    expect(downloadTemplateMock).toHaveBeenCalledWith(
      'https://example.com/demo-template.tar.gz',
      expect.objectContaining({
        cwd: home,
        dir: 'demo-template',
      }),
    )
  })

  it('normalizes cached registry providers and falls back for invalid values', async () => {
    const home = await createTempHome()
    const utils = await loadUtils(home)

    await writeFile(utils.COPYJSON, [
      '[demo-template]',
      'name=demo-template',
      'label=Demo',
      'value=demo-template',
      '',
      '[__ccopy__]',
      'registryUrl=https://example.com/templates.json',
      'provider=gl',
      'repo=team/template-infos',
      'branch=main',
      'file=templates.json',
      '',
    ].join('\n'))

    expect((await utils.readTemplateCache()).meta?.provider).toBe('gitlab')

    await writeFile(utils.COPYJSON, [
      '[demo-template]',
      'name=demo-template',
      'label=Demo',
      'value=demo-template',
      '',
      '[__ccopy__]',
      'registryUrl=https://example.com/templates.json',
      'provider=unexpected-provider',
      'repo=team/template-infos',
      'branch=main',
      'file=templates.json',
      '',
    ].join('\n'))

    expect((await utils.readTemplateCache()).meta?.provider).toBe('github')
  })

  it('downloads template info from the resolved registry URL', async () => {
    const home = await createTempHome()
    const utils = await loadUtils(home)
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          name: 'demo-template',
          label: 'Demo',
          value: 'demo-template',
          tar: 'https://example.com/demo-template.tar.gz',
          defaultDir: 'demo-template',
        },
      ],
    })

    vi.stubGlobal('fetch', fetchMock)

    const data = await utils.downloadTemplateInfo({
      provider: 'gitlab',
      repo: 'team/template-infos',
      branch: 'main',
      file: 'templates.json',
      resolvedUrl: 'https://gitlab.com/team/template-infos/-/raw/main/templates.json',
    })

    expect(fetchMock).toHaveBeenCalledWith('https://gitlab.com/team/template-infos/-/raw/main/templates.json')
    expect(data).toEqual({
      'demo-template': {
        name: 'demo-template',
        label: 'Demo',
        value: 'demo-template',
        tar: 'https://example.com/demo-template.tar.gz',
        defaultDir: 'demo-template',
      }
    })
  })
})