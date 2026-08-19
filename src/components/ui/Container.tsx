type Props = {
  children: React.ReactNode;
  narrow?: boolean;
  className?: string;
};

export function Container({ children, narrow, className }: Props) {
  const cls = ["container", narrow && "container--narrow", className]
    .filter(Boolean)
    .join(" ");
  return <div className={cls}>{children}</div>;
}
