type Props = {
  href: string;
  fileName?: string;
  children: React.ReactNode;
  className?: string;
};

export function DownloadButton({ href, fileName, children, className }: Props) {
  return (
    <a
      href={href}
      download={fileName ?? true}
      className={
        className ??
        'group inline-flex items-center gap-3 font-mono text-body-sm text-dark'
      }
    >
      <span aria-hidden className="opacity-60 transition-opacity duration-500 ease-expo group-hover:opacity-100">↓</span>
      <span className="hover-wipe-underline">{children}</span>
    </a>
  );
}
