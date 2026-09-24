export const MAX_ATTACHMENTS = 4;
export const MAX_ATTACHMENT_BYTES = 40 * 1024 * 1024;
const ALLOWED_ATTACHMENT = /\.(jpe?g|png|mp4|mov|pdf|txt)$/i;

export function attachmentAllowed(file) {
  return ALLOWED_ATTACHMENT.test(file?.name || "");
}

let pickerGuardUntil = 0;

export function armAttachmentPicker() {
  pickerGuardUntil = Date.now() + 4000;
  if (typeof window === "undefined") return;
  const release = () => {
    window.removeEventListener("focus", release);
    pickerGuardUntil = Date.now() + 700;
  };
  window.addEventListener("focus", release);
}

export function noteAttachmentPickerClosed() {
  pickerGuardUntil = Date.now() + 700;
}

export function attachmentPickerArmed() {
  return Date.now() < pickerGuardUntil;
}
export function appendAttachments(existing, selected) {
  const result = [...existing];
  for (const file of selected) {
    if (
      !result.some(
        (old) =>
          old.name === file.name &&
          old.size === file.size &&
          old.lastModified === file.lastModified,
      )
    )
      result.push(file);
  }
  if (
    result.length > MAX_ATTACHMENTS ||
    result.some((file) => file.size > MAX_ATTACHMENT_BYTES) ||
    result.reduce((total, file) => total + file.size, 0) > MAX_ATTACHMENT_BYTES
  )
    return { files: existing, exceeded: true };
  return { files: result, exceeded: false };
}
