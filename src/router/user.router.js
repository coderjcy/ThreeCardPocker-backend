import KoaRouter from "koa-router";
import userController from "../controller/user.controller.js";
import { verifyAuth } from "../middleware/login.middleware.js";

const userRouter = new KoaRouter({ prefix: "/user" });

userRouter.get("/friends", verifyAuth, userController.queryFriends);
userRouter.get("/:id", verifyAuth, userController.queryUserInfoById);
userRouter.get("/charge", verifyAuth, userController.chargeBalance);

export default userRouter;
