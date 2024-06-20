import errorTypes from "../constants/error-types.js";
const errorHandler = (err, ctx) => {
  let code, message;
  switch (err) {
    case errorTypes.NAME_OR_PASSWORD_IS_REQUIRED:
      code = -1001; // Bad Request
      message = "账号或密码不能为空~";
      break;
    case errorTypes.USER_ALREADY_EXISTS:
      code = -1002; // conflict
      message = "账号已经存在~";
      break;
    case errorTypes.USER_DOES_NOT_EXISTS:
      code = -1003;
      message = "账号不存在~";
      break;
    case errorTypes.PASSWORD_IS_INCORRENT:
      code = -1004;
      message = "密码错误";
      break;
    case errorTypes.UNAUTHORIZATION:
      code = -1005;
      message = "无效的token~";
      break;
    case errorTypes.UNPERMISSION:
      code = -1006;
      message = "您不具备操作的权限~";
      break;
    case errorTypes.ROOM_DOSE_NOT_EXISTS:
      code = -1007;
      message = "房间不存在";
      break;
    case errorTypes.ROOM_DOSE_FULL:
      code = -1008;
      message = "房间人数已满";
      break;
    case errorTypes.ROOM_DOSE_PLAYING:
      code = -1009;
      message = "房间正在游戏中,无法解散";
      break;
    case errorTypes.DOSE_NOT_CREATOR:
      code = -1010;
      message = "您不是房主,无法解散";
      break;
    default:
      code = -1000;
      message = "NOT FOUND";
  }

  ctx.body = {
    code,
    message,
  };
};

export default errorHandler;
