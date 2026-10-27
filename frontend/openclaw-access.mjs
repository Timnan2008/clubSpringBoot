// Display only. OpenClawAccess enforces the same policy on every server request.
export const canUseOpenClaw = (account) => !!account && account.role === "admin";
