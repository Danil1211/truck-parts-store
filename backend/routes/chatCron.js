// jobs/checkMissedChats.js
const { User, Message } = require('../models/models'); // у тебя везде ../models/models

/**
 * Проверка "пропущенных" чатов
 * - new | waiting | active → если у клиента есть непрочитанное сообщение,
 *   старше 2 минут → статус missed
 * - плюс авто-сброс онлайн, если lastOnlineAt старше 70с
 */
async function checkMissedChats() {
  const TWO_MIN = 2 * 60 * 1000;
  const now = Date.now();

  try {
    const users = await User.find({
      status: { $in: ['new', 'waiting', 'active'] },
    }).select('_id status lastMessageAt adminLastReadAt phone lastOnlineAt isOnline');

    for (const user of users) {
      // авто-офлайн
      if (user.isOnline && user.lastOnlineAt && now - new Date(user.lastOnlineAt).getTime() > 70_000) {
        user.isOnline = false;
        await user.save().catch(() => {});
      }

      if (!user.lastMessageAt) continue;

      const lastClientMsg = new Date(user.lastMessageAt).getTime();
      const lastAdminRead = user.adminLastReadAt ? new Date(user.adminLastReadAt).getTime() : 0;

      const clientHasUnseenMsg = lastClientMsg > lastAdminRead;
      const overdue = now - lastClientMsg > TWO_MIN;

      if (clientHasUnseenMsg && overdue) {
        // проверка: нет ли ответа админа после этого сообщения
        const hasAdminReplyAfter = await Message.exists({
          user: user._id,
          fromAdmin: true,
          createdAt: { $gt: user.lastMessageAt }
        });

        if (!hasAdminReplyAfter) {
          user.status = 'missed';
          await user.save();
          console.log(`🟠 Чат ${user.phone || user._id} -> missed`);
        }
      }
    }
  } catch (err) {
    console.error('Ошибка при checkMissedChats:', err);
  }
}

module.exports = { checkMissedChats };
