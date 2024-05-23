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
    const parmas = new URLSearchParams(request.url.replace("/?", "?"));
    const token = parmas.get("token");
    const roomId = parmas.get("roomId");

    try {
      const userInfo = jwt.verify(token, PUBLIC_KEY, { algorithms: ["RS256"] });
      userInfo.ws = ws;
      if (!roomId) roomController.create(userInfo);
      else roomController.join(userInfo, roomId);
    } catch (err) {
      console.log(`output->err`, err);
      ws.send(errorTypes.UNAUTHORIZATION);
    }

    // ws.on("message", (message) => {
    //   console.log(`output->message`, message);
    // });
  });
  return server;
};

export default useWebSocket;
