import connection from "../app/database.js";

class UserService {
  async queryFriends(userId) {
    const statement = "SELECT * FROM user WHERE id = ?;";
    const res = await connection.execute(statement, [userId]);
    const friendIds = res[0][0].friends?.split(",") || [];
    console.log(`output->friendIds`, friendIds);
    const statement2 = "SELECT nickname,id,score FROM user WHERE id = ?;";

    const friendList = [];
    for (const friendId of friendIds) {
      const info = await connection.execute(statement2, [friendId]);
      friendList.push(info[0][0]);
    }
    return friendList;
  }

  async queryUserByUserName(username) {
    const statement = "SELECT * FROM user WHERE username = ?;";
    const res = await connection.execute(statement, [username]);
    return res[0][0];
  }
  async queryBalanceById(id) {
    const statement = "SELECT score FROM user WHERE id = ?;";
    const res = await connection.execute(statement, [id]);
    return res[0][0].score;
  }
}

export default new UserService();
