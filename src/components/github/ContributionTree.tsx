import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ContributionTreeProps {
  pushesThisWeek: number;
  className?: string;
}

/** Small bird silhouette for flying animation */
function BirdSilhouette({ delay = 0, size = 1, top = "20%" }: { delay?: number; size?: number; top?: string }) {
  return (
    <div
      className="absolute w-4 h-2 opacity-40 pointer-events-none animate-bird-fly text-foreground"
      style={{
        top,
        left: "-5%",
        animationDelay: `${delay}s`,
        transform: `scale(${size})`,
      }}
    >
      <svg viewBox="0 0 16 8" className="w-full h-full" fill="currentColor">
        <path d="M2 4 Q6 1 10 4 Q6 7 2 4 Z" />
      </svg>
    </div>
  );
}

/**
 * Reusable SVG tree illustration for the GitHub contribution card.
 * Single SVG for crisp rendering at all sizes. Trunk widens from ground,
 * branches connect naturally to a leaf-like canopy. Includes subtle bird silhouettes.
 */
export function ContributionTree({ pushesThisWeek, className }: ContributionTreeProps) {
  const isThriving = pushesThisWeek > 0;

  return (
    <div
      className={cn(
        "relative flex items-end justify-center min-h-[320px] w-full max-w-[280px] mx-auto overflow-visible",
        className
      )}
    >
      {/* Birds - overlay, fly across when thriving */}
      {isThriving && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <BirdSilhouette delay={0} size={1} top="18%" />
          <BirdSilhouette delay={4} size={0.8} top="12%" />
          <BirdSilhouette delay={7} size={0.7} top="25%" />
          <BirdSilhouette delay={11} size={0.6} top="8%" />
        </div>
      )}

      <motion.svg
        viewBox="0 0 200 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMax meet"
        className={cn(
          "w-full h-full origin-bottom",
          isThriving ? "animate-breeze-sway" : "animate-breeze-sway-strong"
        )}
        style={{ overflow: "visible" }}
      >
        {/* Definitions for reuse */}
        <defs>
          <linearGradient id="contributionTrunkGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="hsl(25 35% 22%)" />
            <stop offset="100%" stopColor="hsl(25 28% 14%)" />
          </linearGradient>
          <linearGradient id="contributionCanopyGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="hsl(158 48% 38%)" />
            <stop offset="100%" stopColor="hsl(158 40% 50%)" />
          </linearGradient>
        </defs>

        {isThriving ? (
          <>
            {/* Trunk - tapered, widens at base, starts from ground */}
            <path
              d="M 100 240 L 92 240 L 82 180 Q 78 120 85 70 Q 88 45 95 35 L 105 35 Q 112 45 115 70 Q 122 120 118 180 L 108 240 Z"
              fill="url(#contributionTrunkGrad)"
            />
            {/* Trunk highlight */}
            <path
              d="M 95 240 L 88 180 Q 85 120 90 70 Q 92 45 97 38"
              fill="none"
              stroke="hsl(25 30% 32%)"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="dark:stroke-amber-950/80"
              opacity={0.4}
            />

            {/* Branches - natural curves into canopy */}
            <path
              d="M 95 75 Q 65 55 45 40 Q 30 25 25 15"
              fill="none"
              stroke="hsl(25 30% 18%)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="dark:stroke-amber-950"
            />
            <path
              d="M 95 65 Q 55 40 35 20 Q 20 5 18 -5"
              fill="none"
              stroke="hsl(25 30% 18%)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="dark:stroke-amber-950"
            />
            <path
              d="M 105 70 Q 135 50 155 35 Q 172 22 178 12"
              fill="none"
              stroke="hsl(25 30% 18%)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="dark:stroke-amber-950"
            />
            <path
              d="M 105 60 Q 140 35 160 15 Q 175 0 182 -10"
              fill="none"
              stroke="hsl(25 30% 18%)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="dark:stroke-amber-950"
            />
            <path
              d="M 98 50 Q 98 20 96 -15"
              fill="none"
              stroke="hsl(25 30% 18%)"
              strokeWidth="3.5"
              strokeLinecap="round"
              className="dark:stroke-amber-950"
            />

            {/* Canopy - leaf-like clusters (organic shapes, not random circles) */}
            <g fill="url(#contributionCanopyGrad)">
              {/* Left cluster */}
              <path
                d="M 25 15 Q 10 25 5 45 Q 12 55 28 42 Q 35 28 25 15"
              />
              <path
                d="M 25 15 Q 20 35 25 55 Q 40 48 42 35 Q 38 28 25 15"
              />
              <path
                d="M 18 -5 Q 0 15 0 45 Q 0 65 20 55 Q 35 45 35 25 Q 30 5 18 -5"
              />
              {/* Center cluster */}
              <path
                d="M 96 -15 Q 75 -5 70 25 Q 75 50 95 45 Q 110 35 110 15 Q 105 -10 96 -15"
              />
              <path
                d="M 96 -15 Q 85 0 90 30 Q 85 55 96 50 Q 108 40 108 15 Q 105 -5 96 -15"
              />
              <path
                d="M 96 -15 Q 110 -5 115 20 Q 110 50 96 55 Q 85 45 82 20 Q 88 -5 96 -15"
              />
              {/* Right cluster */}
              <path
                d="M 182 -10 Q 165 5 160 35 Q 165 60 182 55 Q 195 45 195 25 Q 192 0 182 -10"
              />
              <path
                d="M 178 12 Q 195 25 195 50 Q 180 65 165 55 Q 155 45 162 25 Q 170 8 178 12"
              />
              <path
                d="M 182 -10 Q 198 0 200 30 Q 195 55 178 50 Q 168 40 172 18 Q 178 -5 182 -10"
              />
              {/* Highlight leaves (lighter) */}
              <path
                d="M 96 -15 Q 92 5 95 25 Q 100 40 96 50 Q 88 35 92 15 Q 94 -5 96 -15"
                fill="hsl(158 35% 55%)"
                className="dark:fill-emerald-500/80"
                opacity={0.8}
              />
            </g>
          </>
        ) : (
          <>
            {/* Wilting: bare trunk */}
            <path
              d="M 100 240 L 92 240 L 85 180 L 80 100 L 82 50 L 100 45 L 118 50 L 120 100 L 115 180 L 108 240 Z"
              fill="url(#contributionTrunkGrad)"
            />
            {/* Bare branches */}
            <path
              d="M 100 45 L 55 20 L 25 5"
              fill="none"
              stroke="hsl(25 25% 18%)"
              strokeWidth="2"
              strokeLinecap="round"
              className="dark:stroke-amber-950/80"
            />
            <path
              d="M 100 45 L 100 5"
              fill="none"
              stroke="hsl(25 25% 18%)"
              strokeWidth="2"
              strokeLinecap="round"
              className="dark:stroke-amber-950/80"
            />
            <path
              d="M 100 45 L 145 25 L 178 10"
              fill="none"
              stroke="hsl(25 25% 18%)"
              strokeWidth="2"
              strokeLinecap="round"
              className="dark:stroke-amber-950/80"
            />
            {/* Sparse dead leaves */}
            <ellipse cx="30" cy="10" rx="6" ry="8" fill="hsl(25 30% 18%)" opacity={0.5} />
            <ellipse cx="165" cy="35" rx="5" ry="7" fill="hsl(25 30% 18%)" opacity={0.4} />
          </>
        )}
      </motion.svg>

      {/* Wilting glow */}
      {!isThriving && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-amber-900/15 rounded-full blur-2xl animate-pulse" />
        </div>
      )}
    </div>
  );
}
