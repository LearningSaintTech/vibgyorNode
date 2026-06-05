const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_WINDOW_MS = 60 * 1000;
const HARD_CODED_OTP = '123456';

/** SubAdmin module only */
const SUBADMIN_PHONE = '8888888888';

function isSubAdminPhone(phoneNumber) {
	return phoneNumber === SUBADMIN_PHONE;
}

module.exports = {
	OTP_TTL_MS,
	OTP_RESEND_WINDOW_MS,
	HARD_CODED_OTP,
	SUBADMIN_PHONE,
	isSubAdminPhone,
};
