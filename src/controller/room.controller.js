import errorTypes from "../constants/error-types.js";
import userService from "../service/user.service.js";
import Game from "./game.js";
const roomList = [];
class Room {
  constructor(creatorInfo) {
    this.id = creatorInfo.id + "_" + Date.now();
    this.name = creatorInfo.username + "的房间";
    this.creatorId = creatorInfo.id;
    this.creatorName = creatorInfo.username;
    this.playerList = [];
    this.state = "waiting"; // wating / playing
    this.max = 3;
    this.chattingRecords = new Proxy([], {
      get: (target, prop) => {
        const playerList = this.playerList;
        if (prop === "push") {
          return function (...args) {
            playerList.forEach((player) => {
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
    }); // 系统消息 / 用户消息
    this.game = null;
  }
  async addPlayer(userInfo) {
    const isCreator = userInfo.id === this.creatorId;
    const balance = await userService.queryBalanceById(userInfo.id);
    const player = {
      id: userInfo.id,
      name: userInfo.username,
      balance,
      isReady: isCreator ? true : false,
      ws: userInfo.ws,
    };
    player.ws.on("close", () => {
      const index = this.playerList.findIndex((item) => item.id === player.id);
      if (index >= 0) {
        this.playerList.splice(index, 1);
        this.chattingRecords.push({
          type: "system",
          title: "系统消息",
          content: player.name + "离开了房间",
          time: new Date().getTime(),
        });
        this.updatePlayerState();
      }
    });

    Object.defineProperty(player, "ws", { enumerable: false });
    this.playerList.push(player);
    this.chattingRecords.push({
      type: "system",
      title: "系统消息",
      content: player.name + "进入了房间",
      time: new Date().getTime(),
    });
    this.updatePlayerState();
    if (isCreator) {
      userInfo.ws.send(
        JSON.stringify({
          code: 200,
          data: {
            type: "is-creator",
            isCreator: true,
          },
        })
      );
      player.ws.on("message", (data) => {
        data = JSON.parse(data);
        if (data.key === "start-game") {
          if (this.playerList.length < this.max) {
            player.ws.send(
              JSON.stringify({
                code: 200,
                data: {
                  type: "notify",
                  notifyType: "warning",
                  msg: "房间人数未满",
                },
              })
            );
          } else if (!this.playerList.every((i) => i.isReady)) {
            player.ws.send(
              JSON.stringify({
                code: 200,
                data: {
                  type: "notify",
                  notifyType: "warning",
                  msg: "有玩家未准备",
                },
              })
            );
          } else {
            this.startGame();
          }
        }
        //
        else if (data.key === "follow-bet") {
          this.game.followBet();
        }
        //
        else if (data.key === "add-bet") {
          this.game.addBet();
        }
        //
        else if (data.key === "abandon-bet") {
          this.game.abandonBet();
        }
        //
        else if (data.key === "show-pocker") {
          this.game.showPocker();
        }
      });
    } else {
      player.ws.on("message", (data) => {
        data = JSON.parse(data);
        player.isReady = data.isReady;
        this.chattingRecords.push({
          type: "system",
          title: "系统消息",
          content: player.name + (data.isReady ? "已准备" : "取消了准备"),
          time: new Date().getTime(),
        });
        player.ws.send(
          JSON.stringify({
            code: 200,
            data: {
              type: "toggle-is-ready",
              isReady: player.isReady,
            },
          })
        );
        this.updatePlayerState();
      });
    }
  }
  updatePlayerState() {
    this.playerList.forEach((player) => {
      player.ws.send(
        JSON.stringify({
          code: 200,
          data: {
            type: "update-player-list",
            playerList: this.playerList,
          },
          message: "更新玩家状态",
        })
      );
    });
  }
  removePlayer(userInfo) {
    const index = this.playerList.find((i) => i.id === userInfo.id);
    const leavePlayer = this.playerList[index];
    this.playerList.splice(index, 1);
    this.playerList.forEach((player) => {
      player.ws.send(leavePlayer.name + "离开了房间");
    });
  }
  changePlayerReadyState(userInfo, isReady) {
    const player = this.playerList.find((i) => i.id === userInfo.id);
    player.isReady = isReady;
    this.playerList.forEach((player) => {
      player.ws.send(leavePlayer.name + isReady ? "已准备" : "取消了准备");
    });
  }
  notify(type = "notify", message, data) {
    this.playerList.forEach((player) => {
      player.ws.send(
        JSON.stringify({
          type,
          data,
          message,
        })
      );
    });
  }
  startGame() {
    // 如果
    this.state = "playing";
    this.game = new Game();
    this.game.start(this.playerList);
    this.playerList.forEach((player, i) => {
      player.ws.send(
        JSON.stringify({
          code: 200,
          data: {
            type: "notify",
            notifyType: "success",
            msg: "游戏开始",
          },
        })
      );
      player.ws.send(
        JSON.stringify({
          code: 200,
          data: {
            type: "toggle-room-state",
            state: "playing",
          },
        })
      );
      player.ws.send(
        JSON.stringify({
          code: 200,
          data: {
            type: "update-game-data",
            self: this.game.players[i],
            other: this.game.players.filter((_, j) => j !== i),
          },
        })
      );
    });
    // const winner = game.computeWinner();
    // message.success(`胜利者是${winner.name}`);
  }
}
class RoomController {
  // 获取房间列表
  async list(ctx, next) {
    ctx.body = {
      code: 200,
      data: roomList,
    };
  }
  // 获取房间信息
  async info(ctx, next) {
    console.log(`output->ctx`, ctx);
    // ctx.body = {
    //   code: 200,
    //   data: roomList,
    // };
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
    const room = new Room(ctx.userInfo);
    roomList.push(room);
    ctx.body = {
      code: 200,
      data: {
        roomId: room.id,
      },
      message: "创建成功",
    };
  }

  // 加入房间
  join(userInfo, roomId) {
    const roomInfo = roomList.find((i) => i.id === roomId);
    if (!roomInfo)
      return userInfo.ws.send(
        JSON.stringify({
          code: -1007,
          message: errorTypes.ROOM_DOSE_NOT_EXISTS,
        })
      );
    roomInfo.addPlayer(userInfo);
  }
}

export default new RoomController();
