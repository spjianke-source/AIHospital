import clsx from 'clsx';
import { ReactNode } from 'react';

export default function Button({
  className,
  onClick,
  children,
  imgUrl,
  title,
}: {
  className?: string;
  onClick?: () => void;
  children: ReactNode;
  imgUrl?: string;
  title?: string;
}) {
  return (
    <button
      className={clsx('button', className)} // Uses the .button class from index.css
      onClick={onClick}
      title={title}
    >
      {imgUrl && <img src={imgUrl} className="w-5 h-5 mr-2 object-contain" alt="icon" />}
      {children}
    </button>
  );
}
