import type { ButtonHTMLAttributes, ReactNode } from "react";
import { track } from "../analytics";
export function Button({
  children,
  label,
  active = false,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      {...props}
      type="button"
      title={label}
      aria-label={label}
      className={`button ${active ? "active" : ""} ${className}`}
      onClick={(e) => {
        track("control_clicked", { control: label });
        props.onClick?.(e);
      }}
    >
      {children}
    </button>
  );
}
