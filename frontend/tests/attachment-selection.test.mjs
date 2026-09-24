import { test } from "node:test";
import assert from "node:assert/strict";
import {
  appendAttachments,
  armAttachmentPicker,
  attachmentAllowed,
  attachmentPickerArmed,
  noteAttachmentPickerClosed,
} from "../attachment-selection.mjs";

test("campus wall attachments keep photos, video, pdf and text", () => {
  for (const name of ["photo.jpg", "scan.PDF", "clip.mp4", "notes.txt", "film.MOV", "icon.png"])
    assert.equal(attachmentAllowed({ name }), true);
  for (const name of ["song.mp3", "Mac.pem", "notes.docx", "archive.zip"])
    assert.equal(attachmentAllowed({ name }), false);
});

test("a file dialog guards the page until it closes", () => {
  assert.equal(attachmentPickerArmed(), false);
  armAttachmentPicker();
  assert.equal(attachmentPickerArmed(), true);
  noteAttachmentPickerClosed();
  assert.equal(attachmentPickerArmed(), true);
  const kept = appendAttachments([], [{ name: "a.pdf", size: 10, lastModified: 1 }]);
  assert.equal(kept.files.length, 1);
});
