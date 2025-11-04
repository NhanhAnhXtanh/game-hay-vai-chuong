import { HTMLAttributes } from "react";

export function Card(props: HTMLAttributes<HTMLDivElement>) {
  const cls = `rounded-xl border border-gray-200 bg-white ${props.className ?? ""}`;
  return <div {...props} className={cls} />;
}
