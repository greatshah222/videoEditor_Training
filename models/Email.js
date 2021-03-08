const nodemailer = require('nodemailer');

const htmlToText = require('html-to-text');

module.exports = class Email {
  // URL WORLS IN CASE OF SENDING ANY URL ASSOCIATED WITH VIDEOEDITOR URL
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `Bishal Shah <${process.env.EMAIL_FROM}>`;
  }
  createNewTransport() {
    if (process.env.NODE_ENV === 'production') {
      console.log(`We are in the production mode`);
      return nodemailer.createTransport({});
    }
  }
};
