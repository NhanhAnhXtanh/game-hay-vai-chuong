import type { ButtonHTMLAttributes } from "react";
// phần còn lại giữ nguyên
export function Button(props: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "outline" }) {
  const base = "px-4 py-2 rounded-md text-sm font-medium transition";
  const solid = "bg-blue-600 hover:bg-blue-700 text-white";
  const outline = "border border-gray-300 hover:bg-gray-50 text-gray-800";
  const cls = `${base} ${props.variant==="outline" ? outline : solid} ${props.className ?? ""}`;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { variant: _variant, ...rest } = props;
  return <button {...rest} className={cls} />;
}
