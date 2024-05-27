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

class Game {
  constructor() {
    this.playerNum = 0;
    this.currentPlayerIndex = -1;
    this.prePlayerIndex = -1;
    this.players = [];
    this.deck = [];
    this.timer = undefined;
    this.minChip = 1; // 底注
    this.chipPool = 0; // 筹码池
    this.chipMax = 20; // 单注上限
    this.currentChipMin = 1; // 当前最小可下注筹码
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
        cards,
        score, // 牌型对应分数
        isBlind: true, // 是否看牌
        isAbandon: false, // 是否放弃
        cardsType: type, // 牌型
        chip: this.minChip, // 下注的筹码
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

  // 计算赢家
  computeWinner() {
    let winner = this.players[0];
    for (let i = 1; i < this.players.length; i++)
      if (this.players[i].score > winner.score) winner = this.players[i];
    return winner;
  }

  // 看牌
  showPocker() {
    const player = this.players[this.currentPlayerIndex];
    player.isBlind = false;
    this.cancelCountdownTimer();
    this.startCountdownTimer(player);
  }

  // 加注
  addBet() {
    const prePlayer = this.players[this.prePlayerIndex];
    const player = this.players[this.currentPlayerIndex];
    const chip =
      prePlayer?.isBlind && !player.isBlind ? this.currentChipMin * 2 + 5 : this.currentChipMin + 5;

    player.chip += chip;
    this.chipPool += chip;
    this.currentChipMin = chip;
    this.togglePlayer();
  }

  // 跟注
  followBet() {
    const prePlayer = this.players[this.prePlayerIndex];
    const player = this.players[this.currentPlayerIndex];
    if (prePlayer?.isBlind && !player.isBlind) this.currentChipMin = this.currentChipMin * 2;
    player.chip += this.currentChipMin;
    this.chipPool += this.currentChipMin;
    this.togglePlayer();
  }

  // 弃牌
  abandonBet() {
    this.players[this.currentPlayerIndex].isAbandon = true;
    this.togglePlayer();
  }
  // 判断游戏是否结束
  checkGameOver() {
    const existPlayer = this.players.filter((i) => !i.isAbandon);

    // 如果只剩余一人,表示游戏结束
    if (existPlayer.length === 1) {
      // 取消倒计时
      this.cancelCountdownTimer();
      // 结算筹码

      const winner = existPlayer[0];
    } else {
      this.togglePlayer();
    }
  }

  // 比牌
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

  // 切换用户回合
  togglePlayer() {
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

  // 开始倒计时
  startCountdownTimer(curPlayer) {
    curPlayer.remain = 30;
    this.timer = setInterval(() => {
      if (curPlayer.remain < 0) this.abandonBet();
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
  // 取消倒计时
  cancelCountdownTimer() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = undefined;
    this.players[this.currentPlayerIndex].remain = -1;
  }
}

export default Game;

// 1. 游戏开始时，每位玩家向筹码池中投注“”约定好”的基础筹码
// 2. 第一名玩家可以选择“看牌”下注，或者“不看牌”下注
//    2.1 当玩家选择看牌下注后，之后的玩家可以选择相同的筹码跟注，或者下注
//    2.2 当玩家选择不看牌下注后，之后的玩家可以选择不看牌跟注，或者看牌并且加倍跟注，或者下注
// 3. 跟注和下注需要在创建游戏房间时设置上限
// 4. 游戏结束后，将公开全部玩家的牌
// 5. 加注需要加入比上家单注更多的筹码，并且加注后不能超过单注封顶
