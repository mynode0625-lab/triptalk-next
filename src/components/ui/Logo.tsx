import Link from "next/link";

type Props = {
  href: string;
  /** light: 어두운 배경용 · sm: 연습실 상단바용 */
  variant?: "default" | "light" | "sm";
};

export function Logo({ href, variant = "default" }: Props) {
  const cls =
    "logo" +
    (variant === "light" ? " logo--light" : "") +
    (variant === "sm" ? " logo--sm" : "");
  return (
    <Link href={href} className={cls}>
      <span className="logo__mark">✈</span>
      <span className="logo__text">
        Trip<b>Talk</b>
      </span>
    </Link>
  );
}
