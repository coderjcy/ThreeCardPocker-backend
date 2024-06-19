import http from "http";
import { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import { PUBLIC_KEY } from "../app/config.js";
import { URLSearchParams } from "url";
import roomController from "../controller/room.controller.js";
import errorTypes from "../constants/error-types.js";
const useWebSocket = (app) => {
  const server = http.createServer(app.callback());
  const wss = new WebSocketServer({ server });
  wss.on("connection", (ws, request, client) => {
    // 心跳包
    ws.on("message", (data) => {
      data = JSON.parse(data);
      if (data !== "ping") return;
      ws.send(JSON.stringify("pong"));
    });
    const parmas = new URLSearchParams(request.url.replace("/?", "?"));
    const token = parmas.get("token");
    const roomId = parmas.get("roomId");
    try {
      const userInfo = jwt.verify(token, PUBLIC_KEY, { algorithms: ["RS256"] });
      if (!roomId) roomController.create(userInfo);
      else roomController.join(userInfo.id, roomId, ws);
    } catch (err) {
      console.log(`output->err`, err);
      ws.send(errorTypes.UNAUTHORIZATION);
    }
  });
  return server;
};

export default useWebSocket;
