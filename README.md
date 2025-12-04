# 实时起飞人数小程序

基于 Taro 3 + React + Node.js + WebSocket 实现的实时计数微信小程序。

## 功能特性

- **实时同步**：通过 WebSocket 实现所有客户端实时数据同步
- **原子性操作**：后端使用内存变量保证计数原子性（可轻松替换为 Redis）
- **断线重连**：前端自动重连机制，最多尝试 5 次
- **状态管理**：完整的连接状态显示和错误处理
- **用户体验**：流畅的动画效果和友好的交互提示

## 技术栈

### 后端
- Node.js + Express
- WebSocket (ws 库)
- CORS 中间件

### 前端
- Taro 3
- React (Hooks)
- TypeScript
- SCSS

## 项目结构

```
claudeCodeDemo/
├── backend/
│   ├── server.js           # Express + WebSocket 服务
│   └── package.json        # 后端依赖
└── src/
    ├── app.config.ts       # Taro 应用配置
    ├── pages/
    │   └── index/
    │       ├── index.tsx   # 主页面
    │       └── index.scss  # 页面样式
    └── utils/
        └── socket.ts       # WebSocket 封装
```

## 快速开始

### 1. 安装依赖

**后端：**
```bash
cd backend
npm install
```

**前端：**
```bash
npm install
```

### 2. 启动后端服务

```bash
cd backend
npm start
```

服务将运行在：
- HTTP: http://localhost:3000
- WebSocket: ws://localhost:3000/ws

### 3. 启动前端开发

**微信小程序：**
```bash
npm run dev:weapp
```

**H5（浏览器调试）：**
```bash
npm run dev:h5
```

### 4. 配置开发工具

1. 打开微信开发者工具
2. 导入项目目录中的 `dist` 文件夹
3. 在开发工具中勾选"不校验合法域名"（开发阶段）

## API 接口

### REST API

#### 起飞接口
```
POST /api/takeoff
```

**响应：**
```json
{
  "success": true,
  "count": 123
}
```

#### 健康检查
```
GET /api/health
```

**响应：**
```json
{
  "status": "ok",
  "count": 123,
  "clients": 5
}
```

#### 重置计数（调试用）
```
POST /api/reset
```

### WebSocket

#### 连接地址
```
ws://localhost:3000/ws
```

#### 消息格式
```json
{
  "type": "UPDATE_COUNT",
  "count": 123
}
```

## 生产部署

### 后端部署

1. **配置环境变量**
```bash
export PORT=3000
export NODE_ENV=production
```

2. **使用 PM2 运行**
```bash
npm install -g pm2
pm2 start backend/server.js --name takeoff-server
```

### 前端部署

1. **修改配置**

在 `src/pages/index/index.tsx` 中修改：
```typescript
const API_BASE_URL = 'https://your-domain.com'
const WS_URL = 'wss://your-domain.com/ws'
```

2. **配置合法域名**

在微信小程序后台配置：
- request 合法域名：`https://your-domain.com`
- socket 合法域名：`wss://your-domain.com`

3. **构建发布**
```bash
npm run build:weapp
```

## 开发说明

### 扩展为 Redis 存储

修改 `backend/server.js`：

```javascript
const redis = require('redis');
const client = redis.createClient();

// 替换全局变量
// let takeoffCount = 0;

// 起飞接口中使用 Redis
app.post('/api/takeoff', async (req, res) => {
  try {
    // 原子性增加
    const count = await client.incr('takeoff:count');

    broadcastCount(count);

    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

### 添加用户认证

可以在 WebSocket 连接时验证用户身份：

```javascript
wss.on('connection', (ws, req) => {
  const token = new URL(req.url, 'ws://localhost').searchParams.get('token');

  // 验证 token
  if (!isValidToken(token)) {
    ws.close(1008, 'Unauthorized');
    return;
  }

  // ... 其他逻辑
});
```

## 常见问题

### 1. WebSocket 连接失败

**解决方案：**
- 确保后端服务已启动
- 检查防火墙设置
- 微信开发工具勾选"不校验合法域名"

### 2. 数据不同步

**解决方案：**
- 检查 WebSocket 连接状态
- 查看浏览器/开发工具控制台日志
- 确认后端广播函数正常工作

### 3. 生产环境无法连接

**解决方案：**
- 必须使用 HTTPS 和 WSS 协议
- 在微信后台配置合法域名
- 确保服务器支持 WebSocket 升级

## License

MIT