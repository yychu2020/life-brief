# 生活折页

生活折页是一份可以自己填写、回看和导出的阶段手记。打开网页后，从一件眼下在意的事写起，再按需要补充个人档案、阶段复盘、支持网络、技能和财务。完成后可下载 Markdown 手记，每月收支也可单独导出 CSV。

## 填写内容的隐私

填写、计分和导出在浏览器内完成。网站不要求登录，不收集或上传问卷答复，也不接入访客统计。草稿保存在当前浏览器的本地存储里，共用同一个浏览器账号的人可能看到草稿。下载、复制和分享由填写者自行操作。GitHub Pages 会记录访问网页的 IP 地址，详见 [GitHub Pages 数据收集说明](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages#data-collection)。

建议和问题可以在仓库的 Issues 中公开提交。描述功能、操作步骤和期望结果即可，请省略手记正文、财务金额、健康信息和联系方式。页面中的支付宝二维码用于自愿支持，所有填写和导出功能均可免费使用。

## 本地打开

把文件放在同一个目录中，保留 `assets` 子目录，用浏览器打开 `index.html`。

## 发布到 GitHub Pages

1. 在自己的 GitHub 账号下新建公开仓库，例如 `life-brief`。
2. 将本目录内的文件和 `assets` 目录原样上传到 `main` 分支的根目录。
3. 在仓库的 **Settings → Pages** 中选择 **Deploy from a branch**，分支选 **main**，目录选 **/ (root)**，保存。
4. 部署成功后，复制 **Settings → Pages** 显示的访问地址分享。网页面向所有访客开放，建议反馈提交在该仓库的 Issues 中。

[GitHub Pages 发布说明](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
