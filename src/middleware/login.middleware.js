import jwt from "jsonwebtoken";
import errorTypes from "../constants/error-types.js";
import userService from "../service/user.service.js";
import md5password from "../utils/password-handle.js";
import { PUBLIC_KEY } from "../app/config.js";
import loginService from "../service/login.service.js";

const verifyLogin = async (ctx, next) => {
  const { username, password } = ctx.request.body;
  if (!username || !password)
    return ctx.app.emit("error", errorTypes.NAME_OR_PASSWORD_IS_REQUIRED, ctx);
  const userInfo = await userService.queryUserByUserName(username);
  if (!userInfo) return ctx.app.emit("error", errorTypes.USER_DOES_NOT_EXISTS, ctx);
  if (md5password(password) !== userInfo.password)
    return ctx.app.emit("error", errorTypes.PASSWORD_IS_INCORRENT, ctx);
  ctx.userInfo = userInfo;

  await next();
};
const verifySignUp = async (ctx, next) => {
  const { username, password, email } = ctx.request.body;
  if (!username || !password)
    return ctx.app.emit("error", errorTypes.NAME_OR_PASSWORD_IS_REQUIRED, ctx);
  if (!email) return ctx.app.emit("error", errorTypes.EMAIL_IS_REQUIRED, ctx);
  const userInfo = await userService.queryUserByUserName(username);
  if (userInfo) return ctx.app.emit("error", errorTypes.USER_ALREADY_EXISTS, ctx);
  const userInfo2 = await userService.queryUserInfo("email", email);
  if (userInfo2) return ctx.app.emit("error", errorTypes.EMAIL_ALREADY_EXISTS, ctx);
  ctx.request.body.md5password = md5password(password);
  await next();
};
const verifyAuth = async (ctx, next) => {
  // 1.获取token
  const authorization = ctx.headers.authorization;
  if (!authorization) return ctx.app.emit("error", errorTypes.UNAUTHORIZATION, ctx);

  const token = authorization.replace("Bearer ", "");

  // 2.验证token(id/name/iat/exp)
  try {
    const res = jwt.verify(token, PUBLIC_KEY, { algorithms: ["RS256"] });
    ctx.userInfo = res;
    await next();
  } catch (err) {
    ctx.app.emit("error", errorTypes.UNAUTHORIZATION, ctx);
  }
};

const verifyEmail = async (ctx, next) => {
  const { email } = ctx.request.body;
  if (!email) return ctx.app.emit("error", errorTypes.EMAIL_IS_REQUIRED, ctx);
  const userInfo = await userService.queryUserInfo("email", email);
  if (!userInfo) return ctx.app.emit("error", errorTypes.EMAIL_DOSE_NOT_ASSOCIATED, ctx);
  ctx.userInfo = userInfo;
  await next();
};
const generateCode = async (ctx, next) => {
  let code = "";
  for (let i = 0; i < 6; i++) code = code + Math.floor(Math.random() * 10);
  ctx.request.body.code = code;
  await next();
};

const verifyReset = async (ctx, next) => {
  const { code, password, userId } = ctx.request.body;
  ctx.request.body.md5password = md5password(password);
  const res = await loginService.queryCodeByUserId(userId);
  const nowTime = new Date();
  if (res?.expiration_time && res.code === code && nowTime - res.expiration_time < 1000 * 60 * 10) {
    await next();
  } else {
    ctx.app.emit("error", errorTypes.VERIFY_CODE_IS_WRONG, ctx);
  }
};
export { verifyLogin, verifySignUp, verifyAuth, verifyEmail, generateCode, verifyReset };
