"use client";

import {useEffect,useEffectEvent,type RefObject} from "react";

export function useModalFocus(active:boolean, panel:RefObject<HTMLElement|null>, dismiss:()=>void, opener?:RefObject<HTMLElement|null>){
  const close=useEffectEvent(dismiss);
  useEffect(()=>{
    const element=panel.current;
    if(!active||!element)return;
    const previous=opener?.current??document.activeElement;
    const overflow=document.body.style.overflow;
    document.body.style.overflow="hidden";
    const controls=()=>Array.from(element.querySelectorAll<HTMLElement>('a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),iframe,[tabindex="0"]')).filter(node=>node.getClientRects().length>0);
    (controls()[0]??element).focus();
    const keydown=(event:KeyboardEvent)=>{
      if(event.defaultPrevented)return;
      if(event.key==="Escape"){event.preventDefault();close();return}
      if(event.key!=="Tab")return;
      const items=controls(), first=items[0], last=items.at(-1);
      if(!first||!last){event.preventDefault();return}
      if(!element.contains(document.activeElement)||document.activeElement===(event.shiftKey?first:last)){
        event.preventDefault();
        (event.shiftKey?last:first).focus();
      }
    };
    document.addEventListener("keydown",keydown);
    return ()=>{
      document.removeEventListener("keydown",keydown);
      document.body.style.overflow=overflow;
      if(previous instanceof HTMLElement&&previous.isConnected)previous.focus();
    };
  },[active,panel,opener]);
}
