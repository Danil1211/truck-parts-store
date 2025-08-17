// jobs/checkMissedChats.js
const { User, Message } = require('../models');

/**
 * Логика:
 * - Берём пользователей, у которых статус в активных состояниях
 *   (new | waiting | active), и пришло новое входящее сообщение от клиента
 *   позже, чем админ видел/прочитал (adminLastReadAt), и прошло >2 минут.
 * - Помечаем их как missed.
 *
 * Дополнительно можно гасить "онлайн", если lastOnlineAt сильно старый.
 */
async function checkMissedChats() {
  const TWO_MIN = 2 * 60 * 1000;
  const now = Date.now();

  try {
    const users = await User.find({
      status: { $in: ['new', 'waiting', 'active'] },
    }).select('_id status lastMessageAt adminLastReadAt phone lastOnlineAt isOnline');

    for (const user of users) {
      // офлайн-статус по таймеру (например, 70с)
      if (user.isOnline && user.lastOnlineAt && now - new Date(user.lastOnlineAt).getTime() > 70_000) {
        user.isOnline = false;
        await user.save().catch(() => {});
      }

      // если нет новых сообщений — дальше
      if (!user.lastMessageAt) continue;

      const lastClientMsg = new Date(user.lastMessageAt).getTime();
      const lastAdminRead = user.adminLastReadAt ? new Date(user.adminLastReadAt).getTime() : 0;

      const clientHasUnseenMsg = lastClientMsg > lastAdminRead;
      const overdue = now - lastClientMsg > TWO_MIN;

      if (clientHasUnseenMsg && overdue) {
        // Доп.проверка: не было ли ответов от админа после lastMessageAt
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
