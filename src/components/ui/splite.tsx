import { Suspense, lazy, useState } from "react";
const Spline = lazy(() => import("@splinetool/react-spline"));

interface SplineSceneProps {
  scene: string;
  className?: string;
}

export function SplineScene({ scene, className }: SplineSceneProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`relative ${className ?? ""}`}>
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <span className="text-muted-foreground text-sm">Carregando...</span>
        </div>
      )}
      <Suspense fallback={null}>
        <Spline
          scene={scene}
          className={`w-full h-full transition-opacity duration-700 ${loaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setLoaded(true)}
        />
      </Suspense>
    </div>
  );
}
