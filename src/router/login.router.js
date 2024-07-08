import KoaRouter from "koa-router";
import loginController from "../controller/login.controller.js";
import {
  verifyLogin,
  verifySignUp,
  generateCode,
  verifyEmail,
  verifyReset,
} from "../middleware/login.middleware.js";
const loginRouter = new KoaRouter({ prefix: "/login" });

loginRouter.post("/", verifyLogin, loginController.asignToken);
loginRouter.post("/sign-up", verifySignUp, loginController.signUp);
loginRouter.post("/reset/code", verifyEmail, generateCode, loginController.sendCode);
loginRouter.post("/reset", verifyReset, loginController.resetPassword);

export default loginRouter;
