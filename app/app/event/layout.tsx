import type {
  ReactNode,
} from 'react';

import FirstMenuSuccessGuide
  from './FirstMenuSuccessGuide';

export default function EventLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <FirstMenuSuccessGuide />
      {children}
    </>
  );
}
