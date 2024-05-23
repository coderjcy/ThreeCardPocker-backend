import jwt from "jsonwebtoken";
import { PRIVATE_KEY } from "../app/config.js";
class LoginController {
  async asignToken(ctx, next) {
    const { id, username } = ctx.userInfo;
    const token = jwt.sign({ id, username }, PRIVATE_KEY, {
      expiresIn: 60 * 60 * 24,
      algorithm: "RS256",
    });
    ctx.body = {
      code: 200,
      data: { id, username, token },
    };
  }
}

export default new LoginController();
