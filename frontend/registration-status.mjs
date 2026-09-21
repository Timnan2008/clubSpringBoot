export function alreadyRegistered(message) {
  return /已注册|已绑定账户|已被使用|already registered|already in use/i.test(
    String(message || ""),
  );
}
