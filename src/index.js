import Koa from "koa";
import http from "http";
import WebSocket, { WebSocketServer } from "ws";
import Router from "koa-router";

const app = new Koa();
const router = new Router();

router.get("/", (ctx) => {
  ctx.body = "服务已启动!";
});
app.use(router.routes());
app.use(router.allowedMethods());

const server = http.createServer(app.callback());
const wss = new WebSocketServer({ server });
wss.on("connection", (ws) => {
  console.log(`output->ws.id`, ws.id);

  wss.clients.forEach((client) => {
    if (client !== ws && client.readyState === WebSocket.OPEN)
      client.send("有新用户加入, 当前在线人数: " + wss.clients.size);
  });
  ws.on("message", (message) => {
    const data = JSON.parse(message);
    console.log(`收到消息:`, data);
    if (data.state === "ready") {
      console.log(`output->message`, msg);
    }
  });
  ws.on("close", () => {
    wss.clients.forEach((client) => client.send("有用户退出, 当前在线人数: " + wss.clients.size));
  });
});
server.listen(8000, () => {
  console.log(`启动成功`);
});
