require('dotenv').config();

const { WebClient } = require('@slack/web-api');
const Brevo = require('@getbrevo/brevo');

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

/**
 * Notify users via slack
 */
module.exports.slackNotify = async (message) => {
  try {
    await slack.chat.postMessage({
      channel: process.env.SLACK_CHANNEL_ID,
      text: message
    });
    console.log('Slack sent OK!');
  } catch (err) {
    console.log('Slack error:', err.message);
  }
};

/**
 * Notify users via email using Brevo
 */
module.exports.emailNotify = async (message) => {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.EMAIL_FROM;
  const notifyEmails = process.env.NOTIFY_EMAILS;

  if (!apiKey || !fromEmail || !notifyEmails) {
    console.log('Missing Brevo info in .env (API key, from email, or NOTIFY_EMAILS)');
    return;
  }

  const recipients = notifyEmails.split(',').map(e => e.trim());

  const brevoApi = new Brevo.TransactionalEmailsApi();
  brevoApi.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey);

  const emailData = {
    sender: { name: 'Chemchem Sheets', email: fromEmail },
    to: recipients.map(email => ({ email })),
    subject: 'Notification from Chemchem Association',
    textContent: message
  };

  try {
    await brevoApi.sendTransacEmail(emailData);
    console.log('Email sent OK to:', recipients.join(', '));
  } catch (err) {
    console.log('Email error:', err.message);
  }
};

// Quick test: Run both
if (require.main === module) {
  (async () => {
    await module.exports.slackNotify('Test Slack + Email from James');
    await module.exports.emailNotify('Test Slack + Email from James');
  })();
}