# c-copy 通过命令行创建模版项目

[模版地址](https://github.com/xjccc-team/template-infos/blob/main/templates.json)


> 默认会在 根目录 `/User/xxx/c-copy/c-copy.json` 存储一个json文件

## install

```bash
pnpm install create-copy -g
```


## usage

```bash
# 创建模版
c-copy create --template vue2-template
# 创建时使用最新json数据
c-copy create --template vue2-template -f
# 下载到对应目录
c-copy create --template vue2-template --cwd ../../example

```

# respect

1. Vue
2. vue-cli
3. Nuxt
4. UnJS