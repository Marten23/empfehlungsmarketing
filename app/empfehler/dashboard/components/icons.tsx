import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function IconBase(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    />
  );
}

export function SparklesIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3z" />
      <path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14z" />
      <path d="M5 14l.8 1.8L8 16.5l-2.2.8L5 19.5l-.8-2.2L2 16.5l2.2-.7L5 14z" />
    </IconBase>
  );
}

export function GiftIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3" y="8" width="18" height="13" rx="2" />
      <path d="M12 8v13" />
      <path d="M3 12h18" />
      <path d="M12 8c-1.6 0-3-1.2-3-2.7S10.2 3 12 5c1.8-2 3 0 3 1.3S13.6 8 12 8z" />
    </IconBase>
  );
}

export function TrophyIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M8 4h8v3a4 4 0 01-8 0V4z" />
      <path d="M8 6H5a2 2 0 002 2h1" />
      <path d="M16 6h3a2 2 0 01-2 2h-1" />
      <path d="M12 11v4" />
      <path d="M9 19h6" />
    </IconBase>
  );
}

export function BoltIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M13 2L5 13h6l-1 9 8-11h-6l1-9z" />
    </IconBase>
  );
}

export function BookIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 4h11a3 3 0 013 3v12H8a3 3 0 00-3 3V4z" />
      <path d="M8 22V10a3 3 0 013-3h8" />
    </IconBase>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M16 11a3 3 0 100-6 3 3 0 000 6z" />
      <path d="M8 12a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" />
      <path d="M2 20a6 6 0 0112 0" />
      <path d="M13 20a5 5 0 019 0" />
    </IconBase>
  );
}

export function TargetIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1.5" />
    </IconBase>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </IconBase>
  );
}

export function ArrowUpRightIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7 17L17 7" />
      <path d="M9 7h8v8" />
    </IconBase>
  );
}
