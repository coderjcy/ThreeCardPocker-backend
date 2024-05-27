import jwt from "jsonwebtoken";
import { PRIVATE_KEY } from "../app/config.js";
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
}

export default new LoginController();
