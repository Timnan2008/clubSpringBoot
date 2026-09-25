// Display only. OpenClawAccess enforces the same policy on every server request.
export const canUseOpenClaw = (account) =>
  !!account && ["president", "teacher", "admin"].includes(account.role);
