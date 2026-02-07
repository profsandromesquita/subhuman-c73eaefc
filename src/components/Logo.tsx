import logoSrc from "@/assets/logo.svg";
interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}
const sizeMap = {
  sm: "h-8",
  // 32px - header home
  md: "h-10",
  // 40px - auth pages
  lg: "h-12",
  // 48px - onboarding
  xl: "h-32" // 128px - landing hero
};
export function Logo({
  size = "md",
  className = ""
}: LogoProps) {
  return;
}