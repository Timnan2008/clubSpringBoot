import translations from './translations.json';
const param=new URLSearchParams(location.search).get('lang');
const cookie=document.cookie.split('; ').find(v=>v.startsWith('club_language='))?.split('=')[1];
export const language=['en','zh'].includes(param)?param:(cookie==='en'?'en':'zh');
export const en=language==='en';
if(['en','zh'].includes(param))document.cookie=`club_language=${language}; Path=/; Max-Age=31536000; SameSite=Lax`;
export const tr=text=>{const value=en?(translations[text]??text):text;if(typeof value!=='string')return value;const parts=value.split(/\s+[/／]\s+/);if(parts.length===2&&/[\u3400-\u9fff]/.test(parts[0])&&/[a-zA-Z]/.test(parts[1])&&!/[\u3400-\u9fff]/.test(parts[1]))return parts[en?1:0];return value;};
export const tx=(zh,english)=>en?english:zh;
document.documentElement.lang=en?'en':'zh-CN';
export function changeLanguage(){const next=en?'zh':'en';document.cookie=`club_language=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;const url=new URL(location.href);url.searchParams.set('lang',next);location.assign(url.pathname+url.search+url.hash);}
