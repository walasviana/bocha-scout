import {useEffect} from 'react';
import './LiveTimerBridge.css';

export default function LiveTimerBridge(){
  useEffect(()=>{
    let lastTime='00:00';
    let badge:HTMLDivElement|null=null;

    const ensureBadge=()=>{
      const page=document.querySelector('.scout-live-page');
      const board=document.querySelector<HTMLElement>('.scout-scoreboard');
      const endPill=document.querySelector<HTMLElement>('.scout-scoreboard .scout-end-pill');
      if(!page||!board||!endPill){badge?.remove();badge=null;return null;}
      if(!badge){
        badge=document.createElement('div');
        badge.className='scout-auto-timer';
        badge.setAttribute('aria-live','polite');
        badge.innerHTML='<span>⏱</span><strong>00:00</strong>';
        board.appendChild(badge);
      }
      return badge;
    };

    const sync=()=>{
      const current=ensureBadge();
      if(!current)return;
      const output=document.querySelector<HTMLOutputElement>('.scout-live-page .throw-timer output');
      if(output?.textContent?.trim()) lastTime=output.textContent.trim();
      const value=current.querySelector('strong');
      // Avoid observing our own unchanged text writes in an endless microtask loop.
      if(value && value.textContent!==lastTime)value.textContent=lastTime;
      current.classList.toggle('is-running',Boolean(document.querySelector('.scout-live-page .throw-timer button')?.textContent?.includes('Pausar')));
    };

    const startTimerAfterColor=(event:Event)=>{
      const target=event.target as HTMLElement|null;
      const button=target?.closest?.('.scout-live-page .scout-color-grid button') as HTMLButtonElement|null;
      if(!button||button.disabled)return;
      lastTime='00:00';
      setTimeout(()=>{
        const timerButton=Array.from(document.querySelectorAll<HTMLButtonElement>('.scout-live-page .throw-timer button')).find(item=>item.textContent?.includes('Iniciar cronômetro'));
        timerButton?.click();
        sync();
      },0);
    };

    const observer=new MutationObserver(sync);
    observer.observe(document.body,{subtree:true,childList:true,characterData:true});
    document.addEventListener('click',startTimerAfterColor,true);
    sync();

    return()=>{
      observer.disconnect();
      document.removeEventListener('click',startTimerAfterColor,true);
      badge?.remove();
    };
  },[]);

  return null;
}

