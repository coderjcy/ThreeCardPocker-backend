import errorTypes from "../constants/error-types.js";
import userService from "../service/user.service.js";
import Game from "./game.js";
const roomList = [];
class Room {
  constructor(creatorInfo) {
    this.id = creatorInfo.id + "_" + Date.now();
    this.name = creatorInfo.nickname + "的房间";
    this.creatorId = creatorInfo.id;
    this.creatorName = creatorInfo.nickname;
    this.playerList = [];
    this.state = "waiting"; // waiting / playing
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
    });
    this.game = null;
  }
  async addPlayer(userInfo) {
    const isCreator = userInfo.id === this.creatorId;
    const balance = await userService.queryBalanceById(userInfo.id);
    const player = {
      id: userInfo.id,
      name: userInfo.nickname,
      balance,
      isReady: isCreator ? true : false,
      ws: userInfo.ws,

      // state: "ready", // ready/pending/abandon
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
    }
    this.handleMessage(player, isCreator);
  }
  handleMessage(player, isCreator) {
    player.ws.on("message", (data) => {
      data = JSON.parse(data);
      // 房主开始游戏
      if (data.key === "start-game" && isCreator) {
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
      // 切换准备状态
      else if (data.key === "toggle-is-ready") {
        player.isReady = !player.isReady;
        this.chattingRecords.push({
          type: "system",
          title: "系统消息",
          content: player.name + (player.isReady ? "已准备" : "取消了准备"),
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
      }
      // 玩家发言
      else if (data.key === "player-message") {
        player.isReady = !player.isReady;
        this.chattingRecords.push({
          type: "player",
          title: player.name,
          content: data.data,
          time: new Date().getTime(),
        });

        this.updatePlayerState();
      }
      // 跟注
      else if (data.key === "follow-bet") {
        this.game.followBet();
        this.updateGameData();
      }
      // 下注
      else if (data.key === "add-bet") {
        this.game.addBet();
        this.updateGameData();
      }
      // 放弃
      else if (data.key === "abandon-bet") {
        this.game.abandonBet();
        this.updateGameData();
      }
      // 比牌
      else if (data.key === "compare-pocker") {
        const competitor = this.game.comparePocker(data.playerId);
        player.ws.send(
          JSON.stringify({
            code: 200,
            data: {
              type: "compare-pocker",
              competitor: {
                id: competitor.id,
                cards: competitor.cards,
                score: competitor.score,
                cardsType: competitor.cardsType,
              },
            },
          })
        );
        this.updateGameData();
      }
      // 看牌
      else if (data.key === "show-pocker") {
        this.game.showPocker();
        this.updateGameData();
      }
    });
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
            self: {
              id: this.game.players[i].id,
              name: this.game.players[i].name,
              chip: this.game.players[i].chip,
              balance: this.game.players[i].balance,
              isBlind: this.game.players[i].isBlind,
              cards: this.game.players[i].isBlind ? this.game.players[i].cards : [],
            },
            other: this.game.players
              .filter((_, j) => j !== i)
              .map((j) => {
                return {
                  id: j.id,
                  name: j.name,
                  chip: j.chip,
                  balance: j.balance,
                  isBlind: j.isBlind,
                };
              }),
          },
        })
      );
    });
    this.updateGameData();
  }
  updateGameData() {
    this.playerList.forEach((player, i) => {
      player.ws.send(
        JSON.stringify({
          code: 200,
          data: {
            type: "update-game-data",
            self: {
              id: this.game.players[i].id,
              name: this.game.players[i].name,
              chip: this.game.players[i].chip,
              balance: this.game.players[i].balance,
              isBlind: this.game.players[i].isBlind,
              isAbandon: this.game.players[i].isAbandon,
              cards: this.game.players[i].isBlind ? [] : this.game.players[i].cards,
            },
            other: this.game.players
              .filter((_, j) => j !== i)
              .map((j) => {
                return {
                  id: j.id,
                  name: j.name,
                  chip: j.chip,
                  balance: j.balance,
                  isBlind: j.isBlind,
                  isAbandon: j.isAbandon,
                };
              }),
          },
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
    if (roomInfo.playerList.length === roomInfo.max) 1;

    roomInfo.addPlayer(userInfo);
  }
}

export default new RoomController();
