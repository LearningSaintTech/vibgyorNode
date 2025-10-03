const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const MAIL_FROM = process.env.MAIL_FROM || 'no-reply@vibgyor.app';
const APP_NAME = process.env.APP_NAME || 'Vibgyor';
const APP_URL = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;

let transporter;

function getTransporter() {
	if (transporter) return transporter;
	if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
		// eslint-disable-next-line no-console
		console.warn('[MAIL] SMTP env vars are missing. Email service will not work as expected.');
	}
	transporter = nodemailer.createTransport({
		host: SMTP_HOST,
		port: SMTP_PORT,
		secure: SMTP_SECURE,
		auth: { user: SMTP_USER, pass: SMTP_PASS },
	});
	return transporter;
}

function baseTemplate({ title, bodyHtml }) {
	return `<!doctype html>
	<html>
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>${title}</title>
		<style>
			body{background:#0f172a;color:#e2e8f0;font-family:Arial,Helvetica,sans-serif;margin:0;padding:0}
			.container{max-width:600px;margin:24px auto;background:#111827;border-radius:12px;overflow:hidden;border:1px solid #1f2937}
			.header{padding:16px 20px;background:#111827;border-bottom:1px solid #1f2937}
			.brand{font-size:18px;font-weight:700;color:#60a5fa}
			.content{padding:20px}
			.title{font-size:20px;margin:0 0 12px 0;color:#f3f4f6}
			.footer{padding:16px 20px;font-size:12px;color:#94a3b8;border-top:1px solid #1f2937}
			.button{display:inline-block;padding:12px 18px;background:#3b82f6;border-radius:8px;color:#fff;text-decoration:none;font-weight:600}
		</style>
	</head>
	<body>
		<div class="container">
			<div class="header"><div class="brand">${APP_NAME}</div></div>
			<div class="content">
				<h1 class="title">${title}</h1>
				${bodyHtml}
			</div>
			<div class="footer">This email was intended for you by ${APP_NAME}. If you did not request this, you can safely ignore it.</div>
		</div>
	</body>
	</html>`;
}

function verificationTemplate({ username, token, verifyPath = '/auth/verify-email' }) {
	const url = `${APP_URL}${verifyPath}?token=${encodeURIComponent(token)}`;
	const bodyHtml = `
		<p>Hi ${username || 'there'},</p>
		<p>Verify your email address to complete your signup and secure your account.</p>
		<p><a class="button" href="${url}">Verify Email</a></p>
		<p>Or copy and paste this link into your browser:<br/>${url}</p>
	`;
	return baseTemplate({ title: 'Verify your email', bodyHtml });
}

async function sendEmail({ to, subject, html, text }) {
	const tx = getTransporter();
	// eslint-disable-next-line no-console
	console.log('[MAIL] sendEmail', { to, subject });
	const info = await tx.sendMail({ from: MAIL_FROM, to, subject, html, text });
	return info;
}

async function sendVerificationEmail({ to, username, token }) {
	const subject = 'Verify your email';
	const html = verificationTemplate({ username, token });
	// eslint-disable-next-line no-console
	console.log('[MAIL] sendVerificationEmail', { to });
	return await sendEmail({ to, subject, html });
}

module.exports = {
	sendEmail,
	sendVerificationEmail,
	verificationTemplate,
	baseTemplate,
};


