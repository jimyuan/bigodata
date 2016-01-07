# BigoData Admin platform

## 运行环境
nodejs ，依赖以下2个工具：
  - __bower__ 前端资源包管理工具 `npm install -g bower`
  - __gulp__ 自动化工具 `npm install -g gulp`

## 项目启动
以上工具具备后，第一次运行，执行 `npm install  && bower install` 初始化项目，
  - 启动项目：`gulp`
  - 项目打包：`gulp build`，最终代码打包在 release 文件夹中。

注：如要执行 `gulp test` 对 scss 代码进行 test， 则还需附加安装 scss-lint 的 gem 包（ ruby  环境）。
