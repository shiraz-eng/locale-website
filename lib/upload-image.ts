// Leave room for multipart headers below the hosting platform's 4.5 MB limit.
export const MAX_UPLOAD_BYTES=3_500_000;
export async function prepareUploadImage(file:File):Promise<File>{
  if(!["image/jpeg","image/png"].includes(file.type))throw new Error("Choose a JPEG or PNG image.");
  if(file.size>10*1024*1024)throw new Error("Images must be under 10 MB.");
  let bitmap:ImageBitmap;
  try{bitmap=await createImageBitmap(file)}catch{throw new Error("This image could not be opened. Choose a valid JPEG or PNG.")}
  try{
    let scale=Math.min(1,2400/Math.max(bitmap.width,bitmap.height));
    if(scale===1&&file.size<=MAX_UPLOAD_BYTES)return file;
    const canvas=document.createElement("canvas");
    for(let attempt=0;attempt<8;attempt++){
      canvas.width=Math.max(1,Math.round(bitmap.width*scale));
      canvas.height=Math.max(1,Math.round(bitmap.height*scale));
      const context=canvas.getContext("2d");
      if(!context)throw new Error("Image preparation failed. Try a smaller image.");
      context.drawImage(bitmap,0,0,canvas.width,canvas.height);
      const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,file.type,.86));
      if(blob&&blob.size<=MAX_UPLOAD_BYTES)return new File([blob],file.name,{type:file.type,lastModified:file.lastModified});
      scale*=.75;
    }
    throw new Error("This image is too large to upload. Choose a smaller image.");
  }finally{bitmap.close()}
}
