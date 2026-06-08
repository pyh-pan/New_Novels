"use client";

type IconName =
  | "chevronLeft"
  | "chevronRight"
  | "plus"
  | "rotate"
  | "send"
  | "trash"
  | "x";

type IconProps = {
  name: IconName;
  className?: string;
};

const paths: Record<IconName, string[]> = {
  chevronLeft: ["M15 18l-6-6 6-6"],
  chevronRight: ["M9 18l6-6-6-6"],
  plus: ["M12 5v14", "M5 12h14"],
  rotate: ["M4 12a8 8 0 0 1 13.4-5.9", "M18 3v5h-5", "M20 12a8 8 0 0 1-13.4 5.9", "M6 21v-5h5"],
  send: ["M21 3 10 14", "M21 3l-7 20-4-9-9-4 20-7Z"],
  trash: ["M4 7h16", "M10 11v6", "M14 11v6", "M6 7l1 14h10l1-14", "M9 7V4h6v3"],
  x: ["M18 6 6 18", "M6 6l12 12"]
};

export default function Icon({ name, className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={`ui-icon${className ? ` ${className}` : ""}`}
      fill="none"
      focusable="false"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      {paths[name].map((path) => (
        <path d={path} key={path} />
      ))}
    </svg>
  );
}
