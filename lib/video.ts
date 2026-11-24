// Only known YouTube/Vimeo addresses become embeds (no-cookie YouTube domain); anything else is ignored.
export function embed(url?:string|null){
  if(!url)return null;
  const youtube=url.match(/^https:\/\/(?:(?:www\.)?youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,20})/);
  if(youtube)return "https://www.youtube-nocookie.com/embed/"+youtube[1]+"?autoplay=1&rel=0";
  const vimeo=url.match(/^https:\/\/(?:player\.)?vimeo\.com\/(?:video\/)?(\d{4,12})/);
  return vimeo?"https://player.vimeo.com/video/"+vimeo[1]+"?autoplay=1&dnt=1":null;
}
