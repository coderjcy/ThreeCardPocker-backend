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
      code = -1003; // 参数错误
      message = "账号不存在~";
      break;
    case errorTypes.PASSWORD_IS_INCORRENT:
      code = -1004; // 参数错误
      message = "密码错误";
      break;
    case errorTypes.UNAUTHORIZATION:
      code = -1005; // 参数错误
      message = "无效的token~";
      break;
    case errorTypes.UNPERMISSION:
      code = -1006; // 参数错误
      message = "您不具备操作的权限~";
      break;
    case errorTypes.ROOM_DOSE_NOT_EXISTS:
      code = -1007; // 参数错误
      message = "房间不存在";
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