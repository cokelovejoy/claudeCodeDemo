const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

// 中间件
app.use(cors());
app.use(express.json());

// 全局计数（内存存储，可轻松替换为 Redis）
let takeoffCount = 0;

// 存储所有连接的客户端
const clients = new Set();

// WebSocket 连接处理
wss.on('connection', (ws) => {
  console.log('新客户端连接');

  // 将新客户端添加到集合
  clients.add(ws);

  // 立即发送当前计数给新连接的客户端
  ws.send(JSON.stringify({
    type: 'UPDATE_COUNT',
    count: takeoffCount
  }));

  // 监听客户端消息（可选，用于心跳等）
  ws.on('message', (message) => {
    console.log('收到消息:', message.toString());
  });

  // 处理连接关闭
  ws.on('close', () => {
    console.log('客户端断开连接');
    clients.delete(ws);
  });

  // 处理错误
  ws.on('error', (error) => {
    console.error('WebSocket 错误:', error);
    clients.delete(ws);
  });
});

// 广播函数：向所有在线客户端发送消息
function broadcastCount() {
  const message = JSON.stringify({
    type: 'UPDATE_COUNT',
    count: takeoffCount
  });

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });

  console.log(`广播更新: 当前起飞人数 ${takeoffCount}`);
}

// REST API: 处理起飞请求
app.post('/api/takeoff', (req, res) => {
  try {
    // 原子性地增加计数
    takeoffCount++;

    console.log(`起飞请求处理成功，当前计数: ${takeoffCount}`);

    // 广播更新给所有客户端
    broadcastCount();

    // 返回成功响应
    res.json({
      success: true,
      count: takeoffCount
    });
  } catch (error) {
    console.error('起飞请求处理失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 健康检查接口
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    count: takeoffCount,
    clients: clients.size
  });
});

// 重置计数接口（开发调试用）
app.post('/api/reset', (req, res) => {
  takeoffCount = 0;
  broadcastCount();
  res.json({
    success: true,
    count: takeoffCount
  });
});

// 启动服务
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`WebSocket 服务运行在 ws://localhost:${PORT}/ws`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号，开始优雅关闭...');

  // 关闭所有 WebSocket 连接
  clients.forEach((client) => {
    client.close();
  });

  // 关闭服务器
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});
