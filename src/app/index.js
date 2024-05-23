import dotenv from "dotenv";
import bodyParser from "koa-bodyparser";
import Koa from "koa";
import cors from "@koa/cors";
import regisetrRouters from "../router/index.js";
import errorHandler from "./error-handle.js";
import useWebSocket from "../socket/index.js";

dotenv.config();

const app = new Koa();
app.use(cors());
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    console.log("catch error:", error);
  }
});
app.use(bodyParser());
regisetrRouters(app);
app.on("error", errorHandler);

const server = useWebSocket(app);

export default server;
