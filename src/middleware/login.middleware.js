import jwt from "jsonwebtoken";

import errorTypes from "../constants/error-types.js";
import userService from "../service/user.service.js";
import md5password from "../utils/password-handle.js";
import { PUBLIC_KEY } from "../app/config.js";

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

export { verifyLogin, verifyAuth };
