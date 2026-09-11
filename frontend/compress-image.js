// Decode camera orientation before resizing; the server independently validates the upload.
export async function compressImage(file,max=1600){
 if(!file||!['image/jpeg','image/png'].includes(file.type))return file;
 let bitmap;try{bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});if(bitmap.width*bitmap.height>24000000)return file;const scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.84));return blob&&blob.size<file.size?new File([blob],file.name.replace(/\.(png|jpe?g)$/i,'.jpg'),{type:'image/jpeg'}):file;}catch{return file;}finally{bitmap?.close();}
}
