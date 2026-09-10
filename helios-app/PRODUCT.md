# Helios Space — 文艺风 Social Collaboration 产品方案

> 目标：把 Helios 打磨成一个**真正的产品** —— 高端、半透明、有回弹的 **Social Collaboration Space**。  
> 不是 Office 套件，不是学习仪表盘，不是 hobbies 游乐园。

本文是实施蓝图。落地顺序：先定语言 → 砍功能 → 换皮肤 → 打磨 Lifestyle → 统一交互。

---

## 1. 产品一句话

**Helios 是一个带 Liquid Glass 质感的社交协作空间：发动态、私信、实时协作；少数几个创作工具陪你做事。**

类比心智：

| 模块 | 像谁 | Helios 做法 |
|------|------|-------------|
| Lifestyle | Instagram + X | 高端信息流：图文、开播帖、点赞评论转发 |
| Messages | iMessage | 干净气泡私信 / WorkBuddy |
| Apps | 极少创作工具 | **个位数** Mini Apps，没有科目/爱好目录 |
| Home | 轻入口 | 最近文件 + 在线 WorkBuddy，不是仪表盘 |

---

## 2. 设计语言（独特，不要 M365 / 不要 AI 紫光）

融合三股气质：

1. **Apple Liquid Glass** — 毛玻璃、柔边、折射高光、按压缩放回弹  
2. **Codex 半透明灰** — 冷灰雾面层、logo 级克制、工具感但不冷漠  
3. **Claude × Gemini 色感** — 暖杏/陶土与柔和青蓝的高级对比，拒绝霓虹紫

### 色板（语义 token）

| Token | 方向 |
|-------|------|
| `--glass-bg` | `rgba(255,255,255,0.55)` / 深色态 `rgba(28,28,30,0.55)` |
| `--glass-stroke` | `rgba(255,255,255,0.35)` + 内高光 |
| `--helios-bg` | 雾灰米 `#f4f1ec` → 渐变到浅青雾 |
| `--helios-surface` | 半透明白玻璃 |
| `--helios-text` | 墨色 `#1c1917` |
| `--helios-muted` | 石灰 `#78716c` |
| `--helios-accent` | Claude 暖陶 `#c96442` |
| `--helios-accent2` | Gemini 柔青 `#5b8def` |
| `--helios-logo` | Codex 半透明灰标 + 细描边 |

### Liquid Glass 按钮

- 外观：毛玻璃底 + 细描边 + 顶部 1px 高光  
- 交互：**按下缩小 → 松开弹性回弹**（spring / bounce，约 180–280ms）  
- 全局 class：`.liquid-glass-btn`  
- 减少动态时：仅透明度变化，不做位移弹跳  

### Logo

- 保留 Helios 字标，改成 **半透明灰玻璃徽**（Codex 感）  
- 不用发光球、不用轨道动画当日常壳  

### 文艺风原则

- 少字、大留白、一张图顶一块文案  
- 标题用有气质的衬线或精致无衬线（避免 Inter 默认感）  
- 不用「科目 / Hobbies / Solar / 仪表盘」口吻  

---

## 3. 信息架构（极简）

只留 **4 个主入口**：

1. **Space（原 Lifestyle）** — Instagram/X 级社交主场  
2. **Messages** — WorkBuddy 私信  
3. **Create（原 Apps）** — 个位数 Mini Apps  
4. **Me** — 账号与设置  

Home 可并入 Space 顶部（「为你 / 关注 / 开播」），或保留极简 Home 作为「此刻」。  
**删除心智**：Explore、Spaces、Hobbies、Subjects 迷宫、独立 Live/Projects 页。

---

## 4. Lifestyle → 高端社交媒体（Instagram × X）

改名对用户可仍叫 **Lifestyle**，产品定义为 **Space Feed**。

### 必须像

- 双栏或居中信息流（桌面），手机全宽卡片  
- 顶部：为你 / 关注  
- 发帖：图文、链接文件、**开播协作帖**  
- 互动：赞、评、转发/引用、关注  
- 开播 = 一条带「Live」状态的帖，点进去加入协作（无独立 Live 页）

### 不要像

- 分类 pill 一大排（Coding / Study / Activity…）  
- Solar 身份、科目标签墙  
- 仪表盘式侧栏塞满统计  

### UI 简化清单

- [ ] 去掉科目/爱好过滤器，改成简洁话题或不要过滤  
- [ ] Composer 变轻：写一句话 + 配图 + 开播  
- [ ] 帖子卡片：头像、名字、正文、媒体、动作条 —— 干净留白  
- [ ] 玻璃顶栏 + 回弹发帖按钮  

---

## 5. Mini Apps：个位数，服务社交协作

### 保留（建议 5 个）

| App | 名字 | 小姐姐 | 为什么留 |
|-----|------|--------|----------|
| write | 墨语 | 小墨 | 写长文、发帖底稿 |
| notes | 随身本 | 小本 | 轻笔记 |
| sheet | 格间 | 小格 | 偶尔表格（公式保留基础） |
| board | 今日事 | 小办 | 协作待办 |
| code | 搭子码 | 小码 | 并排 Helios 的轻 IDE |

### 删除 / 不再主推

- 光幕（幻灯片）— 非社交协作刚需，先下架主网格  
- 记卡 — 学习工具，不符合社交空间主叙事  
- 一切 Hobbies / Subjects 目录入口、巨大 catalog  

旧文件仍可通过 legacy alias 打开，但 **Create 网格只显示上表 5 个**。

### Create 页 UI

- 大玻璃磁贴，每格：图标 + 名字 + 小姐姐一行提示  
- 无「Orbit 解锁墙」、无「Included / Orbit suite」分区  
- 一句话副标：*「创作，然后分享到 Space」*

---

## 6. 功能简化原则

| 留 | 砍 / 藏 |
|----|---------|
| 发帖、关注流、开播帖 | 科目 Space、Hobbies、Explore |
| Messages、邀请 WorkBuddy | Chat Hub 多 tab 复杂度 |
| 5 个 Create apps | 几十个 mini lab |
| Helios 文件预览搭子 | AI 炫光浮动球话术 |
| 基础公式 / 易写文档 | 重度 Office 功能墙 |

**规则**：找得到就要能用；用不到的不占第一屏。

---

## 7. 实施切片（本轮）

### A. 方案文档 ✅（本文）

### B. 设计系统

- [x] `index.css`：Claude/Gemini 色 + glass token  
- [x] `.liquid-glass-btn` + spring 回弹  
- [x] Logo 半透明灰玻璃化  

### C. 导航与文案

- [x] 四入口壳：Space / Messages / Create / Me（或 Home+Space）  
- [x] 去掉 Hobbies / Subjects 主路径  

### D. Mini Apps

- [x] `miniApps.ts` 只导出 5 个  
- [x] Create 页去掉计费分区与冗余 copy  

### E. Lifestyle

- [x] Instagram/X 布局与玻璃发帖条  
- [x] 简化分类；强化开播帖  

### F. 验证

- [x] `npm run build && npm run lint && npm run test:api`  

---

## 8. 成功标准

1. 陌生人 10 秒内知道：这是社交协作空间，不是学习后台。  
2. Create 里肉眼可数的 App（≤ 9，目标 5）。  
3. 主按钮有 Liquid Glass 回弹，色调接近 Claude/Gemini，灰玻璃像 Codex。  
4. Lifestyle 信息流气质接近高端 IG/X，无 hobbies 迷宫。  
5. 部署后可当「真产品」演示，而不是概念拼盘。  

---

## 9. 与旧文档关系

- 旧 [`REDESIGN.md`](./REDESIGN.md) 记录了「简化协作 / WorkBuddy」阶段。  
- **本文覆盖视觉与产品定位**：从 M365-simple 升级为 **文艺 Liquid Glass Social Space**。  
- 实施以本文为准；REDESIGN 中与本文冲突的（如强 M365 蓝、七工具学习向）以本文优先。
