import {tx} from './language';
// Resize before transmission, preserving PNG alpha rather than flattening a frame.
export async function prepareAppearanceImage(file,kind){
 if(file.size>40*1024*1024)throw Error(tx('请选择 40 MB 以内的图片','Choose an image under 40 MB'));
 const sig=new Uint8Array(await file.slice(0,8).arrayBuffer());
 const png=[137,80,78,71,13,10,26,10].every((v,i)=>sig[i]===v),jpeg=sig[0]===255&&sig[1]===216;
 if(kind==='frame'?!png:!png&&!jpeg)throw Error(kind==='frame'?tx('请选择真正的 PNG 图片；修改文件后缀不会转换格式','Choose a PNG image; renaming an extension does not convert the image'):tx('请选择 JPG 或 PNG 图片','Choose a JPG or PNG image'));
 const url=URL.createObjectURL(file),img=new Image();
 try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error(tx('无法读取图片，请重新导出为 PNG 或 JPG','Cannot read this image. Export it again as PNG or JPG.')));img.src=url});
 const max=kind==='frame'?512:1280,scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));
 const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));const ctx=canvas.getContext('2d');if(!ctx)throw Error(tx('浏览器无法处理图片，请重试','The browser could not process this image. Please retry.'));
 if(kind!=='frame'){ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height)}ctx.drawImage(img,0,0,canvas.width,canvas.height);
 const type=kind==='frame'?'image/png':'image/jpeg',blob=await new Promise(resolve=>canvas.toBlob(resolve,type,.82));if(!blob)throw Error(tx('图片处理失败，请重试','Image processing failed. Please retry.'));
 return new File([blob],kind==='frame'?file.name:'profile-cover.jpg',{type});
 }finally{URL.revokeObjectURL(url)}
}
export function uploadImage(url,file,token,onProgress){return new Promise((resolve,reject)=>{
 const xhr=new XMLHttpRequest();xhr.open('POST',url);xhr.setRequestHeader('X-Workspace-Token',token);xhr.timeout=120000;
 xhr.upload.onprogress=e=>{if(e.lengthComputable)onProgress(Math.round(e.loaded/e.total*100))};
 xhr.onerror=()=>reject(Error(tx('网络中断，图片未上传。请重试','Connection interrupted. The image was not uploaded. Please retry.')));
 xhr.ontimeout=()=>reject(Error(tx('上传超时，请重试','Upload timed out. Please retry.')));
 xhr.onload=()=>{let data;try{data=JSON.parse(xhr.responseText)}catch{};if(xhr.status>=200&&xhr.status<300&&data)resolve(data);else reject(Error(data?.message||data?.detail||(xhr.status===413?tx('图片过大，请缩小后重试','Image is too large. Please resize it.'):tx('上传失败，请重试','Upload failed. Please retry.'))))};
 const fd=new FormData();fd.append('file',file);xhr.send(fd);
})}
