// Email-уведомления о заказах
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail', // можно заменить на другой SMTP
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function sendOrderConfirmation(toEmail, order) {
  const itemsList = order.items.map(item => `• ${item.quantity} x ${item.product.name}`).join('<br>');

  const htmlContent = `
    <h2>Ваш заказ принят!</h2>
    <p>Номер заказа: <strong>${order._id}</strong></p>
    <p>Состав заказа:</p>
    <p>${itemsList}</p>
    <p>Общая сумма: <strong>${order.totalPrice} грн</strong></p>
    <p>Спасибо за покупку!</p>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: toEmail,
    subject: 'Подтверждение заказа',
    html: htmlContent
  });
}

module.exports = {
  sendOrderConfirmation
};
