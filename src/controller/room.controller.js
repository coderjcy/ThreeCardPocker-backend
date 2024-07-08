import errorTypes from "../constants/error-types.js";
import userService from "../service/user.service.js";
import Game from "./game.js";
const roomList = [];
class Room {
  constructor(creatorInfo, config) {
    this.id = creatorInfo.id;
    this.creatorId = creatorInfo.id;
    // this.creatorName = creatorInfo.nickname;
    this.name = config.roomName;
    this.playerNumber = config.playerNumber; // 最大玩家数
    this.baseChip = config.baseChip; // 底注
    this.roundCount = config.roundCount; // 轮数
    this.chattingRecords = new Proxy([], {
      get: (target, prop) => {
        const players = this.game.players;
        if (prop === "push") {
          return function (...args) {
            players.forEach((player) => {
              player.ws.send(
                JSON.stringify({
                  code: 200,
                  data: {
                    type: "update-chatting-records",
                    chattingRecords: [...target, ...args],
                  },
                })
              );
            });
            return target.push(...args);
          };
        }
        return target[prop];
      },
    });
    this.game = new Game({
      playerNum: config.playerNumber,
      baseChip: config.baseChip,
      roundCount: config.roundCount,
    });
  }
  // 添加玩家
  async addPlayer(userId, ws) {
    const userInfo = await userService.queryUserInfo("id", userId);
    const player = this.game.addPlayer(userInfo, ws);

    this.chattingRecords.push({
      type: "system",
      title: "系统消息",
      content: userInfo.nickname + "进入了房间",
      time: new Date().getTime(),
    });

    this.handleMessage(player);
  }

  // 重新连接
  reconnection(userId, ws) {
    const player = this.game.reconnection(userId, ws);
    this.handleMessage(player);
  }
  handleMessage(player) {
    player.ws.on("message", (data) => {
      data = JSON.parse(data);

      // 切换准备状态
      if (data.key === "toggle-is-ready") {
        player.state = player.state === "ready" ? "waiting" : "ready";
        this.chattingRecords.push({
          type: "system",
          title: "系统消息",
          content: player.name + (player.state === "ready" ? "已准备" : "取消了准备"),
          time: new Date().getTime(),
        });
        this.game.updateGameData();
        if (
          this.game.players.every((i) => i.state === "ready") &&
          this.game.players.length === this.game.playerNum
        ) {
          this.game.start();
        }
      }
      // 玩家发言
      else if (data.key === "player-message") {
        this.chattingRecords.push({
          type: "player",
          title: player.name,
          content: data.data,
          time: new Date().getTime(),
        });
      }
      // 跟注
      else if (data.key === "follow-bet") this.game.followBet();
      // 下注
      else if (data.key === "add-bet") this.game.addBet(data.chip);
      // 放弃
      else if (data.key === "abandon-bet") this.game.abandonBet();
      // 比牌
      else if (data.key === "compare-poker") this.game.comparePoker(data.playerId);
      // 看牌
      else if (data.key === "show-poker") this.game.showPoker();
    });
  }
}
class RoomController {
  // 获取房间列表
  async list(ctx, next) {
    ctx.body = {
      code: 200,
      data: roomList.map((i) => {
        return {
          id: i.id,
          name: i.name,
          playerNumber: i.playerNumber,
          currentNumber: i.game.players.length,
          baseChip: i.baseChip,
          roundCount: i.roundCount,
          state: i.state,
        };
      }),
    };
  }
  // 创建房间
  async create(ctx, next) {
    const roomInfo = roomList.find((i) => i.creatorId === ctx.userInfo.id);
    if (roomInfo) {
      ctx.body = {
        code: 200,
        data: {
          isExists: true,
          roomId: roomInfo.id,
        },
        message: "房间列表中已存在用户创建的房间",
      };
      return;
    }
    const room = new Room(ctx.userInfo, ctx.request.body);
    roomList.push(room);
    ctx.body = {
      code: 200,
      data: {
        roomId: room.id,
      },
      message: "创建成功",
    };
  }

  async info(ctx, next) {
    const roomId = ctx.request.params.roomId;
    const roomInfo = roomList.find((i) => i.id == roomId);
    ctx.body = {
      code: 200,
      data: {
        id: roomInfo.id,
        name: roomInfo.name,
        playerNumber: roomInfo.playerNumber,
        currentNumber: roomInfo.game.players.length,
        baseChip: roomInfo.baseChip,
        roundCount: roomInfo.roundCount,
        state: roomInfo.game.state,
      },
    };
  }
  // 加入房间
  join(userId, roomId, ws) {
    const room = roomList.find((i) => i.id == roomId);
    if (!room)
      return ws.send(
        JSON.stringify({
          code: -1007,
          message: errorTypes.ROOM_DOSE_NOT_EXISTS,
        })
      );
    if (room.game.players.length >= room.playerNumber) {
      const player = room.game.players.find((i) => i.id === userId);

      // 玩家已存在, 重新连接
      if (player) return room.reconnection(userId, ws);

      return ws.send(
        JSON.stringify({
          code: -1007,
          message: errorTypes.ROOM_DOSE_FULL,
        })
      );
    }

    room.addPlayer(userId, ws);
  }

  // 解散房间
  dissolve(ctx, next) {
    const roomId = ctx.request.body.roomId;
    const index = roomList.findIndex((i) => i.id == roomId);
    if (index === -1) return ctx.app.emit("error", errorTypes.ROOM_DOSE_NOT_EXISTS, ctx);
    if (ctx.userInfo.id != roomList[index].creatorId)
      return ctx.app.emit("error", errorTypes.DOSE_NOT_CREATOR, ctx);
    if (roomList[index].game.state === "playing")
      return ctx.app.emit("error", errorTypes.ROOM_DOSE_PLAYING, ctx);

    roomList.splice(index, 1);
    ctx.body = {
      code: 200,
      message: "房间解散成功",
    };
  }
}

export default new RoomController();
