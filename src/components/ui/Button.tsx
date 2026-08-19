import Link from "next/link";

export type ButtonTone = "primary" | "ghost" | "outline" | "dark";
export type ButtonSize = "sm" | "lg";

type Common = {
  tone?: ButtonTone;
  size?: ButtonSize;
  block?: boolean;
  className?: string;
  children: React.ReactNode;
};

type AnchorProps = Common & { href: string };
type NativeProps = Common &
  React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

function classes({ tone, size, block, className }: Common) {
  return [
    "btn",
    tone && `btn--${tone}`,
    size && `btn--${size}`,
    block && "btn--block",
    className
  ]
    .filter(Boolean)
    .join(" ");
}

/** href 가 있으면 링크로, 없으면 버튼으로 렌더합니다. */
export function Button(props: AnchorProps | NativeProps) {
  if (typeof props.href === "string") {
    const { href, tone, size, block, className, children } = props;
    return (
      <Link href={href} className={classes({ tone, size, block, className, children })}>
        {children}
      </Link>
    );
  }
  const { tone, size, block, className, children, ...rest } = props;
  return (
    <button {...rest} className={classes({ tone, size, block, className, children })}>
      {children}
    </button>
  );
}
