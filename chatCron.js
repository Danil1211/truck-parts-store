const { User, Message } = require('./models');

async function checkMissedChats() {
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  try {
    const users = await User.find({ status: 'waiting', lastMessageAt: { $lte: twoMinutesAgo } });

    for (const user of users) {
      const hasAdminReply = await Message.exists({
        user: user._id,
        fromAdmin: true
      });

      if (!hasAdminReply) {
        user.status = 'missed';
        await user.save();
        console.log(`🟠 Чат с ${user.phone} помечен как missed`);
      }
    }
  } catch (err) {
    console.error('Ошибка при проверке missed чатов:', err);
  }
}

module.exports = { checkMissedChats };
