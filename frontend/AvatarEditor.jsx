import {compressImage} from './compress-image';
import { tr } from "./language";
import { useEffect, useRef, useState } from 'react';
import Avatar from './Avatar';
export default function AvatarEditor({
  profile,
  onSaved
}) {
  const [file, setFile] = useState(null),
    [preview, setPreview] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const input = useRef(),
    lock = useRef(false);
  useEffect(() => {
    if (!file) {
      setPreview('');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  async function save(remove = false) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const form = new FormData();
      if (!remove) form.append('file', await compressImage(file,512));
      const r = await fetch('/api/campus-social/me/avatar', {
        method: remove ? 'DELETE' : 'POST',
        headers: {
          'X-Workspace-Token': profile.token
        },
        body: remove ? undefined : form
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.message || tr("头像保存失败"));
      await onSaved();
      setFile(null);
      if (input.current) input.current.value = '';
      setNotice(remove ? tr("已恢复默认头像") : tr("头像已更新"));
    } catch (e) {
      setError(tr(e.message));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return <section className="account-card avatar-editor"><Avatar person={{
      ...profile.account,
      avatarUrl: preview || profile.account.avatarUrl
    }} /><div className="avatar-editor-info"><h2>{tr("头像")}</h2><p className="account-hint">{tr("JPG / PNG，不超过 5 MB。图片将居中裁剪为正方形。")}</p><div className="avatar-editor-actions"><label>{tr("选择图片")}<input ref={input} type="file" aria-label={tr("选择头像图片")} accept="image/png,image/jpeg" disabled={busy} onChange={e => {
            const next = e.target.files?.[0];
            setError('');
            setNotice('');
            if (next && (!['image/png', 'image/jpeg'].includes(next.type) || next.size > 5 * 1024 * 1024)) {
              setError(tr("请选择不超过 5 MB 的 JPG 或 PNG 图片"));
              e.target.value = '';
              return;
            }
            setFile(next || null);
          }} /></label>{file && <button disabled={busy} onClick={() => save()}>{busy ? tr("上传中…") : tr("保存头像")}</button>}{profile.account.avatarUrl && !file && <button className="avatar-remove" disabled={busy} onClick={() => save(true)}>{tr("恢复默认头像")}</button>}</div>{file && <p className="avatar-status">{file.name}{tr("· 保存后生效")}</p>}{error && <p className="avatar-status" role="alert">{error}</p>}{notice && <p className="avatar-status" role="status">{notice}</p>}</div></section>;
}
