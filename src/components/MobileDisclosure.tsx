import {useId,useState,type ReactNode} from 'react';
import {CaretDown} from '@phosphor-icons/react';
export default function MobileDisclosure({summary,children,enabled=true}:{summary:ReactNode;children:ReactNode;enabled?:boolean}){
 const [open,setOpen]=useState(false);const id=useId();
 if(!enabled)return <>{children}</>;
 return <div className="mobile-disclosure" data-open={open}><button className="mobile-disclosure-toggle" type="button" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(!open)}>{summary}<CaretDown aria-hidden="true"/></button><div className="mobile-disclosure-body" id={id}>{children}</div></div>;
}
