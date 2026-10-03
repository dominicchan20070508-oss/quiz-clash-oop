# Quiz Clash · OOP Battle（v2）

实时 **1v1 限时抢答对战**网页游戏：双方看到同一道**英文 OOP 四选一题目**，**谁先答对谁发动攻击并刷新题目**。5 个角色特效与技能名不同，但**基础伤害完全一致**。含连胜加成、能量技能、道具、表情包、音效音乐、二维码邀请、人机练习。

- ruleset_id：`quizclash-2.0.0`
- 技术：Node.js 内置 `http`（**零 npm 依赖**；二维码库为离线 MIT 前端库）+ 原生 HTML/CSS/JS（面向对象）
- 联机：SSE 下行 + POST 上行，服务器权威裁决（血量/连胜/能量/技能/道具/伤害）

---

## 一、运行

```powershell
cd D:\QuizClash
npm start          # 或 node server.js
```
控制台打印：
- 本机：`http://localhost:3000`
- 局域网：`http://<你的局域网IP>:3000`

> 直接双击 `public\index.html` 不能联机；联机必须经上面的服务器地址。
> 不开第二台设备时点「Practice vs AI」即可玩完整一局。

---

## 二、玩法

1. **Create Room**：输入昵称、选角色 → 创建；大厅显示 **6 位房间号、二维码、邀请链接（可复制）**。
2. 队友：**手机扫二维码**（同 Wi-Fi）/ 打开邀请链接 / 主页手动输入房间号加入。
3. 双方 **Ready** → 房主 **Start**。
4. **Practice vs AI**：与电脑对战，AI 会抢答、偶尔用技能/发表情。

### 一台电脑自测
打开两个标签都访问 `http://localhost:3000`：标签 1 创建，标签 2 用房间号/链接加入，准备开战。

---

## 三、规则与数值

| 项目 | 规则 |
|---|---|
| 血量 | 双方各 **300** |
| 基础伤害 | 每次先答对扣 **12**（全角色相同） |
| 至少题数 | **第 20 题前致命伤害钳制为 HP≥1**，保证至少答到 20 题 |
| 连胜加成 | 连续答对每次 +2、封顶 +12（12→24）；自己答错清零，超时双方清零 |
| 每题限时 | 10 秒（最后 3 秒有 tick 音） |
| 答错 | 立即红色「Incorrect!」提示并**本题锁定**，对方仍可抢答 |
| 双方都错 / 超时 | **双方都不攻击、不扣血**，进入下一题 |
| 结算 | 动态胜利（金色光束+彩带）/ 失败（压暗+余烬）画面，可 Rematch |

### 技能 Power Surge
- 能量每答对 +25，充满（4 次）且不在冷却时可激活；使**下一次答对造成 2 倍伤害**，随后 12s 冷却；激活后答错则 buff 作废。

### 道具（每 3 次答对随机获得）
- **🛡️ Shield**：自动抵消下一次伤害（可叠 2）。
- **🔍 Insight**：当前题去掉两个错误选项。
- **🧰 Repair Kit**：立即回 40 HP。

### 表情包 / 音效
- 表情面板 8 个，发送后在己方角色旁弹出并同步给对方。
- Web Audio 合成音效 + chiptune 背景音乐；左上角按钮静音（偏好本地保存）。

---

## 四、五个角色（等伤害，差异化表现）

| 角色 | 攻击 / 技能 | 特效 |
|---|---|---|
| Ignis · Pyromancer | Fireball / Inferno Overload | 火球拖尾、火焰爆裂 |
| Volt · Thunderblade | Thunder Slash / Thunder Drive | 折跃电弧、雷光炸裂 |
| Frost · Ice Archer | Frost Arrow / Frost Barrage | 冰晶碎裂、寒气扩散 |
| Nightblade · Shadow Assassin | Shadow Strike / Shadow Eclipse | 紫烟缠绕、暗影爆开 |
| Terra · Stoneguard | Boulder Toss / Tectonic Slam | 碎石飞溅、震屏最强 |

---

## 五、文件结构

```
D:\OOPgame\
  └─ QuizClash-游戏设计提示词.md      主提示词 / 设计规格（含 v2 附录，已保留）

D:\QuizClash\
  ├─ server.js                        零依赖服务器：静态 + SSE + 权威对局
  ├─ package.json · README.md
  └─ public\
     ├─ index.html
     ├─ css\styles.css
     └─ js\
        ├─ config.js                  CONFIG 数值 + 角色/道具/表情（前后端共享）
        ├─ questions.js               73 道英文 OOP 题（前后端共享）
        ├─ transport.js               SSE + POST 网络层
        ├─ fighter.js                 立绘 SVG + 粒子/震屏
        ├─ audio.js                   Web Audio 音效 + BGM
        ├─ game.js                    状态机 + 各屏 + 人机 LocalMatch
        └─ vendor\qrcode.js           离线二维码库（MIT）
```

## 六、覆盖与限制

**已覆盖**：创建/加入房间、房间号 + 二维码 + 邀请链接复制、选角/准备/开始、英文 OOP 题库、即时正确/错误反馈与锁定、连胜加成、能量技能与冷却、三类道具、表情包、音效音乐、动态胜负、Rematch、人机练习、掉线/离开提示。

**暂未包含**：公网部署（当前为本机/局域网；外网对战需内网穿透或部署到服务器）、排位/账号/好友/文字聊天、原生 App。
> 网络层封装在 `transport.js`，可平滑替换为 WebSocket / WebRTC。
