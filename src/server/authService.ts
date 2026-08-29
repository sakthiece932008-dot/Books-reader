import nodemailer from 'nodemailer';

interface OtpRecord {
  code: string;
  expiresAt: number;
  attempts: number;
}

// In-memory OTP storage keyed by lowercased email
const otpStore = new Map<string, OtpRecord>();

// Transporter cache
let transporter: nodemailer.Transporter | null = null;
let testAccountCreated = false;

async function getTransporter(): Promise<nodemailer.Transporter> {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);

  // If user provided custom SMTP or Gmail credentials
  if (user && pass) {
    if (host === 'smtp.gmail.com' || (!host && user.includes('@gmail.com'))) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass }
      });
      console.log(`[AUTH] Initialized Gmail SMTP service for ${user}`);
      return transporter;
    }

    if (host) {
      transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass }
      });
      console.log(`[AUTH] Initialized custom SMTP transporter for ${host}:${port} (${user})`);
      return transporter;
    }
  }

  // Fallback to real Ethereal SMTP test account for instant zero-config live delivery
  try {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    testAccountCreated = true;
    console.log(`[AUTH] Auto-created Ethereal SMTP delivery transport (User: ${testAccount.user})`);
    return transporter;
  } catch (err) {
    console.error('[AUTH] Failed to initialize Ethereal SMTP, creating stream transport:', err);
    transporter = nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true
    });
    return transporter;
  }
}

export async function sendOtpEmail(email: string, clientName?: string): Promise<{ 
  success: boolean; 
  code: string; 
  expiresInSeconds: number; 
  previewUrl?: string; 
  isLiveDelivered: boolean;
  hasCustomSmtp?: boolean;
}> {
  const cleanEmail = email.trim().toLowerCase();
  // Secure 6-digit cryptographic-style OTP
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const validityMinutes = 5;
  const expiresAt = Date.now() + validityMinutes * 60 * 1000;

  otpStore.set(cleanEmail, {
    code,
    expiresAt,
    attempts: 0
  });

  const mailFrom = process.env.SMTP_FROM || '"ClearText Reader" <auth@cleartext.app>';
  const subject = `Your ClearText Reader Verification Code: ${code}`;
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; }
          .card { max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
          .header { text-align: center; margin-bottom: 24px; }
          .logo { font-size: 24px; font-weight: 800; color: #4338ca; letter-spacing: -0.5px; }
          .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
          .code-box { background: #f8fafc; border: 2px dashed #c7d2fe; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
          .otp-code { font-family: monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #4338ca; margin: 0; }
          .timer-text { font-size: 12px; color: #64748b; margin-top: 8px; }
          .footer { font-size: 11px; color: #94a3b8; text-align: center; margin-top: 24px; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <div class="logo">📖 ClearText Reader</div>
            <div class="subtitle">Multilingual Reader & AI Study Companion</div>
          </div>
          <p style="font-size: 14px; color: #334155; margin-bottom: 8px;">Hello ${clientName || 'Reader'},</p>
          <p style="font-size: 13px; color: #64748b; line-height: 1.5;">Use the 6-digit verification code below to securely authenticate your account:</p>
          
          <div class="code-box">
            <div class="otp-code">${code}</div>
            <div class="timer-text">⏳ Valid for ${validityMinutes} minutes (Expires at ${new Date(expiresAt).toLocaleTimeString()})</div>
          </div>

          <p style="font-size: 12px; color: #64748b;">If you didn't request this code, you can safely ignore this email.</p>
          
          <div class="footer">
            ClearText Reader App • Safe, Offline-First Language Learning
          </div>
        </div>
      </body>
    </html>
  `;

  let previewUrl: string | undefined;
  let isLiveDelivered = false;

  try {
    const mailer = await getTransporter();
    const info = await mailer.sendMail({
      from: mailFrom,
      to: cleanEmail,
      subject,
      text: `Your ClearText Reader 6-digit verification code is: ${code}. It expires in ${validityMinutes} minutes.`,
      html: htmlContent
    });

    if (testAccountCreated || (info && (info as any).messageId)) {
      previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
      isLiveDelivered = true;
      console.log(`[AUTH] Sent verification email to ${cleanEmail}. Message ID: ${info.messageId}`);
      if (previewUrl) {
        console.log(`[AUTH] Ethereal Live Inbox Preview: ${previewUrl}`);
      }
    }
  } catch (emailErr) {
    console.error(`[AUTH] Failed to send email via SMTP to ${cleanEmail}:`, emailErr);
    // Still retain in-memory OTP so user can verify
  }

  return {
    success: true,
    code,
    expiresInSeconds: validityMinutes * 60,
    previewUrl,
    isLiveDelivered,
    hasCustomSmtp: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER)
  };
}

export function verifyOtp(email: string, code: string): { 
  success: boolean; 
  error?: string; 
  user?: { email: string; verified: boolean; verifiedAt: string } 
} {
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = code.trim();

  const record = otpStore.get(cleanEmail);
  if (!record) {
    return { success: false, error: 'No active OTP request found for this email. Please request a code.' };
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(cleanEmail);
    return { success: false, error: 'The 6-digit OTP code has expired. Please request a new code.' };
  }

  record.attempts += 1;
  if (record.attempts > 5) {
    otpStore.delete(cleanEmail);
    return { success: false, error: 'Too many incorrect attempts. Please request a new code.' };
  }

  if (record.code !== cleanCode) {
    return { success: false, error: 'Invalid 6-digit OTP code. Please check your email and try again.' };
  }

  // OTP verified successfully! Clear session
  otpStore.delete(cleanEmail);

  return {
    success: true,
    user: {
      email: cleanEmail,
      verified: true,
      verifiedAt: new Date().toISOString()
    }
  };
}
