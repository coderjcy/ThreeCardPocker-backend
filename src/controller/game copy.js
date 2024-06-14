import userService from "../service/user.service.js";

const SUIT = {
  diamonds: 0, // 方块
  clubs: 1, // 梅花
  hearts: 2, // 红桃
  spades: 3, // 黑桃
};

// 思考时间
const THINK_TIME = 1000 * 30;
// 总共的牌数
const TOTAL = 13 * 4;
const LABELS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const DEFAULT_CONFIG = {
  playerNum: 3,
  baseChip: 1,
  roundCount: 10,
};
class Game {
  /**
   *
   * @param {{playerNum:number, baseChip:number, roundCount:number}} config
   * @description
   *  - playerNum: 玩家人数
   *  - baseChip: 底注
   *  - roundCount: 轮数
   */
  constructor(config = DEFAULT_CONFIG) {
    this.playerNum = config.playerNum;
    this.currentPlayerIndex = -1;
    this.prePlayerIndex = -1;
    this.players = [];
    this.deck = [];
    this.timer = undefined;
    this.winnerId = undefined;
    this.baseChip = config.baseChip; // 底注
    this.chipPool = config.baseChip * config.playerNum; // 筹码池
    this.chipMax = 50; // 单注上限
    this.currentChipMin = config.baseChip; // 当前最小可下注筹码
    this.roundCount = config.roundCount * config.playerNum; // 轮数
    this.currentRound = 1;
    for (const index in LABELS)
      for (const key in SUIT)
        this.deck.push({
          suitLabel: key,
          suitValue: SUIT[key],
          label: LABELS[index],
          value: +index,
        });
  }
  // 开始游戏
  start(playerList) {
    this.playerNum = playerList.length;
    this.players = playerList.map((player) => {
      const cards = [];
      for (let j = 1; j <= 3; j++) cards.push(this.randomCard());
      const { score, type } = this.computeScore(cards);
      const data = {
        id: player.id,
        name: player.name,
        avatar: player.avatar,
        cards,
        score, // 牌型对应分数
        isBlind: true, // 是否看牌
        isAbandon: false, // 是否放弃
        cardsType: type, // 牌型
        chip: this.baseChip, // 下注的筹码
        balance: player.balance, // 剩余的筹码
        ws: player.ws,
      };
      Object.defineProperty(data, "ws", {
        enumerable: false,
      });
      return data;
    });
    this.currentPlayerIndex = Math.floor(Math.random() * this.playerNum);
    this.startCountdownTimer(this.players[this.currentPlayerIndex]);
  }

  // 重置游戏
  reset() {
    this.currentRound = 1;
    this.winnerId = undefined;
    this.chipPool = 0;
    this.deck = [];
    for (const index in LABELS)
      for (const key in SUIT)
        this.deck.push({
          suitLabel: key,
          suitValue: SUIT[key],
          label: LABELS[index],
          value: +index,
        });
  }
  // 随机抽取一张牌
  randomCard() {
    const index = Math.floor(Math.random() * this.deck.length);
    return this.deck.splice(index, 1)[0];
  }

  // 计算牌型对应的分数
  computeScore(cards) {
    cards.sort((a, b) => LABELS.indexOf(a.label) - LABELS.indexOf(b.label));
    let score = 0;
    let type;
    const suitSet = new Set();
    const labelSet = new Set();
    let isStraight = false;
    for (const card of cards) {
      suitSet.add(card.suitLabel);
      labelSet.add(card.label);
    }
    if (cards[2].value - cards[1].value === 1 && cards[1].value - cards[0].value === 1)
      isStraight = true;
    //  开始计算牌型分数
    // 1. 处理豹子(555)
    if (labelSet.size === 1) {
      type = "豹子";
      score = 1 << 19;
      score += cards[2].value << (4 * 0 + 2);
    }
    // 2. 处理同花顺(567 + 3个黑桃)
    else if (suitSet.size === 1 && isStraight) {
      type = "同花顺";
      score = 1 << 18;
      score += cards[0].suitValue << (4 * 1 + 2);
      score += cards[2].value << (4 * 0 + 2);
    }
    // 3. 处理金花(3个黑桃)
    else if (suitSet.size === 1) {
      type = "金花";
      score = 1 << 17;
      score += cards[0].suitValue << (4 * 1 + 2);
      score += cards[2].value << (4 * 0 + 2);
    }
    // 4. 处理顺子(567)
    else if (isStraight) {
      type = "顺子";
      score = 1 << 16;
      score += cards[2].value << (4 * 0 + 2);
      score += cards[2].suitValue;
    }
    // 5. 处理对子(55)
    else if (labelSet.size === 2) {
      type = "对子";
      score = 1 << 15;
      let doubleCard;
      let singleCard;
      if (cards[0].label === cards[1].label) {
        doubleCard = cards[0];
        singleCard = cards[2];
      } else if (cards[1].label === cards[2].label) {
        doubleCard = cards[1];
        singleCard = cards[0];
      } else {
        doubleCard = cards[0];
        singleCard = cards[1];
      }
      score += doubleCard.value << (4 * 1 + 2);
      score += singleCard.value << (4 * 0 + 2);
      score += singleCard.suitValue;
    }
    // 6. 处理单张(5)
    else {
      type = "单张";
      score = 1 << 14;
      score += cards[2].value << (4 * 2 + 2);
      score += cards[1].value << (4 * 1 + 2);
      score += cards[0].value << (4 * 0 + 2);
      score += cards[2].suitValue;
    }
    return {
      score,
      type,
    };
  }

  // 看牌
  showPocker() {
    const player = this.players[this.currentPlayerIndex];
    player.isBlind = false;
    this.players.forEach((player) => {
      player.ws.send(
        JSON.stringify({
          code: 200,
          data: {
            type: "show-pocker",
          },
        })
      );
    });
    this.cancelCountdownTimer();
    this.startCountdownTimer(player);
  }

  // 加注
  addBet(chip) {
    // 加注可选项 5 10 20 50
    // 如果当前最低下注为1,则加注最少为5
    // 如果当前最低下注为5,则加注最少为10
    // 如果当前最低下注为10,则加注最少为20
    // 如果当前最低下注为20,则加注最少为50
    const player = this.players[this.currentPlayerIndex];
    const playerId = player.id;
    player.chip += chip;
    this.chipPool += chip;
    this.currentChipMin = chip;
    this.players.forEach((player) => {
      player.ws.send(
        JSON.stringify({
          code: 200,
          data: {
            type: "add-bet",
            playerId,
            chip,
          },
        })
      );
    });
    this.togglePlayer();
  }

  // 跟注
  followBet() {
    const prePlayer = this.players[this.prePlayerIndex];
    const player = this.players[this.currentPlayerIndex];
    const playerId = player.id;

    const isNeedDouble = prePlayer?.isBlind && !player.isBlind;
    let chip = 0;
    switch (this.currentChipMin) {
      case 1:
        chip = isNeedDouble ? 5 : 1;
        break;
      case 5:
        chip = isNeedDouble ? 10 : 5;
        break;
      case 10:
        chip = isNeedDouble ? 20 : 10;
        break;
      case 20:
        chip = isNeedDouble ? 50 : 20;
        break;
      case 50:
        chip = 50;
        break;
    }

    player.chip += chip;
    this.chipPool += chip;
    this.currentChipMin = chip;
    this.players.forEach((player) => {
      player.ws.send(
        JSON.stringify({
          code: 200,
          data: {
            type: "follow-bet",
            playerId,
            chip,
          },
        })
      );
    });
    this.togglePlayer();
  }

  // 弃牌
  abandonBet() {
    this.players[this.currentPlayerIndex].isAbandon = true;
    this.players.forEach((player) => {
      player.ws.send(
        JSON.stringify({
          code: 200,
          data: {
            type: "abandon-bet",
          },
        })
      );
    });
    this.checkGameOver();
  }

  /**
   * @param  id 玩家id
   * @description 玩家比牌
   */
  comparePocker(id) {
    const player = this.players[this.currentPlayerIndex];
    const competitor = this.players.find((i) => i.id === id);
    // player.chip = player.chip * 2;
    // this.chipPool += player.chip;
    if (player.score > competitor.score) {
      // player 赢
      competitor.isAbandon = true;
    } else {
      // player 输
      player.isAbandon = true;
    }
    this.checkGameOver();

    return competitor;
  }

  /**
   * @description 判断游戏是否结束
   */
  checkGameOver() {
    const existPlayer = this.players.filter((i) => !i.isAbandon);

    // 如果只剩余一人,表示游戏结束
    if (existPlayer.length === 1) {
      this.cancelCountdownTimer();
      this.settleAccounts();
    } else {
      this.togglePlayer();
    }
  }

  /**
   *
   * @description 计算当前剩余用户的牌型分数最大的玩家
   */
  computeWinner() {
    let winner = null;
    this.players.forEach((player) => {
      if (!player.isAbandon) return;
      else if (!winner) winner = player;
      else if (player.score > winner.score) {
        winner.isAbandon = true;
        winner = player;
      }
    });
    this.settleAccounts(winner.id);
    this.winnerId = winner.id;
  }
  notifyGameOver() {
    this.players.forEach((player) => {
      player.ws.send(
        JSON.stringify({
          code: 200,
          data: { type: "toggle-room-state", state: "over", winnerId: this.winnerId },
        })
      );
    });
  }
  /**
   * @description 结算玩家筹码
   */
  settleAccounts() {
    const promises = [];
    this.players.forEach((player) => {
      const balance = player.isAbandon
        ? player.balance - player.chip
        : player.balance + this.chipPool - player.chip;
      const promise = userService.updateBalanceByUserId(player.id, balance);
      promises.push(promise);
    });
    Promise.all(promises).then(() => {
      this.notifyGameOver();
    });
  }

  /**
   * @description 切换用户回合
   */
  togglePlayer() {
    // 回合到达31后，游戏结束，当前剩余玩家中牌型分数最大者获得胜利
    if (this.currentRound > 30) return this.computeWinner();
    this.currentRound++;
    this.cancelCountdownTimer();
    // 如果当前玩家没有弃牌，把prePlayerIndex设为currentPlayerIndex
    if (!this.players[this.currentPlayerIndex].isAbandon) {
      this.prePlayerIndex = this.currentPlayerIndex;
    }
    // 当前玩家是最后一个人，则把currentPlayerIndex设为0
    if (this.currentPlayerIndex === this.playerNum - 1) this.currentPlayerIndex = 0;
    // 否则，把currentPlayerIndex加1
    else this.currentPlayerIndex++;
    const player = this.players[this.currentPlayerIndex];
    // 如果下个玩家是弃牌状态，则继续切换玩家
    if (player.isAbandon) this.togglePlayer();
    // 否则开始倒计时
    else this.startCountdownTimer(player);
  }

  /**
   * @description  开始倒计时
   */
  startCountdownTimer(curPlayer) {
    curPlayer.remain = 30;
    this.timer = setInterval(() => {
      if (curPlayer.remain < 0) {
        this.abandonBet();
        this.updateGameData();
      }
      this.players.forEach((player) => {
        player.ws.send(
          JSON.stringify({
            code: 200,
            data: {
              type: "countdown",
              remain: curPlayer.remain,
              userId: curPlayer.id,
            },
          })
        );
      });
      curPlayer.remain--;
    }, 1000);
  }

  /**
   *
   * @description 取消倒计时
   */
  cancelCountdownTimer() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = undefined;
    this.players[this.currentPlayerIndex].remain = -1;
  }

  updateGameData() {
    this.players.forEach((player) => {
      player.ws.send(
        JSON.stringify({
          code: 200,
          data: {
            type: "update-game-data",
            chipPool: this.chipPool,
            // prePlayerId: this.players[this.prePlayerIndex]?.id,
            self: {
              id: player.id,
              name: player.name,
              chip: player.chip,
              balance: player.balance,
              isBlind: player.isBlind,
              isAbandon: player.isAbandon,
              cards: player.cards,
              avatar: player.avatar,
              cardsType: player.cardsType,
            },
            other: this.players
              .filter((i) => i.id !== player.id)
              .map((i) => {
                return {
                  id: i.id,
                  name: i.name,
                  chip: i.chip,
                  balance: i.balance,
                  isBlind: i.isBlind,
                  isAbandon: i.isAbandon,
                  avatar: i.avatar,
                  cards: i.cards,
                  cardsType: i.cardsType,
                };
              }),
          },
        })
      );
    });
  }
}

export default Game;