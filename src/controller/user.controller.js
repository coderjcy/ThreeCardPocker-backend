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

  async queryUserInfoById(ctx, next) {
    const userId = ctx.request.params.id;
    const userInfo = await userService.queryUserInfo("id", userId);
    ctx.body = {
      code: 200,
      data: userInfo,
    };
  }

  async chargeBalance(ctx, next) {
    const { userId, balance } = ctx.request.body;
    const res = await userService.chargeBalance(userId, balance);
    ctx.body = {
      code: 200,
      data: res,
    };
  }
}

export default new UserController();
