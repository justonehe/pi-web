# pi-web（个人分支）

本项目 fork 自 [agegr/pi-web](https://github.com/agegr/pi-web)（pi coding agent 的本地 Web UI，上游本体是 [badlogic/pi-mono](https://github.com/badlogic/pi-mono)），基线版本为上游 **5158faf**（Pi Web 0.8.7 / pi-coding-agent 0.84）。

## 与原版的区别

### 1. 非视觉模型图片支持

**上游行为**：图片以 base64 附加到消息中发送；当模型不支持视觉时，图片被 pi-ai 静默替换为文本占位符（`(image omitted: model does not support images)`），模型完全看不到图片，上传功能形同虚设。

**本分支行为**：

- `/api/models` 为每个模型返回 `supportsImages` 字段（由模型 `input` 模态派生），前端可据此判断模型能力。
- 发送消息时，若当前模型不支持视觉，图片先写入系统临时目录（`pi-web-<uuid>.<ext>`），消息内容改为文件路径文本——与 pi TUI 粘贴剪贴板图片的行为一致，模型可调用 `read` / OCR 工具读取图片内容。
- 对话窗口仍将该路径渲染为图片（通过新增的 `/api/image-file` 接口，该接口只允许读取临时目录内的图片文件，拒绝任意路径访问）。
- 支持视觉的模型行为完全不变（仍以 base64 图片块发送）。

### 2. `/tree` 会话树导航

- 新增 `/tree` 命令：打开完整会话树对话框，支持搜索、从任意已保存节点继续、以及选择是否生成分支摘要。
- 与侧边栏的分支导航（BranchNavigator）联动。

### 3. 其他

- README 已精简为本文件，不保留上游原始文档（上游 README 可用 `git show origin/main:README.md` 查看）。
- 已合并上游 v0.8.9（pi-coding-agent 0.84.2）。

## 运行

```bash
npm install
npm run dev        # 开发模式，端口 30141
```

生产模式（先构建再启动）：

```bash
npm run build
npx pi-web --no-open
```

## 同步上游

上游后续更新可通过 `git fetch` 后 rebase 到本分支：

```bash
git remote add upstream https://github.com/agegr/pi-web.git
git fetch upstream
git rebase upstream/main
```

See [AGENTS.md](./AGENTS.md) for the architecture notes and detailed file map.

## License

[MIT](./LICENSE)
