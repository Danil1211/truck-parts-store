// utils/mailer.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 465,
  secure: process.env.SMTP_SECURE === 'true' || true, // true = SSL
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Отправка письма-подтверждения заказа
 * @param {string} toEmail - Email получателя
 * @param {object} order - объект заказа
 */
async function sendOrderConfirmation(toEmail, order) {
  try {
    const itemsList = order.items
      .map(item => `• ${item.quantity} x ${item.product.name}`)
      .join('<br>');

    const htmlContent = `
      <h2 style="color:#117fff;font-family:Segoe UI,Arial,sans-serif">Ваш заказ принят!</h2>
      <p>Номер заказа: <strong>${order._id}</strong></p>
      <p><b>Состав заказа:</b></p>
      <p>${itemsList}</p>
      <p><b>Общая сумма:</b> ${order.totalPrice} грн</p>
      <p style="margin-top:20px">Спасибо за покупку в нашем магазине!</p>
    `;

    const textContent = `
Ваш заказ принят!
Номер заказа: ${order._id}

Состав заказа:
${order.items.map(item => `• ${item.quantity} x ${item.product.name}`).join('\n')}

Общая сумма: ${order.totalPrice} грн

Спасибо за покупку!
    `;

    await transporter.sendMail({
      from: `"Магазин" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: 'Подтверждение заказа',
      text: textContent,
      html: htmlContent,
    });

    console.log(`📧 Email отправлен: ${toEmail}`);
  } catch (err) {
    console.error('Ошибка при отправке email:', err);
  }
}

module.exports = { sendOrderConfirmation };
