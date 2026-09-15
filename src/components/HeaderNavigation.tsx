import {useLayoutEffect, useState, type ReactNode} from 'react';
import {createPortal} from 'react-dom';

/** Keep screen-specific controls inside the shared app header. */
export default function HeaderNavigation({children}: {children: ReactNode}) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    setHost(document.querySelector<HTMLElement>('[data-header-navigation]'));
  }, []);
  return host ? createPortal(children, host) : null;
}
