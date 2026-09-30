/**
 * How long "Resend Code" stays inert after a code goes out.
 *
 * The backend only allows 3 sends an hour per address or number
 * (`otp-send` in AppServiceProvider), so an impatient double-tap costs a third
 * of the hour's budget. A minute of waiting is also the clearest possible
 * signal that the first request really did go through.
 */
export const OTP_RESEND_COOLDOWN_SECONDS = 60;
