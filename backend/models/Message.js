const mongoose = require('mongoose');
const { Schema } = mongoose;

const MessageSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // кто отправил
  text: { type: String }, // текст сообщения
  imageUrls: [{
    type: String,
    validate: {
      validator: function(value) {
        return /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/.test(value); // проверка на валидный URL
      },
      message: props => `${props.value} не является действительным URL!`
    }
  }],
  audioUrl: {
    type: String,
    validate: {
      validator: function(value) {
        if (value) { // проверка, если аудио существует
          return /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/.test(value); // проверка на валидный URL
        }
        return true;
      },
      message: props => `${props.value} не является действительным URL!`
    }
  },
  fromAdmin: { type: Boolean, default: false }, // сообщение от админа?
  createdAt: { type: Date, default: Date.now },
});
