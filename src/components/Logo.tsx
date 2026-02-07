import logoSrc from "@/assets/logo-subhumano.svg";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  sm: "h-8",
  md: "h-10",
  lg: "h-12",
  xl: "h-32",
};

export function Logo({ size = "md", className = "" }: LogoProps) {
  return (
    <img
      src={logoSrc}
      alt="Subhumano"
      className={`${sizeMap[size]} w-auto ${className}`}
    />
  );
}
