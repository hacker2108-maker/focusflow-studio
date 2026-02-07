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
      className="absolute w-5 h-2.5 opacity-50 pointer-events-none animate-bird-fly text-foreground"
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
      {/* Birds flying - overlay when thriving */}
      {isThriving && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <BirdSilhouette delay={0} size={1.1} top="5%" />
          <BirdSilhouette delay={2} size={0.9} top="15%" />
          <BirdSilhouette delay={5} size={0.85} top="22%" />
          <BirdSilhouette delay={8} size={0.75} top="10%" />
          <BirdSilhouette delay={11} size={0.7} top="28%" />
          <BirdSilhouette delay={14} size={0.6} top="3%" />
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
            <stop offset="0%" stopColor="hsl(142 45% 28%)" />
            <stop offset="50%" stopColor="hsl(142 50% 38%)" />
            <stop offset="100%" stopColor="hsl(128 45% 45%)" />
          </linearGradient>
          <linearGradient id="contributionLeafDark" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="hsl(135 55% 22%)" />
            <stop offset="100%" stopColor="hsl(130 50% 32%)" />
          </linearGradient>
          <linearGradient id="contributionLeafLight" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="hsl(128 45% 42%)" />
            <stop offset="100%" stopColor="hsl(120 40% 55%)" />
          </linearGradient>
          {/* Small 5-petal flower symbol */}
          <g id="flower">
            <ellipse cx="0" cy="0" rx="2.5" ry="4" fill="hsl(350 80% 95%)" transform="rotate(0)" />
            <ellipse cx="0" cy="0" rx="2.5" ry="4" fill="hsl(350 80% 95%)" transform="rotate(72)" />
            <ellipse cx="0" cy="0" rx="2.5" ry="4" fill="hsl(350 80% 95%)" transform="rotate(144)" />
            <ellipse cx="0" cy="0" rx="2.5" ry="4" fill="hsl(350 80% 95%)" transform="rotate(216)" />
            <ellipse cx="0" cy="0" rx="2.5" ry="4" fill="hsl(350 80% 95%)" transform="rotate(288)" />
            <circle cx="0" cy="0" r="1.5" fill="hsl(45 90% 60%)" />
          </g>
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
            {/* Extra branches - more forks and limbs */}
            <path
              d="M 95 80 Q 72 65 55 55 Q 42 48 35 38"
              fill="none"
              stroke="hsl(25 30% 18%)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="dark:stroke-amber-950"
            />
            <path
              d="M 92 85 Q 62 68 40 58 Q 25 52 18 45"
              fill="none"
              stroke="hsl(25 30% 18%)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="dark:stroke-amber-950"
            />
            <path
              d="M 105 82 Q 132 62 148 52 Q 162 45 168 38"
              fill="none"
              stroke="hsl(25 30% 18%)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="dark:stroke-amber-950"
            />
            <path
              d="M 108 88 Q 138 68 155 55 Q 170 42 178 32"
              fill="none"
              stroke="hsl(25 30% 18%)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="dark:stroke-amber-950"
            />
            <path
              d="M 100 45 Q 85 35 72 28 Q 58 22 50 18"
              fill="none"
              stroke="hsl(25 30% 18%)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="dark:stroke-amber-950"
            />
            <path
              d="M 100 42 Q 118 32 132 25 Q 145 18 155 12"
              fill="none"
              stroke="hsl(25 30% 18%)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="dark:stroke-amber-950"
            />
            {/* Secondary forks from main branches */}
            <path
              d="M 45 40 Q 32 48 25 58 Q 18 68 12 75"
              fill="none"
              stroke="hsl(25 28% 16%)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="dark:stroke-amber-950"
            />
            <path
              d="M 35 20 Q 22 28 15 42 Q 8 55 5 65"
              fill="none"
              stroke="hsl(25 28% 16%)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="dark:stroke-amber-950"
            />
            <path
              d="M 155 35 Q 168 42 178 52 Q 188 62 195 72"
              fill="none"
              stroke="hsl(25 28% 16%)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="dark:stroke-amber-950"
            />
            <path
              d="M 160 15 Q 172 25 182 38 Q 192 52 198 65"
              fill="none"
              stroke="hsl(25 28% 16%)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="dark:stroke-amber-950"
            />

            {/* Canopy - dense healthy foliage (forest green) */}
            <g fill="url(#contributionCanopyGrad)">
              {/* Left cluster - fuller */}
              <path d="M 25 15 Q 10 25 5 45 Q 12 55 28 42 Q 35 28 25 15" />
              <path d="M 25 15 Q 20 35 25 55 Q 40 48 42 35 Q 38 28 25 15" />
              <path d="M 18 -5 Q 0 15 0 45 Q 0 65 20 55 Q 35 45 35 25 Q 30 5 18 -5" />
              <path d="M 30 25 Q 15 35 12 52 Q 25 55 38 45 Q 42 35 30 25" />
              <path d="M 10 35 Q -5 45 0 62 Q 15 58 25 48 Q 22 40 10 35" />
              {/* Center cluster - fuller */}
              <path d="M 96 -15 Q 75 -5 70 25 Q 75 50 95 45 Q 110 35 110 15 Q 105 -10 96 -15" />
              <path d="M 96 -15 Q 85 0 90 30 Q 85 55 96 50 Q 108 40 108 15 Q 105 -5 96 -15" />
              <path d="M 96 -15 Q 110 -5 115 20 Q 110 50 96 55 Q 85 45 82 20 Q 88 -5 96 -15" />
              <path d="M 92 5 Q 72 15 68 38 Q 78 55 98 50 Q 112 35 108 15 Q 100 8 92 5" />
              <path d="M 100 25 Q 80 35 85 55 Q 100 60 115 45 Q 118 30 100 25" />
              <path d="M 88 -5 Q 110 5 115 28 Q 108 48 90 42 Q 82 25 88 -5" />
              {/* Right cluster - fuller */}
              <path d="M 182 -10 Q 165 5 160 35 Q 165 60 182 55 Q 195 45 195 25 Q 192 0 182 -10" />
              <path d="M 178 12 Q 195 25 195 50 Q 180 65 165 55 Q 155 45 162 25 Q 170 8 178 12" />
              <path d="M 182 -10 Q 198 0 200 30 Q 195 55 178 50 Q 168 40 172 18 Q 178 -5 182 -10" />
              <path d="M 175 5 Q 192 18 190 45 Q 178 62 162 55 Q 158 35 175 5" />
              <path d="M 188 28 Q 200 38 198 58 Q 185 68 172 58 Q 168 45 188 28" />
              <path d="M 165 42 Q 182 52 185 72 Q 172 78 160 65 Q 162 50 165 42" />
              {/* Highlight leaves */}
              <path d="M 96 -15 Q 92 5 95 25 Q 100 40 96 50 Q 88 35 92 15 Q 94 -5 96 -15" fill="hsl(128 45% 52%)" opacity={0.9} />
              <path d="M 25 25 Q 35 40 42 35 Q 38 25 30 20 Q 28 22 25 25" fill="hsl(128 45% 50%)" opacity={0.85} />
              <path d="M 175 20 Q 185 35 182 45 Q 178 35 172 28 Q 173 22 175 20" fill="hsl(128 45% 50%)" opacity={0.85} />
            </g>

            {/* Dense foliage along every branch - dark leaf tufts */}
            <g fill="url(#contributionLeafDark)">
              <path d="M 38 35 Q 28 40 22 52 Q 30 50 38 42 Q 40 38 38 35" />
              <path d="M 55 48 Q 48 55 45 65 Q 55 62 60 52 Q 58 48 55 48" />
              <path d="M 70 35 Q 78 28 85 35 Q 82 45 72 48 Q 68 42 70 35" />
              <path d="M 125 25 Q 132 18 140 22 Q 138 32 128 35 Q 124 30 125 25" />
              <path d="M 155 38 Q 162 32 170 38 Q 168 48 158 50 Q 153 45 155 38" />
              <path d="M 48 58 Q 40 65 38 75 Q 50 72 55 62 Q 52 58 48 58" />
              <path d="M 95 58 Q 88 65 92 75 Q 102 70 105 58 Q 100 55 95 58" />
              <path d="M 148 50 Q 142 58 145 68 Q 155 65 158 52 Q 152 48 148 50" />
              <path d="M 65 70 Q 58 78 62 88 Q 72 82 78 72 Q 72 68 65 70" />
              <path d="M 135 42 Q 128 50 132 60 Q 142 55 145 45 Q 138 40 135 42" />
            </g>
            <g fill="url(#contributionLeafLight)">
              <path d="M 28 22 Q 18 28 15 42 Q 22 40 30 35 Q 30 28 28 22" />
              <path d="M 50 38 Q 42 42 38 52 Q 48 50 54 42 Q 52 38 50 38" />
              <path d="M 82 22 Q 90 15 98 22 Q 95 32 85 35 Q 82 28 82 22" />
              <path d="M 112 18 Q 120 12 128 18 Q 125 28 115 30 Q 110 25 112 18" />
              <path d="M 140 32 Q 148 26 156 32 Q 153 42 143 45 Q 138 38 140 32" />
              <path d="M 172 25 Q 180 18 188 25 Q 185 35 175 38 Q 170 32 172 25" />
              <path d="M 20 45 Q 12 52 18 62 Q 28 58 32 48 Q 26 42 20 45" />
              <path d="M 42 15 Q 32 22 35 35 Q 48 32 50 22 Q 45 15 42 15" />
              <path d="M 68 48 Q 62 55 68 65 Q 80 60 82 50 Q 75 45 68 48" />
              <path d="M 98 42 Q 90 48 95 58 Q 108 52 110 42 Q 102 38 98 42" />
              <path d="M 118 8 Q 108 15 112 28 Q 125 22 128 12 Q 120 5 118 8" />
              <path d="M 145 18 Q 138 25 142 38 Q 152 32 155 22 Q 148 15 145 18" />
              <path d="M 168 38 Q 162 45 168 55 Q 178 50 180 40 Q 172 35 168 38" />
              <path d="M 185 42 Q 178 50 182 62 Q 192 58 195 48 Q 188 42 185 42" />
            </g>
            {/* Leaf clusters throughout - fill gaps */}
            <g fill="hsl(135 50% 32%)">
              <ellipse cx="55" cy="42" rx="10" ry="12" />
              <ellipse cx="75" cy="55" rx="8" ry="10" />
              <ellipse cx="45" cy="55" rx="7" ry="9" />
              <ellipse cx="90" cy="48" rx="9" ry="11" />
              <ellipse cx="110" cy="35" rx="8" ry="10" />
              <ellipse cx="130" cy="28" rx="9" ry="11" />
              <ellipse cx="150" cy="45" rx="8" ry="10" />
              <ellipse cx="165" cy="35" rx="7" ry="9" />
              <ellipse cx="32" cy="38" rx="8" ry="10" />
              <ellipse cx="15" cy="52" rx="6" ry="8" />
              <ellipse cx="100" cy="28" rx="8" ry="10" />
              <ellipse cx="178" cy="38" rx="7" ry="9" />
            </g>
            {/* Extra mid-branch foliage - lush fill */}
            <g fill="hsl(142 48% 35%)">
              <ellipse cx="62" cy="62" rx="6" ry="8" />
              <ellipse cx="85" cy="62" rx="5" ry="7" />
              <ellipse cx="102" cy="52" rx="6" ry="8" />
              <ellipse cx="122" cy="38" rx="5" ry="7" />
              <ellipse cx="142" cy="48" rx="6" ry="8" />
              <ellipse cx="38" cy="18" rx="5" ry="7" />
              <ellipse cx="158" cy="22" rx="5" ry="7" />
            </g>

            {/* MASSIVE foliage overflow - extra canopy layers */}
            <g fill="url(#contributionCanopyGrad)" opacity={0.9}>
              <path d="M 8 48 Q -2 58 5 75 Q 22 72 28 58 Q 22 52 8 48" />
              <path d="M 35 8 Q 22 15 18 35 Q 28 42 42 35 Q 45 22 35 8" />
              <path d="M 52 68 Q 42 75 45 90 Q 58 88 62 75 Q 56 68 52 68" />
              <path d="M 78 68 Q 68 75 72 88 Q 85 85 88 72 Q 82 68 78 68" />
              <path d="M 72 18 Q 62 25 65 42 Q 82 38 88 28 Q 80 20 72 18" />
              <path d="M 108 2 Q 95 8 98 25 Q 112 22 115 12 Q 110 4 108 2" />
              <path d="M 128 8 Q 118 15 120 28 Q 132 25 135 15 Q 130 10 128 8" />
              <path d="M 92 72 Q 82 78 85 92 Q 98 90 102 78 Q 96 72 92 72" />
              <path d="M 115 52 Q 105 58 108 72 Q 122 68 125 58 Q 118 52 115 52" />
              <path d="M 138 58 Q 128 65 132 78 Q 145 75 148 65 Q 142 58 138 58" />
              <path d="M 168 15 Q 155 22 158 38 Q 172 35 175 25 Q 170 18 168 15" />
              <path d="M 192 35 Q 182 42 185 55 Q 198 52 200 42 Q 195 35 192 35" />
              <path d="M 175 68 Q 165 75 168 88 Q 182 85 185 72 Q 178 68 175 68" />
              <path d="M 152 72 Q 142 78 145 92 Q 158 88 162 78 Q 155 72 152 72" />
            </g>
            {/* Even more leaf tufts - everywhere */}
            <g fill="url(#contributionLeafDark)">
              <path d="M 22 65 Q 15 72 20 82 Q 32 78 35 68 Q 28 65 22 65" />
              <path d="M 58 82 Q 50 88 55 98 Q 68 95 72 85 Q 62 80 58 82" />
              <path d="M 108 75 Q 100 82 105 92 Q 118 88 120 78 Q 112 72 108 75" />
              <path d="M 125 62 Q 118 68 122 78 Q 135 75 138 65 Q 128 60 125 62" />
              <path d="M 162 58 Q 155 65 158 75 Q 170 72 172 62 Q 165 55 162 58" />
              <path d="M 188 52 Q 182 58 185 68 Q 195 65 198 55 Q 192 50 188 52" />
              <path d="M 12 28 Q 5 35 10 45 Q 22 42 25 32 Q 18 28 12 28" />
              <path d="M 175 85 Q 168 92 172 102 Q 182 98 185 88 Q 178 82 175 85" />
            </g>
            <g fill="url(#contributionLeafLight)">
              <path d="M 5 58 Q -2 65 2 75 Q 15 72 18 62 Q 10 58 5 58" />
              <path d="M 25 68 Q 18 75 22 85 Q 35 82 38 72 Q 28 68 25 68" />
              <path d="M 48 25 Q 40 32 45 42 Q 58 38 62 28 Q 52 22 48 25" />
              <path d="M 72 35 Q 65 42 68 52 Q 82 48 85 38 Q 75 32 72 35" />
              <path d="M 92 32 Q 85 38 88 48 Q 102 45 105 35 Q 95 28 92 32" />
              <path d="M 115 45 Q 108 52 112 62 Q 125 58 128 48 Q 118 42 115 45" />
              <path d="M 135 55 Q 128 62 132 72 Q 145 68 148 58 Q 138 52 135 55" />
              <path d="M 158 45 Q 152 52 155 62 Q 168 58 170 48 Q 162 42 158 45" />
              <path d="M 182 55 Q 175 62 178 72 Q 192 68 195 58 Q 185 52 182 55" />
              <path d="M 198 28 Q 192 35 195 45 Q 205 42 208 32 Q 200 25 198 28" />
            </g>
            {/* Dense filler ellipses - cover every gap */}
            <g fill="hsl(135 48% 30%)">
              <ellipse cx="18" cy="62" rx="6" ry="8" />
              <ellipse cx="38" cy="72" rx="5" ry="7" />
              <ellipse cx="58" cy="78" rx="6" ry="8" />
              <ellipse cx="78" cy="78" rx="5" ry="7" />
              <ellipse cx="98" cy="68" rx="6" ry="8" />
              <ellipse cx="118" cy="58" rx="5" ry="7" />
              <ellipse cx="138" cy="62" rx="6" ry="8" />
              <ellipse cx="158" cy="58" rx="5" ry="7" />
              <ellipse cx="178" cy="62" rx="6" ry="8" />
              <ellipse cx="8" cy="38" rx="5" ry="7" />
              <ellipse cx="28" cy="8" rx="5" ry="6" />
              <ellipse cx="48" cy="12" rx="4" ry="6" />
              <ellipse cx="68" cy="8" rx="5" ry="6" />
              <ellipse cx="88" cy="12" rx="4" ry="6" />
              <ellipse cx="108" cy="5" rx="5" ry="6" />
              <ellipse cx="128" cy="12" rx="4" ry="6" />
              <ellipse cx="148" cy="8" rx="5" ry="6" />
              <ellipse cx="168" cy="12" rx="4" ry="6" />
              <ellipse cx="188" cy="25" rx="5" ry="7" />
              <ellipse cx="198" cy="48" rx="4" ry="6" />
            </g>
            <g fill="hsl(128 50% 38%)">
              <ellipse cx="32" cy="52" rx="5" ry="7" />
              <ellipse cx="52" cy="48" rx="5" ry="6" />
              <ellipse cx="72" cy="48" rx="5" ry="7" />
              <ellipse cx="92" cy="42" rx="5" ry="6" />
              <ellipse cx="112" cy="42" rx="5" ry="7" />
              <ellipse cx="132" cy="48" rx="5" ry="6" />
              <ellipse cx="152" cy="48" rx="5" ry="7" />
              <ellipse cx="172" cy="52" rx="5" ry="6" />
              <ellipse cx="22" cy="22" rx="4" ry="6" />
              <ellipse cx="62" cy="22" rx="4" ry="5" />
              <ellipse cx="102" cy="18" rx="4" ry="6" />
              <ellipse cx="142" cy="22" rx="4" ry="5" />
              <ellipse cx="182" cy="22" rx="4" ry="6" />
            </g>
            {/* Tiny accent leaves - micro clusters */}
            <g fill="hsl(140 45% 42%)">
              <ellipse cx="15" cy="42" rx="4" ry="5" />
              <ellipse cx="42" cy="48" rx="4" ry="5" />
              <ellipse cx="65" cy="55" rx="4" ry="5" />
              <ellipse cx="85" cy="55" rx="4" ry="5" />
              <ellipse cx="105" cy="48" rx="4" ry="5" />
              <ellipse cx="125" cy="42" rx="4" ry="5" />
              <ellipse cx="145" cy="48" rx="4" ry="5" />
              <ellipse cx="165" cy="48" rx="4" ry="5" />
              <ellipse cx="185" cy="42" rx="4" ry="5" />
              <ellipse cx="35" cy="32" rx="3" ry="5" />
              <ellipse cx="75" cy="32" rx="3" ry="5" />
              <ellipse cx="115" cy="28" rx="3" ry="5" />
              <ellipse cx="155" cy="32" rx="3" ry="5" />
            </g>

            {/* Foliage on NEW branches - leaf clusters along extra limbs */}
            <g fill="url(#contributionLeafDark)">
              <path d="M 38 42 Q 28 48 25 58 Q 35 55 42 45 Q 40 42 38 42" />
              <path d="M 28 52 Q 18 58 15 68 Q 25 65 32 55 Q 30 50 28 52" />
              <path d="M 12 68 Q 2 75 5 85 Q 18 82 22 72 Q 18 68 12 68" />
              <path d="M 10 55 Q 0 62 2 72 Q 15 68 18 58 Q 12 52 10 55" />
              <path d="M 158 45 Q 168 52 172 62 Q 182 58 185 48 Q 175 42 158 45" />
              <path d="M 172 52 Q 182 58 188 68 Q 198 65 200 55 Q 188 48 172 52" />
              <path d="M 190 68 Q 198 75 200 85 Q 192 82 188 72 Q 188 68 190 68" />
              <path d="M 192 55 Q 200 62 198 72 Q 192 68 188 58 Q 190 52 192 55" />
            </g>
            <g fill="url(#contributionLeafLight)">
              <path d="M 52 22 Q 42 28 45 38 Q 58 35 62 25 Q 55 18 52 22" />
              <path d="M 62 35 Q 52 42 55 52 Q 68 48 72 38 Q 65 32 62 35" />
              <path d="M 118 22 Q 128 28 132 38 Q 142 35 145 25 Q 132 18 118 22" />
              <path d="M 142 28 Q 152 35 155 45 Q 165 42 168 32 Q 155 25 142 28" />
              <path d="M 55 58 Q 48 65 52 75 Q 65 72 68 62 Q 58 55 55 58" />
              <path d="M 145 58 Q 138 65 142 75 Q 155 72 158 62 Q 148 55 145 58" />
            </g>
            <g fill="hsl(135 50% 32%)">
              <ellipse cx="32" cy="48" rx="7" ry="9" />
              <ellipse cx="20" cy="62" rx="6" ry="8" />
              <ellipse cx="8" cy="72" rx="5" ry="7" />
              <ellipse cx="58" cy="32" rx="6" ry="8" />
              <ellipse cx="162" cy="48" rx="7" ry="9" />
              <ellipse cx="185" cy="62" rx="6" ry="8" />
              <ellipse cx="195" cy="72" rx="5" ry="7" />
              <ellipse cx="142" cy="32" rx="6" ry="8" />
              <ellipse cx="62" cy="68" rx="5" ry="7" />
              <ellipse cx="150" cy="68" rx="5" ry="7" />
            </g>
            <g fill="hsl(142 48% 38%)">
              <ellipse cx="38" cy="55" rx="5" ry="6" />
              <ellipse cx="15" cy="68" rx="4" ry="6" />
              <ellipse cx="168" cy="55" rx="5" ry="6" />
              <ellipse cx="192" cy="68" rx="4" ry="6" />
              <ellipse cx="55" cy="28" rx="4" ry="5" />
              <ellipse cx="138" cy="22" rx="4" ry="5" />
            </g>

            {/* Flowers on branches - scattered along left, center, right */}
            <g fill="none" stroke="none">
              <use href="#flower" transform="translate(28, 30) scale(1.2)" />
              <use href="#flower" transform="translate(15, 5) scale(1)" />
              <use href="#flower" transform="translate(5, 42) scale(0.9)" />
              <use href="#flower" transform="translate(42, 22) scale(0.9)" />
              <use href="#flower" transform="translate(55, 50) scale(0.8)" />
              <use href="#flower" transform="translate(90, 12) scale(1.1)" />
              <use href="#flower" transform="translate(96, 38) scale(0.95)" />
              <use href="#flower" transform="translate(104, -2) scale(1)" />
              <use href="#flower" transform="translate(115, 20) scale(0.9)" />
              <use href="#flower" transform="translate(130, 8) scale(0.85)" />
              <use href="#flower" transform="translate(148, 28) scale(1)" />
              <use href="#flower" transform="translate(162, 12) scale(0.9)" />
              <use href="#flower" transform="translate(178, 32) scale(1)" />
              <use href="#flower" transform="translate(172, 48) scale(0.85)" />
              <use href="#flower" transform="translate(155, 38) scale(0.8)" />
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
