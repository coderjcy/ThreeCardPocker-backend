import userService from "../service/user.service.js";
class UserController {
  async queryFriends(ctx, next) {
    const userId = ctx.query.id;
    const friendList = await userService.queryFriends(userId);
    ctx.body = {
      code: 200,
      data: friendList,
    };
  }

  async queryBalance(ctx, next) {}
}

export default new UserController();
