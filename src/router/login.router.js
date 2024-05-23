import KoaRouter from "koa-router";
import loginController from "../controller/login.controller.js";
import { verifyLogin } from "../middleware/login.middleware.js";
const loginRouter = new KoaRouter({ prefix: "/login" });

loginRouter.post("/", verifyLogin, loginController.asignToken);

export default loginRouter;
