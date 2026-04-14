# c-copy

c-copy 是一个基于 citty 和 giget 的命令行工具，用来从远程模板注册表快速生成本地项目。注册表可以放在 GitHub、GitLab、Gitee 或任意可访问的原始文件 URL 上，CLI 会把模板清单缓存到本机，并统一处理模板选择、下载、更新和清理。

## 功能特性

- 支持从 GitHub、GitLab、Gitee 或直接 URL 加载模板注册表
- 首次使用自动拉取模板注册表并缓存到 ~/.ccopyrc
- 支持交互式模板选择，也支持命令行直接指定模板
- 支持在 create 命令中通过 URL 直接下载模板
- 支持通过 download 命令直接从 URL 下载模板到指定目录
- 支持离线模式，复用 giget 的本地缓存
- 切换注册表来源时会自动刷新缓存，避免误用旧模板
- 提供 download、show、update、clean 命令管理模板缓存和直连下载
- 同时提供 c-copy 和 create-copy 两个命令名

## 环境要求

- 安装和运行 CLI：Node.js >= 22.9（与 package.json 中的 engines.node 保持一致）
- 开发和运行测试：Node.js >= 22.12（当前开发工具链需要更高的补丁版本；如果只是使用 CLI，无需满足这一项）
- 建议使用 pnpm 或 npm 安装

## 安装

```bash
pnpm add -g create-copy
```

或：

```bash
npm install -g create-copy
```

安装后可以使用任一命令：

```bash
c-copy --help
create-copy --help
```

如果你要在 Node.js 中以代码方式调用这个包，请注意当前版本只提供 ESM 导出，不再提供 CommonJS 的 `require(...)` 入口。

## 快速开始

```bash
# 交互式选择模板，并使用模板名作为目录名
c-copy create

# 指定模板和项目目录
c-copy create -t vue3-template my-app

# 在指定目录下创建项目
c-copy create -t nuxt3-template --cwd ../workspace my-app

# 在 create 中直接从 URL 下载模板
c-copy create --url https://github.com/your-org/template.git my-app

# 直接从 URL 下载模板到指定目录
c-copy download --url https://github.com/your-org/template.git my-app

# 通过 pnpm 从子目录调用时，默认仍创建到命令发起目录
pnpm c-copy create -t vue3-template my-app
```

创建完成后，终端会提示进入目录并安装依赖：

```bash
cd my-app && pnpm install
```

## 命令说明

### create

创建一个新项目。

```bash
c-copy create [options] [name]
```

参数说明：

| 参数 | 说明 |
| --- | --- |
| name | 目标目录名，不传时默认使用模板名 |
| -u, --url <url> | 直接下载模板 URL，传入后会跳过注册表查找 |
| -t, --template <name> | 指定模板名；不传时进入交互选择 |
| -f, --force | 创建前刷新模板注册表，并强制刷新模板下载 |
| -o, --offline | 仅使用本地缓存，不发起网络请求 |
| --cwd <dir> | 指定项目生成目录；相对路径基于命令发起目录解析 |
| --logLevel <level> | 指定日志级别，支持 silent、fatal、error、warn、log、info、debug、trace、verbose 或数字级别 |
| -r, --registryUrl <url> | 直接指定模板注册表 URL |
| --registryProvider <provider> | 指定注册表提供方，支持 github、gitlab、gitee、url |
| --registryRepo <repo> | 指定注册表仓库路径，例如 xjccc-team/template-infos |
| --registryBranch <branch> | 指定注册表分支或 ref |
| --registryFile <file> | 指定注册表文件路径 |

说明：

- --force 和 --offline 不能同时使用
- --url 与 --template 不能同时使用
- --url 与任何 --registry* 参数不能同时使用
- 传入 --url 后，create 会跳过注册表缓存逻辑，直接下载目标 URL 内容
- 传入以 .tar.gz、.tgz、.zip 结尾的 URL 时，会按归档包直接下载
- 使用 --offline 时，本机必须已经存在 ~/.ccopyrc 和 giget 模板缓存
- 使用 --offline 时不能切换到另一个尚未缓存的注册表来源
- 目标目录已存在时，CLI 会提示是否继续，并在确认后清理该目录
- 如果当前注册表来源与缓存记录不一致，create 会自动刷新缓存后再创建项目
- 传入 --force 时，create 会刷新模板注册表，并把强制刷新标记透传给 giget 模板下载
- create 的默认基准目录是命令发起目录；通过 pnpm c-copy create 调用时会优先使用 INIT_CWD，其次使用 PWD，最后才回退到进程当前目录
- 未传入 name 时，会依次使用 --url 推导目录名、模板的 defaultDir 和模板 value 作为目标目录名

### download

从指定 URL 直接下载模板内容。

```bash
c-copy download --url <url> [options] [name]
```

参数说明：

| 参数 | 说明 |
| --- | --- |
| name | 目标目录名，不传时根据 URL 自动推导 |
| -u, --url <url> | 必填，直接下载的模板 URL |
| -f, --force | 下载前刷新模板内容 |
| -o, --offline | 仅使用 giget 本地缓存 |
| --cwd <dir> | 指定项目生成目录；相对路径基于命令发起目录解析 |
| --logLevel <level> | 指定日志级别，支持 silent、fatal、error、warn、log、info、debug、trace、verbose 或数字级别 |

说明：

- --force 和 --offline 不能同时使用
- 传入仓库 URL 时，会按 git 仓库形式下载
- 传入以 .tar.gz、.tgz、.zip 结尾的 URL 时，会按归档包直接下载
- 未传入 name 时，会优先从仓库名或归档所在仓库名推导目标目录

### show

查看本地缓存的模板注册表和其来源元信息。

```bash
c-copy show
```

### update

从远端模板注册表重新拉取最新配置，并更新到 ~/.ccopyrc。

```bash
c-copy update
```

`update` 同样支持 `--registryUrl`、`--registryProvider`、`--registryRepo`、`--registryBranch`、`--registryFile` 这些参数。

### clean

清理本地缓存的模板注册表和 giget 模板缓存。

```bash
c-copy clean
```

## 使用示例

```bash
# 使用交互模式创建项目
c-copy create

# 使用指定模板创建项目
c-copy create --template vue2-template demo-vue2

# 创建前刷新模板清单和模板内容
c-copy create -t vue3-template demo-vue3 --force

# 使用本地缓存离线创建
c-copy create -t nuxt3-template demo-nuxt --offline

# 使用 GitLab 上的注册表
c-copy create -t vue3-template demo-gitlab --registryProvider gitlab --registryRepo your-group/template-infos

# 使用 Gitee 上的注册表
c-copy create -t vue3-template demo-gitee --registryProvider gitee --registryRepo your-org/template-infos

# 使用直接 URL 作为注册表来源
c-copy update --registryUrl https://example.com/templates.json

# 在 create 中直接下载 Git 仓库模板
c-copy create --url https://github.com/your-org/template.git my-app

# 在 create 中直接下载归档模板
c-copy create --url https://github.com/your-org/template/archive/refs/heads/main.tar.gz

# 直接下载 Git 仓库模板
c-copy download --url https://github.com/your-org/template.git my-app

# 直接下载归档模板
c-copy download --url https://github.com/your-org/template/archive/refs/heads/main.tar.gz

# 查看当前缓存的模板列表
c-copy show

# 手动更新模板注册表
c-copy update

# 清理所有本地缓存
c-copy clean
```

## 模板注册表与缓存

默认注册表来源：

```text
https://raw.githubusercontent.com/xjccc-team/template-infos/main/templates.json
```

支持两种配置方式：

1. 通过命令参数临时切换
2. 通过环境变量设置默认值

可用环境变量：

| 变量名 | 说明 |
| --- | --- |
| C_COPY_REGISTRY_URL | 直接指定注册表 URL，优先级最高 |
| C_COPY_REGISTRY_PROVIDER | 注册表提供方，支持 github、gitlab、gitee |
| C_COPY_REGISTRY_REPO | 注册表仓库路径 |
| C_COPY_REGISTRY_BRANCH | 注册表分支或 ref |
| C_COPY_REGISTRY_FILE | 注册表文件路径 |

例如：

```bash
export C_COPY_REGISTRY_PROVIDER=gitlab
export C_COPY_REGISTRY_REPO=your-group/template-infos
export C_COPY_REGISTRY_BRANCH=main

c-copy create -t vue3-template my-app
```

注册表中的每一项通常包含以下字段：

| 字段 | 说明 |
| --- | --- |
| name | 模板名称，兼容 giget TemplateInfo，通常与 value 保持一致 |
| label | 交互选择时展示的名称 |
| value | 模板唯一标识，也是命令行里传给 --template 的值；未提供时会回退到 name |
| hint | 模板提示信息 |
| url | 模板仓库地址 |
| tar | 模板 tarball 下载地址 |
| source | 可选，自定义 giget 模板源，例如 gitlab:group/project |
| defaultDir | 可选，未传 name 时创建项目的默认目录名 |

下载模板时，c-copy 会按以下顺序选择下载源：

1. source
2. tar
3. url，会被当作 git 仓库地址转换成 giget 的 git:url 形式
4. 如果以上字段都不存在，回退到 github:xjccc-team/<template>

本地缓存位置：

- ~/.ccopyrc：模板注册表缓存，包含模板数据和注册表来源元信息
- ~/.cache/giget：giget 下载后的模板缓存

工作流程：

1. 执行 create 时，优先读取 ~/.ccopyrc
2. 如果本地没有缓存、传入 --force，或当前注册表来源与缓存记录不一致，会重新拉取远端模板注册表
3. 选择模板后，通过 giget 下载并解压模板内容
4. 模板缓存会保留在 ~/.cache/giget，供后续离线创建复用
5. 离线模式下只会使用与当前注册表配置匹配的缓存

如果你曾在旧缓存里遇到过类似 https://raw.githubusercontent.com/unjs/giget/main/templates/undefined.json 的请求错误，执行 c-copy update 即可重写 ~/.ccopyrc。当前版本会在读取缓存时自动忽略历史上遗留的 undefined 和 null 字符串值。

## 程序化调用

除了 CLI 之外，也可以在 ESM 环境里直接调用包导出的运行入口：

```ts
import { runCommand, runMain } from 'create-copy'

await runCommand('create', ['create', '--template', 'vue3-template', 'demo'])

runMain()
```

说明：

- 仅支持 ESM `import`
- 不支持 CommonJS `require('create-copy')`
- 构建产物默认输出 `dist/index.mjs` 和类型声明文件，不再生成 `dist/index.cjs`

## 开发

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm build
node ./bin/c-copy.mjs --help
```

## 致谢

- Vue
- vue-cli
- Nuxt
- UnJS