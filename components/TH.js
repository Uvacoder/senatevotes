import classnames from 'classnames';
import React from 'react';

export default function TH({ className, children }) {
  return <th className={classnames('px-4 py-2', className)}>{children}</th>;
}
