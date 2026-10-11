const nodemailer = require('nodemailer');
const { logError, logWarn } = require('./logger');

async function sendEmailNotification(subject, textBody, htmlBody, replyTo = null) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    logWarn('EMAIL_ERROR', 'Gmail SMTP not configured — skipping email.');
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from:    `"Haus of DADA" <${process.env.GMAIL_USER}>`,
      to:      'vision@hausofdada.de',
      replyTo: replyTo || undefined,
      subject,
      text:    textBody,
      html:    htmlBody,
    });
    return true;
  } catch (err) {
    logError('EMAIL_ERROR', 'Nodemailer sendMail failed', err);
    return false;
  }
}

module.exports = { sendEmailNotification };
