import { useMemo } from "react";

const SHAPE_TYPES = ["shape-ring", "shape-orbit", "shape-soft-circle"];
const ANIMATIONS = ["anim-spin", "anim-spin-rev"];
const SHAPE_SPOTS = [
  { left: "4%", top: "8%", size: 210 },
  { left: "82%", top: "10%", size: 170 },
  { left: "72%", top: "44%", size: 140 },
  { left: "6%", top: "62%", size: 190 },
  { left: "40%", top: "72%", size: 160 },
  { left: "88%", top: "78%", size: 130 }
];

function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export default function BackgroundShapes() {
  const shapes = useMemo(
    () =>
      SHAPE_SPOTS.map((spot, index) => {
        const duration = 18 + Math.floor(Math.random() * 14);
        const delay = -(Math.random() * 12).toFixed(2);
        return {
          id: index,
          type: randomFrom(SHAPE_TYPES),
          animation: randomFrom(ANIMATIONS),
          style: {
            left: spot.left,
            top: spot.top,
            width: `${spot.size}px`,
            height: `${spot.size}px`,
            opacity: 1,
            animationDuration: `${duration}s`,
            animationDelay: `${delay}s`
          }
        };
      }),
    []
  );

  return (
    <div className="bg-shapes" aria-hidden="true">
      {shapes.map((shape) => (
        <span key={shape.id} className={`shape ${shape.type} ${shape.animation}`} style={shape.style} />
      ))}
    </div>
  );
}
