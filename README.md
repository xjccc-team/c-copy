# c-copy 通过命令行创建模版项目

[模版地址](https://github.com/xjccc-team/template-infos/blob/main/templates.json)


> 第一次获取json默认数据，会生成一个`__temp__`文件夹（用完即删），根目录 `/User/xxx/.ccopyrc` 存储json数据

## install

```bash
pnpm install create-copy -g
```


## usage

c-copy create [OPTIONS] [NAME]

```bash
# 显示存储json信息 .ccopyrc
c-copy show
# 创建模版
c-copy create xxx
c-copy create --template vue2-template xxx
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