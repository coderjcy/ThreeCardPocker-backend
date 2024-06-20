import KoaRouter from "koa-router";
import roomController from "../controller/room.controller.js";
import { verifyAuth } from "../middleware/login.middleware.js";
const roomRouter = new KoaRouter({ prefix: "/room" });

roomRouter.get("/list", verifyAuth, roomController.list);
roomRouter.post("/create", verifyAuth, roomController.create);
roomRouter.get("/:roomId", verifyAuth, roomController.info);
roomRouter.post("/dissolve", verifyAuth, roomController.dissolve);

export default roomRouter;
