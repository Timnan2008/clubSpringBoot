export const MAX_ATTACHMENTS = 4;
export const MAX_ATTACHMENT_BYTES = 40 * 1024 * 1024;
export function appendAttachments(existing, selected) {
  const result = [...existing];
  for (const file of selected) {
    if (!result.some(old => old.name === file.name && old.size === file.size && old.lastModified === file.lastModified)) result.push(file);
  }
  if (result.length > MAX_ATTACHMENTS || result.some(file => file.size > MAX_ATTACHMENT_BYTES) || result.reduce((total, file) => total + file.size, 0) > MAX_ATTACHMENT_BYTES) return { files: existing, exceeded: true };
  return { files: result, exceeded: false };
}
