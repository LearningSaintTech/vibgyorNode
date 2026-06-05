const HARD_CODED_OTP = '123456';
const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_WINDOW_MS = 60 * 1000;
const USER_SAFE_SELECT = '-otpCode -otpExpiresAt -emailOtpCode -emailOtpExpiresAt';

module.exports = {
	HARD_CODED_OTP,
	OTP_TTL_MS,
	RESEND_WINDOW_MS,
	USER_SAFE_SELECT,
};
