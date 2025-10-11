const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD // Gmail app password
  }
});

async function sendClips(email, clips, metadata) {
  // Skip email delivery if SKIP_EMAIL is set (useful for testing)
  if (process.env.SKIP_EMAIL === 'true') {
    logger.info('📭 SKIP_EMAIL active — skipping email delivery');
    logger.info(`Would have sent ${clips.length} clips to ${email}`);
    return;
  }

  try {
    logger.info(`Sending email to ${email}`);

    const clipLinks = clips
      .map((clip, i) => `
        <tr>
          <td style="padding: 10px;">
            <div style="background: #111; border-radius: 12px; overflow: hidden; border: 1px solid #333;">
              <div style="padding: 16px;">
                <h3 style="color: #FFD600; margin: 0 0 8px 0; font-size: 16px;">Clip ${i + 1}</h3>
                <p style="color: #999; margin: 0 0 12px 0; font-size: 14px;">${clip.caption.substring(0, 80)}...</p>
                <a href="${process.env.APP_URL || 'http://localhost:3000'}/api/download/${clip.id}"
                   style="display: inline-block; background: #FFD600; color: #000; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                  Download Clip ${i + 1}
                </a>
              </div>
            </div>
          </td>
        </tr>
      `)
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #000; color: #fff;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <tr>
            <td style="text-align: center; padding-bottom: 30px;">
              <h1 style="color: #FFD600; font-size: 32px; margin: 0; font-weight: 700;">Overlap</h1>
            </td>
          </tr>
          <tr>
            <td style="text-align: center; padding-bottom: 20px;">
              <h2 style="color: #fff; font-size: 24px; margin: 0 0 10px 0;">Your viral clips are ready 🎬</h2>
              <p style="color: #999; font-size: 16px; margin: 0;">We pulled ${clips.length} sharp moments from "${metadata.title}"</p>
            </td>
          </tr>
          ${clipLinks}
          <tr>
            <td style="text-align: center; padding-top: 30px;">
              <p style="color: #666; font-size: 14px; margin: 0;">
                Overlap AI — edits with rhythm
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: `"Overlap AI" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Your viral clips are ready 🎬`,
      html
    });

    logger.info(`Email sent: ${info.messageId}`);
  } catch (error) {
    logger.error('Email send failed:', error);
    throw new Error('Email delivery failed');
  }
}

module.exports = { sendClips };
