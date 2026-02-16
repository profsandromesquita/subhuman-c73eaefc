import { useEffect, useCallback, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";

// Use dynamic paths instead of static imports to reduce bundle size
const screens = [
  "/assets/landing/screen-1.png",
  "/assets/landing/screen-2.png",
  "/assets/landing/screen-3.png",
  "/assets/landing/screen-4.png",
  "/assets/landing/screen-5.png",
  "/assets/landing/screen-6.png",
];
const labels = ["Início", "Espaços", "Podcast", "IA", "Canais", "Perfil"];

export function PhoneMockupCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selected, setSelected] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelected(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    const interval = setInterval(() => emblaApi.scrollNext(), 3500);
    return () => {
      clearInterval(interval);
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative max-w-[252px] sm:max-w-[270px] mx-auto"
        style={{ perspective: "1000px" }}
      >
        <div
          className="rounded-[2.5rem] border-4 border-border overflow-hidden shadow-[0_0_60px_hsl(0_0%_100%_/_0.08)] bg-card"
          style={{ aspectRatio: "9/18" }}
        >
          <div ref={emblaRef} className="overflow-hidden h-full">
            <div className="flex h-full">
              {screens.map((src, i) => (
                <div key={i} className="flex-[0_0_100%] min-w-0 h-full bg-black">
                  <img
                    src={src}
                    alt={labels[i]}
                    className="w-full h-full object-contain object-top"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Dots */}
      <div className="flex gap-2 mt-4">
        {screens.map((_, i) => (
          <button
            key={i}
            onClick={() => emblaApi?.scrollTo(i)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              i === selected
                ? "bg-foreground w-6"
                : "bg-muted-foreground/30"
            }`}
            aria-label={`Ir para ${labels[i]}`}
          />
        ))}
      </div>
    </div>
  );
}
