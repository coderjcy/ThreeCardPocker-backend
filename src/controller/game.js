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
const minChip = 1;
class Game {
  constructor() {
    this.playerNum = 0;
    this.currentPlayerIndex = 0;
    this.players = [];
    this.deck = [];
    this.timer = undefined;
    for (const index in LABELS)
      for (const key in SUIT)
        this.deck.push({
          suitLabel: key,
          suitValue: SUIT[key],
          label: LABELS[index],
          value: +index,
        });
  }

  randomCard() {
    const index = Math.floor(Math.random() * this.deck.length);
    return this.deck.splice(index, 1)[0];
  }

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
  start(playerList) {
    this.playerNum = playerList.length;
    this.players = playerList.map((player) => {
      const cards = [];
      for (let j = 1; j <= 3; j++) cards.push(this.randomCard());
      const { score, type } = this.computeScore(cards);
      return {
        id: player.id,
        name: player.name,
        cards,
        score, // 牌型对应分数
        isBlind: true, // 是否看牌
        cardsType: type, // 牌型
        chip: minChip, // 下注的筹码
        balance: player.balance,
      };
    });
    this.currentPlayerIndex = Math.floor(Math.random() * this.playerNum);

    return this.players;
    // for (let i = 0; i < this.players; i++) {
    //   const cards = [];
    //   for (let j = 1; j <= 3; j++) cards.push(this.randomCard());
    //   const { score, type } = this.computeScore(cards);
    //   const player = {
    //     id: i,
    //     name: `player${i + 1}`,
    //     cardsType: type,
    //     cards,
    //     score,
    //     isBlind: true,
    //     chip: minChip,
    //   };
    //   this.players.push(player);
    // }
  }

  computeWinner() {
    let winner = this.players[0];
    for (let i = 1; i < this.players.length; i++)
      if (this.players[i].score > winner.score) winner = this.players[i];
    return winner;
  }

  // 游戏操作逻辑
  showPocker() {
    //
  }
  addBet() {}
  followBet() {}
  abandonBet() {}
  togglePlayer() {
    if (this.currentPlayerIndex === this.playerNum - 1) this.currentPlayerIndex = 0;
    else this.currentPlayerIndex++;
  }
  countdownTimer() {
    let remain = 30;
    this.timer = setInterval(() => {
      this.players.forEach((player) => {
        player.ws.send(
          JSON.stringify({
            code: 200,
            data: {
              type: "countdown",
              remain: remain--,
              userId: player.id,
            },
          })
        );
      });
    }, 1000);
  }
}

export default Game;
