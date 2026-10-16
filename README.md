# 地球守护计划 · EARTHKEEPER

一款可离线运行的中文地球策略小游戏。旋转真实地形的 3D 地球，选择行动区域，实施生态干预，观察气候、森林、海洋和能源指标变化；目标是在 20 年结束时把地球生命力保持在 **75 分及以上**。

## 立即开始（桌面版）

**双击本文件夹的 `index.html`**，即可在 Chrome 中游玩。无需安装、登录、服务器或联网（网页字体联网时可选加载，离线会自动使用系统字体）。不要只复制 `index.html`：旁边的 `app.js`、`style.css` 和 `assets/` 也需要保留。

- 鼠标拖动地球旋转、滚轮缩放，点击地球选择目标区域；区域行动效果提高 20%。手机上可触控旋转和点击。
- 选择「植树 / 清洁能源 / 海洋修复 / 绿色城市」，选择力度，点击「实施行动」。力度越大，效果与资源消耗越高。
- 「推进一年」会获得 18 资源，地球也会依模拟规则自然变化。行动记录、指标、游戏进度实时更新。浏览器刷新后会自动续玩。
- 第 20 次推进会结算；「重新开始」可清除当前游戏进度。

> 游戏数值属于**简化的策略模拟模型**，不是真实世界预测。

## 直接上传 GitHub → Cloudflare Pages

本文件夹本身就是**静态网站根目录**，不用 npm、构建脚本、后端服务，也不需要上传 zip。

1. 登录你自己的 GitHub，在账号 **owdnys** 下新建一个空仓库，例如 `earthkeeper`。上传本文件夹**内部的全部内容**到仓库根目录（`index.html` 必须在仓库根目录，不要再套一层文件夹）；或把整个文件夹作为本地 Git 仓库推送。`assets/` 与 `_headers` 一起上传。
2. 在 Cloudflare 控制台打开 **Workers & Pages → Create → Pages → Connect to Git**，连接上述仓库。
3. 构建设置选 **Framework preset: None**、**Build command: 留空**、**Build output directory: `/`（仓库根目录）**，保存并部署。部分界面要求输入目录时填 `.`，与根目录等价；不要填写 `dist` 或 `public`。
4. 部署结束访问 Cloudflare 分配的 `*.pages.dev` 地址，检查能看到地球并可实施行动。以后向 GitHub 仓库提交更新会自动重新部署。

> Cloudflare Pages 若选择「Direct Upload」而非 Git 集成，也可上传整个文件夹的内容；但那不会自动跟随 GitHub 更新。这里提供的是可以直接导入 GitHub 再与 Cloudflare 对接的成品，**尚未代你登录账号或发布上线**。

## 文件一览

| 文件 | 用途 |
| --- | --- |
| `index.html` | 双击打开的游戏入口 / Pages 根页 |
| `style.css` | 响应式界面样式 |
| `app.js` | 地球绘制、交互与游戏规则 |
| `assets/three.min.js` | 离线 3D 引擎 Three.js |
| `assets/d3-array.min.js`、`assets/d3-geo.min.js` | 离线地理投影辅助库 |
| `assets/land.js` | Natural Earth 世界陆地轮廓（由 world-atlas 转换） |
| `assets/icon.svg` | 图标 |
| `_headers` | Cloudflare Pages 静态安全响应头 |

第三方库和数据的许可见 `assets/THREE-LICENSE.txt`、`assets/D3-LICENSE.txt`、`assets/D3-ARRAY-LICENSE.txt`、`assets/TOPOJSON-LICENSE.txt`、`assets/WORLD-ATLAS-LICENSE.txt`、`assets/ATTRIBUTION.md`。游戏源代码可以修改并发布；请保留这些第三方声明。
