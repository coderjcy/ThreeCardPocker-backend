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
    this.state = "waiting"; // waiting / playing
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
    });
    // this.game = null;
    this.game = new Game({
      playerNum: config.playerNumber,
      baseChip: config.baseChip,
      roundCount: config.roundCount,
    });
  }
  // 开始游戏
  startGame() {
    this.state = "playing";
    // this.game = new Game({
    //   playerNum: this.playerNumber,
    //   baseChip: this.baseChip,
    //   roundCount: this.roundCount,
    // });
    this.game.start();
    this.game.players.forEach((player) => {
      player.ws.send(
        JSON.stringify({
          code: 200,
          data: {
            type: "toggle-room-state",
            state: "playing",
          },
        })
      );
    });
    this.game.updateGameData();
  }
  async addPlayer(userId, ws) {
    const userInfo = await userService.queryUserInfo("id", userId);
    this.game.addPlayer(userInfo, ws);

    // const player = {
    //   id: userInfo.id,
    //   name: userInfo.nickname,
    //   balance,
    //   avatar,
    //   isReady: false,
    //   ws: userInfo.ws,
    // };
    // Object.defineProperty(player, "ws", { enumerable: false });

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

    // this.playerList.push(player);
    this.chattingRecords.push({
      type: "system",
      title: "系统消息",
      content: userInfo.nickname + "进入了房间",
      time: new Date().getTime(),
    });

    this.handleMessage(player);
  }
  // async addPlayer(userInfo) {
  //   const { balance, avatar } = await userService.queryUserInfo("id", userInfo.id);
  //   const player = {
  //     id: userInfo.id,
  //     name: userInfo.nickname,
  //     balance,
  //     avatar,
  //     isReady: false,
  //     ws: userInfo.ws,
  //   };
  //   player.ws.on("close", () => {
  //     const index = this.playerList.findIndex((item) => item.id === player.id);
  //     if (index >= 0) {
  //       this.playerList.splice(index, 1);
  //       this.chattingRecords.push({
  //         type: "system",
  //         title: "系统消息",
  //         content: player.name + "离开了房间",
  //         time: new Date().getTime(),
  //       });
  //       this.updatePlayerState();
  //     }
  //   });

  //   Object.defineProperty(player, "ws", { enumerable: false });
  //   this.playerList.push(player);
  //   this.chattingRecords.push({
  //     type: "system",
  //     title: "系统消息",
  //     content: player.name + "进入了房间",
  //     time: new Date().getTime(),
  //   });

  //   // 通告玩家进入房间
  //   this.updatePlayerState();

  //   this.handleMessage(player);
  // }
  handleMessage(player) {
    player.ws.on("message", (data) => {
      data = JSON.parse(data);

      // 切换准备状态
      if (data.key === "toggle-is-ready") {
        player.isReady = !player.isReady;
        this.chattingRecords.push({
          type: "system",
          title: "系统消息",
          content: player.name + (player.isReady ? "已准备" : "取消了准备"),
          time: new Date().getTime(),
        });
        this.updatePlayerState();
        if (this.playerList.every((i) => i.isReady) && this.playerList.length === this.playerNumber)
          this.startGame();
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
      else if (data.key === "follow-bet") {
        this.game.followBet();
      }
      // 下注
      else if (data.key === "add-bet") {
        this.game.addBet(data.chip);
      }
      // 放弃
      else if (data.key === "abandon-bet") {
        this.game.abandonBet();
      }
      // 比牌
      else if (data.key === "compare-pocker") {
        this.game.comparePocker(data.playerId);
      }
      // 看牌
      else if (data.key === "show-pocker") {
        this.game.showPocker();
      }
    });
  }
  updatePlayerState() {
    this.playerList.forEach((player) => {
      player.ws.send(
        JSON.stringify({
          code: 200,
          data: {
            type: "update-game-data",
            chipPool: 0,
            currentChipMin: 1,
            self: player,
            other: this.playerList.filter((i) => i.id !== player.id),
          },
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
}
class RoomController {
  // 获取房间列表
  async list(ctx, next) {
    ctx.body = {
      code: 200,
      data: roomList,
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
        baseChip: roomInfo.baseChip,
        roundCount: roomInfo.roundCount,
        state: roomInfo.state,
      },
    };
  }
  // 加入房间
  join(userId, roomId, ws) {
    const roomInfo = roomList.find((i) => i.id == roomId);
    if (!roomInfo)
      return ws.send(
        JSON.stringify({
          code: -1007,
          message: errorTypes.ROOM_DOSE_NOT_EXISTS,
        })
      );
    if (roomInfo.game.players.length >= roomInfo.playerNumber) {
      return ws.send(
        JSON.stringify({
          code: -1007,
          message: errorTypes.ROOM_DOSE_NOT_EXISTS,
        })
      );
    }

    // roomInfo.addPlayer(userInfo);
    roomInfo.addPlayer(userId, ws);
  }
}

export default new RoomController();
