import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { PRIVATE_KEY } from "../app/config.js";
import userService from "../service/user.service.js";
import loginService from "../service/login.service.js";
import errorTypes from "../constants/error-types.js";
class LoginController {
  async asignToken(ctx, next) {
    const { id, username, nickname } = ctx.userInfo;
    const token = jwt.sign({ id, username, nickname }, PRIVATE_KEY, {
      expiresIn: 60 * 60 * 24,
      algorithm: "RS256",
    });
    ctx.body = {
      code: 200,
      data: { id, username, nickname, token },
    };
  }

  async signUp(ctx, next) {
    const { username, md5password, email } = ctx.request.body;
    await userService.create(username, md5password, email);
    ctx.body = {
      code: 200,
      message: "注册成功",
    };
  }

  async sendCode(ctx, next) {
    const { email, code } = ctx.request.body;
    const transporter = nodemailer.createTransport({
      host: "smtp.qq.com",
      auth: {
        user: "coderjcy@qq.com",
        pass: "jtoxdnbnzjavhdjf",
      },
    });

    const sendRes = await transporter
      .sendMail({
        from: "coderjcy@qq.com",
        to: email,
        subject: "炸金花 - 重置密码",
        text: `您的验证码为：${code},验证码有效期10分钟,请尽快使用`,
      })
      .catch((err) => undefined);
    if (sendRes) {
      await loginService.insetVerifyCodeRecord(ctx.userInfo.id, code);
      ctx.body = {
        code: 200,
        data: { userId: ctx.userInfo.id },
        message: "验证码获取成功",
      };
    } else {
      ctx.app.emit("error", errorTypes.NAME_OR_PASSWORD_IS_REQUIRED, ctx);
    }
  }
  async resetPassword(ctx, next) {
    const { userId, md5password } = ctx.request.body;
    await userService.update(userId, "password", md5password);
    ctx.body = {
      code: 200,
      message: "验证码修改成功",
    };
  }
}

export default new LoginController();
