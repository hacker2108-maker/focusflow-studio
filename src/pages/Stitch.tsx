import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MousePointer2,
  Square,
  Circle,
  Type,
  Hand,
  Sparkles,
  Layers,
  PanelRightOpen,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Minus,
  ZoomIn,
  Download,
  MinusCircle,
  ArrowRight,
  ArrowLeft,
  Star,
  X,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Tool = "select" | "rect" | "circle" | "text" | "line" | "arrow" | "star" | "hand";

type SectionKind = "nav" | "hero" | "features" | "featureCard" | "stats" | "pricing" | "pricingCard" | "cta" | "footer" | "sidebar" | "header" | "content" | "tabBar" | "form" | "logo" | "input" | "button" | "faq" | "newsletter" | null;

interface CanvasElement {
  id: string;
  type: "frame" | "rect" | "circle" | "text" | "line" | "arrow" | "star";
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  fill?: string;
  /** For AI-generated layouts: section role so we can style and label like real UI */
  sectionKind?: SectionKind;
  /** Rich content — shown inside the element like a real design tool */
  content?: string;
  subline?: string;
  ctaText?: string;
}

const DEFAULT_FILL = "hsl(var(--primary) / 0.12)";

const FRAME_PRESETS: { name: string; width: number; height: number }[] = [
  { name: "Frame", width: 400, height: 300 },
  { name: "iPhone 14", width: 390, height: 844 },
  { name: "Android", width: 360, height: 640 },
  { name: "iPad", width: 768, height: 1024 },
  { name: "Desktop HD", width: 1440, height: 900 },
  { name: "Laptop", width: 1280, height: 800 },
  { name: "A4", width: 595, height: 842 },
];

/** Theme name extracted from prompt (e.g. "coffee shop", "SaaS") for frame label */
function themeFromPrompt(prompt: string): string {
  const lower = prompt.toLowerCase().trim();
  if (lower.includes("coffee") || lower.includes("cafe")) return "Coffee Shop";
  if (lower.includes("saas") || lower.includes("software")) return "SaaS";
  if (lower.includes("fitness") || lower.includes("gym")) return "Fitness";
  if (lower.includes("restaurant") || lower.includes("food")) return "Restaurant";
  if (lower.includes("ecommerce") || lower.includes("e-commerce") || lower.includes("shop")) return "E‑commerce";
  if (lower.includes("portfolio") || lower.includes("creative")) return "Portfolio";
  if (lower.includes("blog")) return "Blog";
  return "Landing Page";
}

/** Theme-aware copy for landing sections */
function landingCopy(theme: string) {
  const t = theme.toLowerCase();
  const brand = theme;
  const hero: Record<string, { headline: string; subline: string; cta: string }> = {
    "coffee shop": { headline: "Fresh Roasted Coffee", subline: "Small-batch beans, delivered. Start your day right.", cta: "Order now" },
    "saas": { headline: "Ship faster, together", subline: "The one place for your team's tasks, docs, and goals.", cta: "Start free trial" },
    "fitness": { headline: "Your best shape starts here", subline: "Personal plans, live classes, and tracking that works.", cta: "Get started" },
    "restaurant": { headline: "Eat well, feel good", subline: "Seasonal menus and a table for every occasion.", cta: "Reserve a table" },
    "ecommerce": { headline: "Quality you can trust", subline: "Curated products, fast delivery, easy returns.", cta: "Shop now" },
    "portfolio": { headline: "Design & build", subline: "Selected work and what I'm up to next.", cta: "View work" },
    "blog": { headline: "Stories and ideas", subline: "Thoughts on design, code, and building things.", cta: "Read more" },
  };
  const norm = (s: string) => s.toLowerCase().replace(/[\s\-‑]/g, "");
  const themeNorm = norm(theme);
  const key = Object.keys(hero).find((k) => themeNorm.includes(norm(k)) || norm(k).includes(themeNorm)) || "landing";
  const h = hero[key] || { headline: `Welcome to ${brand}`, subline: "Your tagline or value proposition here.", cta: "Get started" };
  const nav = brand === "Landing Page" ? "Logo    Home    About    Contact" : `${brand}    Home    About    Contact`;
  const features = [
    { title: "Simple", desc: "Clear and easy to use, every time." },
    { title: "Fast", desc: "Built for speed and reliability." },
    { title: "Support", desc: "We're here when you need us." },
  ];
  const testimonial = theme === "Landing Page" ? "“This changed how we work.” — Alex, Team Lead" : `“Best ${brand.toLowerCase()} experience.” — Happy customer`;
  const footer = "© 2025 " + brand + "    Privacy    Terms    Contact";
  const stats = [
    { value: "10K+", label: "Active users" },
    { value: "99.9%", label: "Uptime" },
    { value: "24/7", label: "Support" },
  ];
  const pricing = [
    { name: "Starter", price: "$9", period: "/month", cta: "Start free" },
    { name: "Pro", price: "$29", period: "/month", cta: "Get started" },
    { name: "Team", price: "$99", period: "/month", cta: "Contact sales" },
  ];
  const faq = [
    { q: "How do I get started?", a: "Sign up in under a minute. No credit card required." },
    { q: "Can I change plans later?", a: "Yes. Upgrade or downgrade anytime from your account." },
  ];
  const newsletter = { headline: "Stay in the loop", subline: "Get tips and updates. No spam.", cta: "Subscribe" };
  return { nav, hero: h, features, stats, pricing, faq, testimonial, newsletter, ctaHeadline: "Ready to get started?", ctaButton: h.cta, footer };
}

/** Full real landing page: nav, hero, stats, features, testimonial, pricing, CTA, FAQ, newsletter, footer */
function generateLandingLayout(theme: string): Omit<CanvasElement, "id">[] {
  const w = 1280;
  const h = 1620;
  const pad = 0;
  const gap = 24;
  const cx = -w / 2;
  const cy = -h / 2;
  const copy = landingCopy(theme);
  const fw = (w - 32 * 4) / 3;
  const pw = (w - 32 * 4) / 3;
  let y = cy + 56 + 340 + gap; // after nav + hero
  const out: Omit<CanvasElement, "id">[] = [
    { type: "frame", x: cx, y: cy, width: w, height: h, fill: "hsl(var(--card))", label: theme, sectionKind: null },
    { type: "rect", x: cx + pad, y: cy + pad, width: w - pad * 2, height: 56, fill: "hsl(var(--foreground) / 0.08)", label: "Nav", sectionKind: "nav", content: copy.nav },
    { type: "rect", x: cx + pad, y: cy + 56, width: w - pad * 2, height: 340, fill: "hsl(var(--primary) / 0.12)", label: "Hero", sectionKind: "hero", content: copy.hero.headline, subline: copy.hero.subline, ctaText: copy.hero.cta },
  ];
  out.push(
    { type: "rect", x: cx + 32, y: y, width: fw, height: 100, fill: "hsl(var(--card))", label: "Stats", sectionKind: "stats", content: copy.stats[0].value, subline: copy.stats[0].label },
    { type: "rect", x: cx + 32 + fw + 32, y: y, width: fw, height: 100, fill: "hsl(var(--card))", label: "Stats", sectionKind: "stats", content: copy.stats[1].value, subline: copy.stats[1].label },
    { type: "rect", x: cx + 32 + (fw + 32) * 2, y: y, width: fw, height: 100, fill: "hsl(var(--card))", label: "Stats", sectionKind: "stats", content: copy.stats[2].value, subline: copy.stats[2].label }
  );
  y += 100 + gap;
  out.push(
    { type: "rect", x: cx + 32, y, width: fw, height: 180, fill: "hsl(var(--card))", label: copy.features[0].title, sectionKind: "featureCard", content: copy.features[0].title, subline: copy.features[0].desc },
    { type: "rect", x: cx + 32 + fw + 32, y, width: fw, height: 180, fill: "hsl(var(--card))", label: copy.features[1].title, sectionKind: "featureCard", content: copy.features[1].title, subline: copy.features[1].desc },
    { type: "rect", x: cx + 32 + (fw + 32) * 2, y, width: fw, height: 180, fill: "hsl(var(--card))", label: copy.features[2].title, sectionKind: "featureCard", content: copy.features[2].title, subline: copy.features[2].desc }
  );
  y += 180 + gap;
  out.push(
    { type: "rect", x: cx + pad, y, width: w - pad * 2, height: 72, fill: "hsl(var(--muted))", label: "Testimonial", sectionKind: "content", content: copy.testimonial }
  );
  y += 72 + gap;
  out.push(
    { type: "rect", x: cx + 32, y, width: pw, height: 220, fill: "hsl(var(--card))", label: copy.pricing[0].name, sectionKind: "pricingCard", content: copy.pricing[0].name, subline: copy.pricing[0].price + " " + copy.pricing[0].period, ctaText: copy.pricing[0].cta },
    { type: "rect", x: cx + 32 + pw + 32, y, width: pw, height: 220, fill: "hsl(var(--primary) / 0.08)", label: copy.pricing[1].name, sectionKind: "pricingCard", content: copy.pricing[1].name, subline: copy.pricing[1].price + " " + copy.pricing[1].period, ctaText: copy.pricing[1].cta },
    { type: "rect", x: cx + 32 + (pw + 32) * 2, y, width: pw, height: 220, fill: "hsl(var(--card))", label: copy.pricing[2].name, sectionKind: "pricingCard", content: copy.pricing[2].name, subline: copy.pricing[2].price + " " + copy.pricing[2].period, ctaText: copy.pricing[2].cta }
  );
  y += 220 + gap;
  out.push(
    { type: "rect", x: cx + pad, y, width: w - pad * 2, height: 100, fill: "hsl(var(--primary) / 0.2)", label: "CTA", sectionKind: "cta", content: copy.ctaHeadline, ctaText: copy.ctaButton }
  );
  y += 100 + gap;
  out.push(
    { type: "rect", x: cx + pad, y, width: (w - pad * 2 - gap) / 2, height: 100, fill: "hsl(var(--muted))", label: "FAQ", sectionKind: "faq", content: copy.faq[0].q, subline: copy.faq[0].a },
    { type: "rect", x: cx + pad + (w - pad * 2 - gap) / 2 + gap, y, width: (w - pad * 2 - gap) / 2, height: 100, fill: "hsl(var(--muted))", label: "FAQ", sectionKind: "faq", content: copy.faq[1].q, subline: copy.faq[1].a }
  );
  y += 100 + gap;
  out.push(
    { type: "rect", x: cx + pad, y, width: w - pad * 2, height: 120, fill: "hsl(var(--foreground) / 0.04)", label: "Newsletter", sectionKind: "newsletter", content: copy.newsletter.headline, subline: copy.newsletter.subline, ctaText: copy.newsletter.cta }
  );
  y += 120 + gap;
  out.push(
    { type: "rect", x: cx + pad, y, width: w - pad * 2, height: 80, fill: "hsl(var(--foreground) / 0.06)", label: "Footer", sectionKind: "footer", content: copy.footer }
  );
  return out;
}

/** Mobile app screen with content */
function generateAppScreenLayout(theme: string): Omit<CanvasElement, "id">[] {
  const w = 390;
  const h = 844;
  const cx = -w / 2;
  const cy = -h / 2;
  const title = theme === "Landing Page" ? "Home" : theme;
  return [
    { type: "frame", x: cx, y: cy, width: w, height: h, fill: "hsl(var(--card))", label: theme, sectionKind: null },
    { type: "rect", x: cx, y: cy, width: w, height: 44, fill: "hsl(var(--foreground) / 0.06)", label: "Status bar", sectionKind: "header", content: "9:41" },
    { type: "rect", x: cx, y: cy + 44, width: w, height: 56, fill: "hsl(var(--foreground) / 0.08)", label: "Nav", sectionKind: "nav", content: title },
    { type: "rect", x: cx + 16, y: cy + 44 + 56 + 24, width: w - 32, height: 200, fill: "hsl(var(--primary) / 0.1)", label: "Content", sectionKind: "content", content: "Featured content", subline: "Add your main message or card here." },
    { type: "rect", x: cx + 16, y: cy + 44 + 56 + 24 + 200 + 24, width: w - 32, height: 120, fill: "hsl(var(--card))", label: "Card", sectionKind: "featureCard", content: "Card title", subline: "Short description or CTA." },
    { type: "rect", x: cx + 16, y: cy + 44 + 56 + 24 + 200 + 24 + 120 + 24, width: w - 32, height: 48, fill: "hsl(var(--primary))", label: "Button", sectionKind: "button", content: "Continue", ctaText: "Continue" },
    { type: "rect", x: cx, y: cy + h - 84, width: w, height: 84, fill: "hsl(var(--foreground) / 0.08)", label: "Tab bar", sectionKind: "tabBar", content: "Home    Explore    Profile" },
  ];
}

/** Dashboard with content */
function generateDashboardLayout(theme: string): Omit<CanvasElement, "id">[] {
  const w = 1440;
  const h = 900;
  const cx = -w / 2;
  const cy = -h / 2;
  const sideW = 240;
  const headH = 64;
  const pad = 24;
  const cardW = (w - sideW - pad * 4) / 2;
  const cardH = 180;
  const top = cy + headH + pad;
  return [
    { type: "frame", x: cx, y: cy, width: w, height: h, fill: "hsl(var(--card))", label: theme, sectionKind: null },
    { type: "rect", x: cx, y: cy, width: sideW, height: h, fill: "hsl(var(--foreground) / 0.06)", label: "Sidebar", sectionKind: "sidebar", content: "Dashboard\nAnalytics\nSettings\nTeam" },
    { type: "rect", x: cx + sideW, y: cy, width: w - sideW, height: headH, fill: "hsl(var(--foreground) / 0.08)", label: "Header", sectionKind: "header", content: "Dashboard · Overview" },
    { type: "rect", x: cx + sideW + pad, y: top, width: cardW, height: cardH, fill: "hsl(var(--card))", label: "Card 1", sectionKind: "featureCard", content: "Total revenue", subline: "$12,450" },
    { type: "rect", x: cx + sideW + pad + cardW + pad, y: top, width: cardW, height: cardH, fill: "hsl(var(--card))", label: "Card 2", sectionKind: "featureCard", content: "Active users", subline: "1,234" },
    { type: "rect", x: cx + sideW + pad, y: top + cardH + pad, width: cardW, height: cardH, fill: "hsl(var(--card))", label: "Card 3", sectionKind: "featureCard", content: "Conversion", subline: "3.2%" },
    { type: "rect", x: cx + sideW + pad + cardW + pad, y: top + cardH + pad, width: cardW, height: cardH, fill: "hsl(var(--card))", label: "Card 4", sectionKind: "featureCard", content: "Orders", subline: "89" },
  ];
}

/** Form / signup with content */
function generateFormLayout(theme: string): Omit<CanvasElement, "id">[] {
  const cardW = 400;
  const cardH = 420;
  const cx = -cardW / 2;
  const cy = -cardH / 2;
  const brand = theme === "Landing Page" ? "Sign in" : theme;
  return [
    { type: "frame", x: cx, y: cy, width: cardW, height: cardH, fill: "hsl(var(--card))", label: theme, sectionKind: null },
    { type: "rect", x: cx + 32, y: cy + 24, width: cardW - 64, height: 48, fill: "hsl(var(--foreground) / 0.06)", label: "Logo", sectionKind: "logo", content: brand },
    { type: "rect", x: cx + 32, y: cy + 24 + 48 + 24, width: cardW - 64, height: 44, fill: "hsl(var(--background))", label: "Email", sectionKind: "input", content: "Email address" },
    { type: "rect", x: cx + 32, y: cy + 24 + 48 + 24 + 44 + 16, width: cardW - 64, height: 44, fill: "hsl(var(--background))", label: "Password", sectionKind: "input", content: "Password" },
    { type: "rect", x: cx + 32, y: cy + cardH - 24 - 48, width: cardW - 64, height: 48, fill: "hsl(var(--primary))", label: "Submit", sectionKind: "button", content: "Sign in", ctaText: "Sign in" },
  ];
}

type LayoutType = "landing" | "app" | "dashboard" | "form";

function pickLayoutFromPrompt(prompt: string): LayoutType {
  const lower = prompt.toLowerCase();
  if (/\b(app|mobile|iphone|android|screen)\b/.test(lower)) return "app";
  if (/\b(dashboard|admin|analytics)\b/.test(lower)) return "dashboard";
  if (/\b(form|signup|sign up|login|register)\b/.test(lower)) return "form";
  return "landing";
}

function generateId() {
  return `el-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function Stitch() {
  const [tool, setTool] = useState<Tool>("select");
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [showLayers, setShowLayers] = useState(true);
  const [showProps, setShowProps] = useState(true);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiChatInput, setAiChatInput] = useState("");
  const [aiMessages, setAiMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const aiChatEndRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const elementsRef = useRef<CanvasElement[]>(elements);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{
    x: number;
    y: number;
    elX: number;
    elY: number;
    panX: number;
    panY: number;
    isPan: boolean;
  }>({ x: 0, y: 0, elX: 0, elY: 0, panX: 0, panY: 0, isPan: false });

  const selected = elements.find((el) => el.id === selectedId);

  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);

  // Pan/zoom so all elements are in view (e.g. after AI build)
  const fitViewToElements = useCallback(() => {
    const el = elementsRef.current;
    if (!containerRef.current || el.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    el.forEach((e) => {
      const x2 = e.x + e.width;
      const y2 = e.y + e.height;
      const lx = Math.min(e.x, x2);
      const ly = Math.min(e.y, y2);
      const rx = Math.max(e.x, x2);
      const ry = Math.max(e.y, y2);
      minX = Math.min(minX, lx);
      minY = Math.min(minY, ly);
      maxX = Math.max(maxX, rx);
      maxY = Math.max(maxY, ry);
    });
    const pad = 60;
    const contentW = maxX - minX + pad * 2;
    const contentH = maxY - minY + pad * 2;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const newZoom = Math.min(2, Math.max(0.2, Math.min(rect.width / contentW, rect.height / contentH)));
    setPan({ x: -centerX * newZoom, y: -centerY * newZoom });
    setZoom(newZoom);
  }, []);

  // Screen to canvas coordinates
  const screenToCanvas = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      return {
        x: (clientX - rect.left - rect.width / 2 - pan.x) / zoom,
        y: (clientY - rect.top - rect.height / 2 - pan.y) / zoom,
      };
    },
    [pan, zoom]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!containerRef.current) return;
      e.preventDefault();
      const rect = containerRef.current.getBoundingClientRect();
      const cursorX = e.clientX - rect.left - rect.width / 2;
      const cursorY = e.clientY - rect.top - rect.height / 2;
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.min(3, Math.max(0.25, zoom + delta));
      setPan((p) => ({
        x: p.x - cursorX * (newZoom - zoom) / zoom,
        y: p.y - cursorY * (newZoom - zoom) / zoom,
      }));
      setZoom(newZoom);
    },
    [zoom]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!containerRef.current) return;
      const canvasPos = screenToCanvas(e.clientX, e.clientY);

      if (tool === "hand") {
        isDraggingRef.current = true;
        dragStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y, elX: 0, elY: 0, isPan: true };
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        return;
      }

      if (tool === "select") {
        const hitPadding = (el: CanvasElement) => {
          if (el.type === "line" || el.type === "arrow") {
            const minX = Math.min(el.x, el.x + el.width);
            const maxX = Math.max(el.x, el.x + el.width);
            const minY = Math.min(el.y, el.y + el.height);
            const maxY = Math.max(el.y, el.y + el.height);
            return { x: minX - 8, y: minY - 8, w: maxX - minX + 16, h: maxY - minY + 16 };
          }
          return { x: el.x, y: el.y, w: el.width, h: el.height };
        };
        const hit = [...elements].reverse().find((el) => {
          const b = hitPadding(el);
          return canvasPos.x >= b.x && canvasPos.x <= b.x + b.w && canvasPos.y >= b.y && canvasPos.y <= b.y + b.h;
        });
        if (hit) {
          setSelectedId(hit.id);
          isDraggingRef.current = true;
          dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            elX: hit.x,
            elY: hit.y,
            panX: pan.x,
            panY: pan.y,
            isPan: false,
          };
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        } else {
          setSelectedId(null);
          isDraggingRef.current = true;
          dragStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y, elX: 0, elY: 0, isPan: true };
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        }
        return;
      }

      if (["rect", "circle", "text", "line", "arrow", "star"].includes(tool)) {
        const type = tool as CanvasElement["type"];
        const isLine = type === "line" || type === "arrow";
        const isStar = type === "star";
        const newEl: CanvasElement = {
          id: generateId(),
          type,
          x: isLine ? canvasPos.x : canvasPos.x - (type === "text" ? 50 : 40),
          y: isLine ? canvasPos.y : canvasPos.y - (type === "text" ? 12 : 40),
          width: isLine ? 80 : type === "text" ? 120 : 80,
          height: isLine ? 0 : type === "text" ? 24 : 80,
          fill: DEFAULT_FILL,
          label: type === "text" ? "Text" : undefined,
          content: type === "text" ? "Text" : undefined,
        };
        if (isLine) newEl.height = 4;
        if (isStar) {
          newEl.width = 60;
          newEl.height = 60;
        }
        setElements((prev) => [...prev, newEl]);
        setSelectedId(newEl.id);
        setTool("select");
        toast.success("Added to canvas");
      }
    },
    [tool, selectedId, elements, pan, zoom, screenToCanvas]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;

      if (dragStartRef.current.isPan) {
        setPan({ x: dragStartRef.current.panX + dx, y: dragStartRef.current.panY + dy });
        return;
      }

      if (selectedId) {
        setElements((prev) =>
          prev.map((el) =>
            el.id === selectedId
              ? { ...el, x: dragStartRef.current.elX + dx / zoom, y: dragStartRef.current.elY + dy / zoom }
              : el
          )
        );
      }
    },
    [selectedId, zoom]
  );

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const addFrameByPreset = (preset: { name: string; width: number; height: number }) => {
    const newEl: CanvasElement = {
      id: generateId(),
      type: "frame",
      x: -preset.width / 2,
      y: -preset.height / 2,
      width: preset.width,
      height: preset.height,
      fill: "hsl(var(--card))",
      label: preset.name,
    };
    setElements((prev) => [...prev, newEl]);
    setSelectedId(newEl.id);
    toast.success(`${preset.name} added`);
  };

  /** Get Y position below all elements (for adding new sections) */
  const getNextSectionY = useCallback(() => {
    if (elements.length === 0) return -360;
    return Math.max(...elements.map((e) => e.y + e.height)) + 24;
  }, [elements]);

  /** Add a real page section (Hero, Stats, Features, etc.) — user builds real pages */
  const addPageSection = useCallback(
    (kind: SectionKind & string) => {
      const W = 800;
      const cx = -W / 2;
      const y = getNextSectionY();
      const gap = 16;
      const newEls: CanvasElement[] = [];
      const mk = (partial: Omit<CanvasElement, "id">) => ({ ...partial, id: generateId() } as CanvasElement);

      if (kind === "nav") {
        newEls.push(mk({ type: "rect", x: cx, y, width: W, height: 56, fill: "hsl(var(--foreground) / 0.08)", label: "Nav", sectionKind: "nav", content: "Logo    Home    About    Contact" }));
      } else if (kind === "hero") {
        newEls.push(mk({ type: "rect", x: cx, y, width: W, height: 320, fill: "hsl(var(--primary) / 0.12)", label: "Hero", sectionKind: "hero", content: "Your headline here", subline: "Supporting copy and value proposition.", ctaText: "Get started" }));
      } else if (kind === "stats") {
        const w = (W - gap * 2) / 3;
        ["10K+", "99.9%", "24/7"].forEach((value, i) =>
          newEls.push(mk({ type: "rect", x: cx + i * (w + gap), y, width: w, height: 100, fill: "hsl(var(--card))", label: "Stat", sectionKind: "stats", content: value, subline: i === 0 ? "Users" : i === 1 ? "Uptime" : "Support" }))
        );
      } else if (kind === "featureCard") {
        const w = (W - gap * 2) / 3;
        [
          { t: "Feature one", d: "Short description." },
          { t: "Feature two", d: "Short description." },
          { t: "Feature three", d: "Short description." },
        ].forEach((f, i) =>
          newEls.push(mk({ type: "rect", x: cx + i * (w + gap), y, width: w, height: 160, fill: "hsl(var(--card))", label: f.t, sectionKind: "featureCard", content: f.t, subline: f.d }))
        );
      } else if (kind === "content") {
        newEls.push(mk({ type: "rect", x: cx, y, width: W, height: 80, fill: "hsl(var(--muted))", label: "Testimonial", sectionKind: "content", content: ""Quote from a customer." — Name, Role" }));
      } else if (kind === "pricingCard") {
        const w = (W - gap * 2) / 3;
        [
          { name: "Starter", price: "$9/mo", cta: "Start free" },
          { name: "Pro", price: "$29/mo", cta: "Get started" },
          { name: "Team", price: "$99/mo", cta: "Contact" },
        ].forEach((p, i) =>
          newEls.push(mk({ type: "rect", x: cx + i * (w + gap), y, width: w, height: 200, fill: "hsl(var(--card))", label: p.name, sectionKind: "pricingCard", content: p.name, subline: p.price, ctaText: p.cta }))
        );
      } else if (kind === "cta") {
        newEls.push(mk({ type: "rect", x: cx, y, width: W, height: 120, fill: "hsl(var(--primary) / 0.2)", label: "CTA", sectionKind: "cta", content: "Ready to get started?", ctaText: "Sign up free" }));
      } else if (kind === "faq") {
        newEls.push(mk({ type: "rect", x: cx, y, width: W / 2 - gap / 2, height: 90, fill: "hsl(var(--muted))", label: "FAQ", sectionKind: "faq", content: "How do I get started?", subline: "Sign up in under a minute. No credit card required." }));
        newEls.push(mk({ type: "rect", x: cx + W / 2 + gap / 2, y, width: W / 2 - gap / 2, height: 90, fill: "hsl(var(--muted))", label: "FAQ", sectionKind: "faq", content: "Can I change plans?", subline: "Yes. Upgrade or downgrade anytime." }));
      } else if (kind === "newsletter") {
        newEls.push(mk({ type: "rect", x: cx, y, width: W, height: 120, fill: "hsl(var(--foreground) / 0.04)", label: "Newsletter", sectionKind: "newsletter", content: "Stay in the loop", subline: "Get tips and updates. No spam.", ctaText: "Subscribe" }));
      } else if (kind === "footer") {
        newEls.push(mk({ type: "rect", x: cx, y, width: W, height: 72, fill: "hsl(var(--foreground) / 0.06)", label: "Footer", sectionKind: "footer", content: "© 2025 Your Company    Privacy    Terms    Contact" }));
      }
      if (newEls.length > 0) {
        setElements((prev) => [...prev, ...newEls]);
        setSelectedId(newEls[newEls.length - 1].id);
        toast.success(`Added ${kind} section`);
      }
    },
    [getNextSectionY]
  );

  // Keyboard: Delete/Backspace to remove selected
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, [contenteditable]")) return;
      if (selectedId) {
        e.preventDefault();
        setElements((prev) => prev.filter((el) => el.id !== selectedId));
        setSelectedId(null);
        toast.success("Deleted");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId]);

  const deleteSelected = useCallback(() => {
    if (selectedId) {
      setElements((prev) => prev.filter((el) => el.id !== selectedId));
      setSelectedId(null);
      toast.success("Deleted");
    }
  }, [selectedId]);

  const handleExportPNG = () => {
    const canvas = document.createElement("canvas");
    const padding = 40;
    const els = selectedId && selected ? [selected] : elements;
    if (els.length === 0) {
      toast.error("Nothing to export. Add frames or shapes first.");
      return;
    }
    const minX = Math.min(...els.map((e) => e.x));
    const minY = Math.min(...els.map((e) => e.y));
    const maxX = Math.max(...els.map((e) => e.x + e.width));
    const maxY = Math.max(...els.map((e) => e.y + e.height));
    const w = Math.ceil(maxX - minX + padding * 2);
    const h = Math.ceil(maxY - minY + padding * 2);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#f5f5f4";
    ctx.fillRect(0, 0, w, h);
    els.forEach((el) => {
      const x = el.x - minX + padding;
      const y = el.y - minY + padding;
      ctx.fillStyle = el.fill || DEFAULT_FILL;
      ctx.strokeStyle = "hsl(var(--border))";
      ctx.lineWidth = 2;
      if (el.type === "rect" || el.type === "frame") {
        ctx.fillRect(x, y, el.width, el.height);
        ctx.strokeRect(x, y, el.width, el.height);
        if (el.content || el.subline || el.ctaText) {
          ctx.fillStyle = "hsl(var(--foreground) / 0.9)";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          const cx = x + el.width / 2;
          let ty = y + el.height / 2;
          if (el.sectionKind === "hero") {
            ctx.font = "bold 18px system-ui";
            ctx.fillText(el.content || "", cx, ty - 16);
            if (el.subline) { ctx.font = "12px system-ui"; ctx.fillText(el.subline, cx, ty); ty += 20; }
            if (el.ctaText) { ctx.font = "12px system-ui"; ctx.fillText(el.ctaText, cx, ty + 12); }
          } else if (el.sectionKind === "cta") {
            ctx.font = "bold 14px system-ui";
            ctx.fillText(el.content || "", cx, ty - 12);
            if (el.ctaText) { ctx.font = "12px system-ui"; ctx.fillText(el.ctaText, cx, ty + 10); }
          } else {
            ctx.font = "12px system-ui";
            ctx.fillText(el.content || el.label || "", cx, el.subline ? ty - 8 : ty);
            if (el.subline) ctx.fillText(el.subline, cx, ty + 10);
            if (el.ctaText && el.sectionKind === "button") ctx.fillText(el.ctaText, cx, ty);
          }
          ctx.textAlign = "left";
          ctx.textBaseline = "alphabetic";
        }
      } else if (el.type === "circle") {
        ctx.beginPath();
        ctx.ellipse(x + el.width / 2, y + el.height / 2, el.width / 2, el.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (el.type === "text") {
        ctx.fillStyle = "hsl(var(--foreground))";
        ctx.font = "14px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(el.content || el.label || "Text", x + el.width / 2, y + el.height / 2 + 4);
        ctx.textAlign = "left";
      } else if (el.type === "line" || el.type === "arrow") {
        ctx.strokeStyle = "hsl(var(--foreground) / 0.8)";
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + el.width, y + el.height);
        ctx.stroke();
      } else if (el.type === "star") {
        ctx.beginPath();
        const cx = x + el.width / 2, cy = y + el.height / 2, r = Math.min(el.width, el.height) / 2;
        for (let i = 0; i < 5; i++) {
          const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
          const px = cx + r * Math.cos(a), py = cy + r * Math.sin(a);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    });
    const link = document.createElement("a");
    link.download = `stitch-export-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("Exported as PNG");
  };

  const handleExportJSON = () => {
    const data = JSON.stringify({ elements, exportedAt: new Date().toISOString() }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const link = document.createElement("a");
    link.download = `stitch-design-${Date.now()}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("Exported as JSON");
  };

  /** Export as standalone HTML page — ready to post online (like Google Stitch) */
  const exportToHTML = (els: CanvasElement[]) => {
    const escape = (s: string) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const frame = els.find((e) => e.type === "frame");
    const title = escape((frame?.label as string) || "My Page");
    const navEl = els.find((e) => e.sectionKind === "nav");
    const heroEl = els.find((e) => e.sectionKind === "hero");
    const featureEls = els.filter((e) => e.sectionKind === "featureCard").sort((a, b) => a.x - b.x);
    const statsEls = els.filter((e) => e.sectionKind === "stats").sort((a, b) => a.x - b.x);
    const pricingEls = els.filter((e) => e.sectionKind === "pricingCard").sort((a, b) => a.x - b.x);
    const faqEls = els.filter((e) => e.sectionKind === "faq").sort((a, b) => a.y - b.y);
    const newsletterEl = els.find((e) => e.sectionKind === "newsletter");
    const ctaEl = els.find((e) => e.sectionKind === "cta");
    const footerEl = els.find((e) => e.sectionKind === "footer");
    const contentEl = els.find((e) => e.sectionKind === "content" && (e.content ?? "").trim().length > 0);
    const logoEl = els.find((e) => e.sectionKind === "logo");
    const inputEls = els.filter((e) => e.sectionKind === "input").sort((a, b) => a.y - b.y);
    const buttonEl = els.find((e) => e.sectionKind === "button");
    const isForm = logoEl || inputEls.length > 0 || buttonEl;

    if (isForm) {
      const formTitle = escape(logoEl?.content ?? logoEl?.label ?? title);
      const inputsHtml = inputEls.map((inp) => `<label class="form-label">${escape(inp.content ?? inp.label ?? "")}</label><input type="${inp.label?.toLowerCase().includes("password") ? "password" : "text"}" class="form-input" placeholder="${escape(inp.content ?? "")}">`).join("");
      const btnHtml = buttonEl ? `<button type="submit" class="btn btn-primary btn-block">${escape(buttonEl.ctaText ?? buttonEl.content ?? buttonEl.label ?? "Submit")}</button>` : "";
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${formTitle}">
  <title>${formTitle}</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;} body{margin:0;font-family:system-ui,sans-serif;background:linear-gradient(180deg,#f0f4ff 0%,#e8eeff 100%);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;color:#1a1a1a;}
    .form-card{background:#fff;padding:40px;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:400px;width:100%;}
    .form-logo{font-size:24px;font-weight:700;text-align:center;margin-bottom:28px;}
    .form-label{display:block;font-size:13px;font-weight:500;color:#374151;margin-bottom:6px;}
    .form-input{width:100%;padding:12px 14px;border:1px solid #e5e7eb;border-radius:8px;font-size:15px;margin-bottom:16px;}
    .form-input:focus{outline:none;border-color:#4f46e5;box-shadow:0 0 0 3px rgba(79,70,229,0.15);}
    .btn{display:inline-block;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none;border:none;cursor:pointer;transition:opacity 0.2s;}
    .btn-primary{background:#4f46e5;color:#fff;width:100%;}
    .btn-block{display:block;text-align:center;}
  </style>
</head>
<body>
  <div class="form-card">
    <div class="form-logo">${formTitle}</div>
    <form action="#" method="get">
      ${inputsHtml}
      ${btnHtml}
    </form>
  </div>
</body>
</html>`;
    }

    const navLinks = (navEl?.content ?? "")
      .split(/\s{2,}|\t/)
      .map((t) => t.trim())
      .filter(Boolean);
    const navHtml =
      navLinks.length > 0
        ? `<nav class="nav"><div class="container nav-inner">${navLinks.map((text, i) => (i === 0 ? `<strong class="logo">${escape(text)}</strong>` : `<a href="#">${escape(text)}</a>`)).join("")}</div></nav>`
        : "";

    const heroHtml =
      heroEl ?
        `<section class="hero"><div class="container"><h1>${escape(heroEl.content ?? "")}</h1><p class="hero-sub">${escape(heroEl.subline ?? "")}</p>${heroEl.ctaText ? `<a href="#" class="btn btn-primary">${escape(heroEl.ctaText)}</a>` : ""}</div></section>`
      : "";

    const featuresHtml =
      featureEls.length > 0
        ? `<section class="features"><div class="container grid">${featureEls.map((c) => `<div class="card"><h3>${escape(c.content ?? c.label ?? "")}</h3><p>${escape(c.subline ?? "")}</p></div>`).join("")}</div></section>`
        : "";

    const statsHtml =
      statsEls.length > 0
        ? `<section class="stats"><div class="container grid grid-3">${statsEls.map((s) => `<div class="stat"><span class="stat-value">${escape(s.content ?? "")}</span><span class="stat-label">${escape(s.subline ?? "")}</span></div>`).join("")}</div></section>`
        : "";

    const pricingHtml =
      pricingEls.length > 0
        ? `<section class="pricing"><div class="container"><h2 class="section-title">Plans & pricing</h2><div class="grid grid-3">${pricingEls.map((p) => `<div class="pricing-card"><h3>${escape(p.content ?? "")}</h3><p class="price">${escape(p.subline ?? "")}</p><a href="#" class="btn btn-primary">${escape(p.ctaText ?? "Get started")}</a></div>`).join("")}</div></div></section>`
        : "";

    const faqHtml =
      faqEls.length > 0
        ? `<section class="faq"><div class="container"><h2 class="section-title">FAQ</h2><div class="faq-list">${faqEls.map((f) => `<div class="faq-item"><h4>${escape(f.content ?? "")}</h4><p>${escape(f.subline ?? "")}</p></div>`).join("")}</div></div></section>`
        : "";

    const newsletterHtml =
      newsletterEl
        ? `<section class="newsletter"><div class="container"><h2>${escape(newsletterEl.content ?? "")}</h2><p class="newsletter-sub">${escape(newsletterEl.subline ?? "")}</p><form class="newsletter-form"><input type="email" placeholder="Your email" class="form-input"><button type="submit" class="btn btn-primary">${escape(newsletterEl.ctaText ?? "Subscribe")}</button></form></div></section>`
        : "";

    const contentHtml =
      contentEl ?
        `<section class="testimonial"><div class="container"><blockquote class="testimonial-quote">${escape(contentEl.content ?? "")}</blockquote></div></section>`
      : "";

    const ctaHtml =
      ctaEl ?
        `<section class="cta"><div class="container"><h2>${escape(ctaEl.content ?? "")}</h2>${ctaEl.ctaText ? `<a href="#" class="btn btn-primary">${escape(ctaEl.ctaText)}</a>` : ""}</div></section>`
      : "";

    const footerParts = (footerEl?.content ?? "").split(/\s{2,}|\t/).map((t) => t.trim()).filter(Boolean);
    const footerHtml =
      footerParts.length > 0
        ? `<footer class="footer"><div class="container">${footerParts.map((t) => (t.startsWith("©") ? `<span>${escape(t)}</span>` : `<a href="#">${escape(t)}</a>`)).join(" &middot; ")}</div></footer>`
        : "";

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${title} — created with Stitch">
  <title>${title}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color: #1a1a1a; line-height: 1.5; background: #fafafa; }
    .container { max-width: 1120px; margin: 0 auto; padding: 0 24px; }
    .nav { background: #f0f0f0; border-bottom: 1px solid #e5e5e5; }
    .nav-inner { display: flex; align-items: center; gap: 24px; min-height: 56px; }
    .nav a { color: #374151; text-decoration: none; font-size: 14px; }
    .nav a:hover { color: #111; }
    .logo { font-size: 18px; color: #111; }
    .hero { background: linear-gradient(180deg, #eef2ff 0%, #e0e7ff 100%); padding: 80px 0 100px; text-align: center; }
    .hero h1 { font-size: clamp(28px, 4vw, 42px); font-weight: 700; margin: 0 0 16px; letter-spacing: -0.02em; }
    .hero-sub { font-size: 18px; color: #4b5563; max-width: 540px; margin: 0 auto 28px; }
    .btn { display: inline-block; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; text-decoration: none; transition: opacity 0.2s; }
    .btn:hover { opacity: 0.9; }
    .btn-primary { background: #4f46e5; color: #fff; }
    .features { padding: 64px 0; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }
    .card { background: #fff; padding: 28px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .card h3 { margin: 0 0 8px; font-size: 18px; }
    .card p { margin: 0; font-size: 14px; color: #6b7280; }
    .testimonial { padding: 48px 0; background: #f9fafb; }
    .testimonial-quote { margin: 0; font-size: 18px; font-style: italic; color: #4b5563; text-align: center; max-width: 640px; margin: 0 auto; }
    .stats { padding: 48px 0; background: #fff; }
    .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
    @media (max-width: 768px) { .grid-3 { grid-template-columns: 1fr; } }
    .stat { text-align: center; }
    .stat-value { display: block; font-size: 28px; font-weight: 700; color: #4f46e5; }
    .stat-label { font-size: 14px; color: #6b7280; }
    .section-title { text-align: center; font-size: 24px; margin: 0 0 32px; }
    .pricing { padding: 64px 0; background: #f9fafb; }
    .pricing-card { background: #fff; padding: 32px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); text-align: center; }
    .pricing-card h3 { margin: 0 0 8px; font-size: 18px; }
    .pricing-card .price { font-size: 24px; font-weight: 700; margin: 0 0 16px; }
    .faq { padding: 64px 0; background: #fff; }
    .faq-list { max-width: 640px; margin: 0 auto; }
    .faq-item { padding: 20px 0; border-bottom: 1px solid #e5e7eb; }
    .faq-item h4 { margin: 0 0 8px; font-size: 16px; }
    .faq-item p { margin: 0; font-size: 14px; color: #6b7280; }
    .newsletter { padding: 64px 0; background: #f3f4f6; text-align: center; }
    .newsletter h2 { margin: 0 0 8px; font-size: 22px; }
    .newsletter-sub { margin: 0 0 20px; color: #6b7280; }
    .newsletter-form { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; max-width: 400px; margin: 0 auto; }
    .newsletter-form .form-input { flex: 1; min-width: 200px; padding: 12px 14px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 15px; }
    .cta { background: #e0e7ff; padding: 64px 0; text-align: center; }
    .cta h2 { margin: 0 0 20px; font-size: 24px; font-weight: 600; }
    .footer { background: #f3f4f6; padding: 24px 0; font-size: 13px; color: #6b7280; }
    .footer .container { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: center; }
    .footer a { color: #6b7280; text-decoration: none; }
    .footer a:hover { color: #111; }
  </style>
</head>
<body>
  ${navHtml}
  <main>
    ${heroHtml}
    ${statsHtml}
    ${featuresHtml}
    ${contentHtml}
    ${pricingHtml}
    ${ctaHtml}
    ${faqHtml}
    ${newsletterHtml}
  </main>
  ${footerHtml}
</body>
</html>`;
  };

  const handleExportHTML = () => {
    const hasSections = elements.some((e) => e.sectionKind && e.type === "rect");
    const hasForm = elements.some((e) => e.sectionKind === "logo" || e.sectionKind === "input" || e.sectionKind === "button");
    if (elements.length === 0 || (!hasSections && !hasForm)) {
      toast.error("Create a page first: use Design with AI (e.g. \"Landing page for a coffee shop\" or \"Signup form\"), then export HTML.");
      return;
    }
    const html = exportToHTML(elements);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const link = document.createElement("a");
    link.download = "index.html";
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("HTML downloaded. Open in a browser or upload to Netlify/Vercel/GitHub Pages to publish.");
  };

  const handleCopyHTML = async () => {
    const hasSections = elements.some((e) => e.sectionKind && e.type === "rect");
    const hasForm = elements.some((e) => e.sectionKind === "logo" || e.sectionKind === "input" || e.sectionKind === "button");
    if (elements.length === 0 || (!hasSections && !hasForm)) {
      toast.error("Create a page first with Design with AI, then copy HTML.");
      return;
    }
    const html = exportToHTML(elements);
    try {
      await navigator.clipboard.writeText(html);
      toast.success("HTML copied to clipboard. Paste into your host or a new file.");
    } catch {
      toast.error("Could not copy. Use Export as HTML to download instead.");
    }
  };

  const handleAiGenerate = () => {
    if (!aiPrompt.trim()) {
      toast.error("Describe what you want to generate.");
      return;
    }
    setIsGenerating(true);
    setTimeout(() => {
      const newEl: CanvasElement = {
        id: generateId(),
        type: "frame",
        x: -180,
        y: -120,
        width: 360,
        height: 240,
        fill: "hsl(var(--card))",
        label: aiPrompt.slice(0, 24) + (aiPrompt.length > 24 ? "…" : ""),
      };
      setElements((prev) => [...prev, newEl]);
      setSelectedId(newEl.id);
      setAiPrompt("");
      setIsGenerating(false);
      toast.success("Draft added.");
    }, 600);
  };

  // Talk to AI: full layout from prompt (landing page, app screen, dashboard, form) — like Google Stitch
  const runAIBuild = useCallback((userPrompt: string) => {
    setAiMessages((m) => [...m, { role: "user", text: userPrompt }]);
    const layoutType = pickLayoutFromPrompt(userPrompt);
    const theme = themeFromPrompt(userPrompt);
    const layoutLabels: Record<LayoutType, string> = {
      landing: "landing page",
      app: "app screen",
      dashboard: "dashboard",
      form: "signup / login form",
    };
    setAiMessages((m) => [...m, { role: "assistant", text: `Creating a full ${layoutLabels[layoutType]}... Watch it build on the canvas.` }]);

    const templates: Record<LayoutType, () => Omit<CanvasElement, "id">[]> = {
      landing: () => generateLandingLayout(theme),
      app: () => generateAppScreenLayout(theme),
      dashboard: () => generateDashboardLayout(theme),
      form: () => generateFormLayout(theme),
    };
    const items = templates[layoutType]();
    const stepMs = 180;
    items.forEach((item, i) => {
      setTimeout(() => {
        const el: CanvasElement = { ...item, id: generateId() } as CanvasElement;
        setElements((prev) => [...prev, el]);
        setSelectedId(el.id);
      }, i * stepMs);
    });
    const doneDelay = items.length * stepMs + 200;
    setTimeout(() => {
      setAiMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: `Done! I've created a full ${layoutLabels[layoutType]} with all sections. Pan, zoom, and resize any section to refine it — or ask for another design.`,
        },
      ]);
    }, doneDelay);
    setTimeout(() => fitViewToElements(), doneDelay + 120);
  }, [fitViewToElements]);

  const handleAIChatSend = () => {
    const text = aiChatInput.trim();
    if (!text) return;
    setAiChatInput("");
    runAIBuild(text);
  };

  const tools: { id: Tool; icon: React.ElementType; label: string }[] = [
    { id: "select", icon: MousePointer2, label: "Select" },
    { id: "rect", icon: Square, label: "Rectangle" },
    { id: "circle", icon: Circle, label: "Circle" },
    { id: "text", icon: Type, label: "Text" },
    { id: "line", icon: MinusCircle, label: "Line" },
    { id: "arrow", icon: ArrowRight, label: "Arrow" },
    { id: "star", icon: Star, label: "Star" },
    { id: "hand", icon: Hand, label: "Hand" },
  ];

  const content = (
    <div className="fixed inset-0 md:left-64 flex flex-col bg-background z-[100] pt-[max(env(safe-area-inset-top),44px)] pb-[env(safe-area-inset-bottom)] md:pt-0">
      {/* Top toolbar: back + scrollable icons (fits mobile) */}
      <header className="flex-shrink-0 h-12 min-h-12 px-2 sm:px-3 flex items-center gap-2 border-b border-border/60 bg-card/95 backdrop-blur-sm">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 flex-shrink-0 rounded-md"
          onClick={() => navigate(-1)}
          title="Back"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden">
          <div className="flex items-center gap-0.5 sm:gap-1 py-1 pr-2" style={{ minWidth: "max-content" }}>
            {tools.map(({ id, icon: Icon, label }) => (
              <Button
                key={id}
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 flex-shrink-0 rounded-md",
                  tool === id && "bg-muted text-foreground"
                )}
                onClick={() => setTool(id)}
                title={label}
              >
                <Icon className="w-4 h-4" />
              </Button>
            ))}
            <div className="w-px h-5 bg-border/60 mx-0.5 flex-shrink-0" />
            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}>
              <Minus className="w-4 h-4" />
            </Button>
            <span className="min-w-[2.5rem] text-center text-xs font-medium tabular-nums flex-shrink-0">
              {Math.round(zoom * 100)}%
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => setZoom((z) => Math.min(3, z + 0.25))}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <div className="w-px h-5 bg-border/60 mx-0.5 flex-shrink-0 hidden sm:block" />
            <span className="text-xs font-medium text-muted-foreground hidden sm:inline flex-shrink-0">Stitch</span>
            {selectedId && (
              <Button variant="ghost" size="sm" className="gap-1 flex-shrink-0 text-xs text-destructive hover:text-destructive" onClick={deleteSelected} title="Delete (Del)">
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Delete</span>
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1 flex-shrink-0 text-xs">
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportPNG}>Export as PNG</DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportJSON}>Export as JSON</DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportHTML}>Export as HTML (download)</DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyHTML}>Copy HTML (paste to publish)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="default"
              size="sm"
              className="gap-1 flex-shrink-0 text-xs bg-amber-500 hover:bg-amber-600 text-white"
              onClick={() => setShowAIChat(true)}
              title="Design with AI"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Design with AI</span>
            </Button>
            <Button variant="ghost" size="sm" className="gap-1 flex-shrink-0 text-xs" onClick={() => setShowLayers(!showLayers)}>
              <Layers className="w-4 h-4" />
              <span className="hidden sm:inline">Layers</span>
            </Button>
            <Button variant="ghost" size="sm" className="gap-1 flex-shrink-0 text-xs" onClick={() => setShowProps(!showProps)}>
              <PanelRightOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Design</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: Layers — narrower on mobile so canvas fits */}
        {showLayers && (
          <aside className="w-52 sm:w-60 flex-shrink-0 border-r border-border/60 bg-card/80 backdrop-blur-sm flex flex-col overflow-hidden">
            <div className="p-2 border-b border-border/50 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Layers
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Add frame">
                    <Plus className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {FRAME_PRESETS.map((preset) => (
                    <DropdownMenuItem key={preset.name} onClick={() => addFrameByPreset(preset)}>
                      <Square className="w-4 h-4 mr-2 opacity-70" />
                      {preset.name}
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        {preset.width}×{preset.height}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Add page section">
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  {(["nav", "hero", "stats", "featureCard", "content", "pricingCard", "cta", "faq", "newsletter", "footer"] as const).map((k) => (
                    <DropdownMenuItem key={k} onClick={() => addPageSection(k)}>
                      <span className="capitalize">{k === "featureCard" ? "Features" : k === "content" ? "Testimonial" : k === "pricingCard" ? "Pricing" : k}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {elements.length === 0 ? (
                <p className="text-xs text-muted-foreground/80 p-3">
                  Add a frame or page section (grid icon), or use Design with AI to create a full page.
                </p>
              ) : (
                elements.slice().reverse().map((el) => (
                  <button
                    key={el.id}
                    type="button"
                    onClick={() => setSelectedId(el.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-xs transition-colors",
                      selectedId === el.id ? "bg-primary/10 text-primary" : "hover:bg-muted/60"
                    )}
                  >
                    {el.type === "frame" ? (
                      <Square className="w-3.5 h-3.5 opacity-70" />
                    ) : el.type === "rect" ? (
                      <Square className="w-3.5 h-3.5 opacity-70" />
                    ) : el.type === "circle" ? (
                      <Circle className="w-3.5 h-3.5 opacity-70" />
                    ) : el.type === "line" ? (
                      <MinusCircle className="w-3.5 h-3.5 opacity-70" />
                    ) : el.type === "arrow" ? (
                      <ArrowRight className="w-3.5 h-3.5 opacity-70" />
                    ) : el.type === "star" ? (
                      <Star className="w-3.5 h-3.5 opacity-70" />
                    ) : (
                      <Type className="w-3.5 h-3.5 opacity-70" />
                    )}
                    <span className="truncate flex-1">{el.label || el.type}</span>
                  </button>
                ))
              )}
            </div>

            {/* Design with AI — optional */}
            <div className="border-t border-border/60">
              <button
                type="button"
                onClick={() => setShowAIPanel(!showAIPanel)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
              >
                {showAIPanel ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <Sparkles className="w-4 h-4 text-amber-500/90" />
                Design with AI
              </button>
              {showAIPanel && (
                <div className="p-3 pt-0 space-y-2">
                  <Textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="e.g. Login screen with email field and button"
                    className="min-h-[72px] text-xs resize-none bg-muted/30 border-border/50"
                  />
                  <Button
                    size="sm"
                    className="w-full gap-2"
                    onClick={handleAiGenerate}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-transparent" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    Generate
                  </Button>
                </div>
              )}
            </div>
          </aside>
        )}

        {/* Canvas — infinite whiteboard */}
        <main
          ref={containerRef}
          className="flex-1 overflow-hidden relative bg-[#f5f5f4]"
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{ cursor: tool === "hand" ? "grab" : tool === "select" ? "default" : "crosshair" }}
        >
          {/* Canvas transform (pan + zoom) */}
          <div
            className="absolute inset-0"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "center center",
            }}
          >
            {/* Inner canvas: (0,0) at viewport center so elements and AI content are visible */}
            <div
              className="absolute"
              style={{
                left: "50%",
                top: "50%",
                width: 0,
                height: 0,
                transform: "translate(-50%, -50%)",
              }}
            >
              {/* Dot grid — large area centered on (0,0) */}
              <div
                className="absolute pointer-events-none"
                style={{
                  left: -5000,
                  top: -5000,
                  width: 10000,
                  height: 10000,
                  backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--foreground) / 0.12) 1px, transparent 0)`,
                  backgroundSize: "20px 20px",
                  backgroundPosition: "0 0",
                }}
              />
              {elements.map((el) => {
              const isSelected = el.id === selectedId;
              const isLineOrArrow = el.type === "line" || el.type === "arrow";
              const isStar = el.type === "star";
              const boxStyle = isLineOrArrow
                ? {
                    left: Math.min(el.x, el.x + el.width),
                    top: Math.min(el.y, el.y + el.height),
                    width: Math.abs(el.width) + 20,
                    height: Math.abs(el.height) + 20,
                    background: "transparent",
                    border: "none",
                  }
                : {
                    left: el.x,
                    top: el.y,
                    width: el.width,
                    height: el.height,
                    backgroundColor: el.fill,
                    boxShadow: el.type === "frame" ? "0 4px 24px rgba(0,0,0,0.06)" : undefined,
                  };
              return (
                <motion.div
                  key={el.id}
                  layout
                  className={cn(
                    "absolute rounded-sm pointer-events-auto flex items-center justify-center overflow-visible",
                    !isLineOrArrow && "border-2",
                    isSelected ? "border-primary ring-2 ring-primary/20" : !isLineOrArrow && "border-transparent hover:border-border/80"
                  )}
                  style={boxStyle}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (tool === "select") setSelectedId(el.id);
                  }}
                >
                  {el.type === "circle" && (
                    <div className="w-full h-full rounded-full border-2 border-border/60" style={{ backgroundColor: el.fill }} />
                  )}
                  {el.type === "text" && (
                    <span className="text-sm font-medium text-foreground/90 px-2 text-center break-words">
                      {el.content || el.label || "Text"}
                    </span>
                  )}
                  {/* Rich section content — like a real design tool */}
                  {el.type === "rect" && (el.content != null || el.subline != null || el.ctaText != null) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-2 overflow-hidden pointer-events-none rounded-sm">
                      {el.sectionKind === "nav" && (
                        <span className="text-[11px] font-medium text-foreground/80 truncate w-full text-center">{el.content}</span>
                      )}
                      {el.sectionKind === "hero" && (
                        <>
                          <span className="text-lg font-bold text-foreground/90 text-center leading-tight line-clamp-2">{el.content}</span>
                          {el.subline && <span className="text-[11px] text-foreground/70 text-center mt-1 line-clamp-2">{el.subline}</span>}
                          {el.ctaText && <span className="mt-2 px-3 py-1.5 rounded-md bg-primary/90 text-primary-foreground text-[11px] font-medium">{el.ctaText}</span>}
                        </>
                      )}
                      {el.sectionKind === "featureCard" && (
                        <>
                          <span className="text-xs font-semibold text-foreground/90 text-center">{el.content || el.label}</span>
                          {el.subline && <span className="text-[10px] text-foreground/70 text-center mt-0.5 line-clamp-2">{el.subline}</span>}
                        </>
                      )}
                      {el.sectionKind === "cta" && (
                        <>
                          <span className="text-sm font-semibold text-foreground/90 text-center">{el.content}</span>
                          {el.ctaText && <span className="mt-1.5 px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium">{el.ctaText}</span>}
                        </>
                      )}
                      {el.sectionKind === "footer" && (
                        <span className="text-[10px] text-foreground/60 text-center leading-tight whitespace-pre-line line-clamp-3">{el.content}</span>
                      )}
                      {el.sectionKind === "sidebar" && (
                        <span className="text-[10px] text-foreground/80 text-left w-full whitespace-pre-line line-clamp-8 pl-2">{el.content}</span>
                      )}
                      {el.sectionKind === "header" && (
                        <span className="text-xs font-medium text-foreground/80 truncate w-full text-center">{el.content}</span>
                      )}
                      {el.sectionKind === "content" && (
                        <>
                          <span className="text-xs font-semibold text-foreground/90 text-center">{el.content}</span>
                          {el.subline && <span className="text-[10px] text-foreground/70 text-center mt-0.5 line-clamp-2">{el.subline}</span>}
                        </>
                      )}
                      {el.sectionKind === "tabBar" && (
                        <span className="text-[10px] font-medium text-foreground/70 text-center">{el.content}</span>
                      )}
                      {el.sectionKind === "stats" && (
                        <>
                          <span className="text-lg font-bold text-foreground/90">{el.content}</span>
                          <span className="text-[10px] text-foreground/70 mt-0.5">{el.subline}</span>
                        </>
                      )}
                      {el.sectionKind === "pricingCard" && (
                        <>
                          <span className="text-sm font-semibold text-foreground/90">{el.content}</span>
                          <span className="text-xs text-foreground/80 mt-0.5">{el.subline}</span>
                          {el.ctaText && <span className="mt-2 px-2 py-1 rounded bg-primary/90 text-primary-foreground text-[10px] font-medium">{el.ctaText}</span>}
                        </>
                      )}
                      {el.sectionKind === "faq" && (
                        <>
                          <span className="text-[11px] font-semibold text-foreground/90 block text-left w-full">{el.content}</span>
                          <span className="text-[10px] text-foreground/70 text-left w-full line-clamp-2">{el.subline}</span>
                        </>
                      )}
                      {el.sectionKind === "newsletter" && (
                        <>
                          <span className="text-sm font-semibold text-foreground/90">{el.content}</span>
                          <span className="text-[10px] text-foreground/70 mt-0.5">{el.subline}</span>
                          {el.ctaText && <span className="mt-1.5 px-3 py-1 rounded-md bg-primary text-primary-foreground text-[10px] font-medium">{el.ctaText}</span>}
                        </>
                      )}
                      {el.sectionKind === "logo" && (
                        <span className="text-sm font-semibold text-foreground/90">{el.content || el.label}</span>
                      )}
                      {(el.sectionKind === "input" || el.sectionKind === "button") && (
                        <span className={cn(
                          "text-xs truncate w-full text-center px-2",
                          el.sectionKind === "button" ? "font-medium text-primary-foreground" : "text-muted-foreground"
                        )}>
                          {el.ctaText || el.content || el.label}
                        </span>
                      )}
                      {el.sectionKind == null && el.content != null && (
                        <span className="text-xs text-foreground/80 text-center line-clamp-3">{el.content}</span>
                      )}
                    </div>
                  )}
                  {/* Frame/section label (small, top-left) when no rich content */}
                  {(el.type === "frame" || (el.type === "rect" && !el.content && !el.subline && !el.ctaText)) && el.label && (
                    <span className="absolute top-1.5 left-1.5 text-[10px] font-medium text-muted-foreground/80 truncate max-w-[calc(100%-8px)]">
                      {el.label}
                    </span>
                  )}
                  {(el.type === "line" || el.type === "arrow") && (
                    <svg
                      className="absolute pointer-events-none"
                      style={{
                        left: el.width < 0 ? el.width : 0,
                        top: el.height < 0 ? el.height : 0,
                        width: Math.abs(el.width) + 24,
                        height: Math.abs(el.height) + 24,
                        overflow: "visible",
                      }}
                      viewBox={`${Math.min(0, el.width) - 12} ${Math.min(0, el.height) - 12} ${Math.abs(el.width) + 24} ${Math.abs(el.height) + 24}`}
                    >
                      <defs>
                        <marker id={`arrow-${el.id}`} markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                          <path d="M0,0 L8,4 L0,8 Z" fill="hsl(var(--foreground) / 0.8)" />
                        </marker>
                      </defs>
                      <line
                        x1={0}
                        y1={0}
                        x2={el.width}
                        y2={el.height}
                        stroke="hsl(var(--foreground) / 0.8)"
                        strokeWidth="2"
                        markerEnd={el.type === "arrow" ? `url(#arrow-${el.id})` : undefined}
                      />
                    </svg>
                  )}
                  {el.type === "star" && (
                    <svg
                      className="w-full h-full"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                      style={{ overflow: "visible" }}
                    >
                      <polygon
                        points="50,5 61,35 93,35 68,55 79,85 50,68 21,85 32,55 7,35 39,35"
                        fill={el.fill}
                        stroke="hsl(var(--border))"
                        strokeWidth="2"
                      />
                    </svg>
                  )}
                </motion.div>
              );
            })}
            </div>
          </div>
        </main>

        {/* Right: Design panel — narrower on mobile */}
        {showProps && (
          <aside className="w-52 sm:w-64 flex-shrink-0 border-l border-border/60 bg-card/80 backdrop-blur-sm flex flex-col overflow-hidden">
            <div className="p-3 border-b border-border/50">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Design
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {selected ? (
                <>
                  <div className="space-y-2">
                    <label className="text-[11px] font-medium text-muted-foreground">Content (main text)</label>
                    <input
                      type="text"
                      value={selected.content ?? ""}
                      onChange={(e) =>
                        setElements((prev) =>
                          prev.map((el) => (el.id === selectedId ? { ...el, content: e.target.value || undefined } : el))
                        )
                      }
                      placeholder="Headline, title, or label"
                      className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-medium text-muted-foreground">Subline (secondary)</label>
                    <input
                      type="text"
                      value={selected.subline ?? ""}
                      onChange={(e) =>
                        setElements((prev) =>
                          prev.map((el) => (el.id === selectedId ? { ...el, subline: e.target.value || undefined } : el))
                        )
                      }
                      placeholder="Description or subtitle"
                      className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-medium text-muted-foreground">Button / CTA text</label>
                    <input
                      type="text"
                      value={selected.ctaText ?? ""}
                      onChange={(e) =>
                        setElements((prev) =>
                          prev.map((el) => (el.id === selectedId ? { ...el, ctaText: e.target.value || undefined } : el))
                        )
                      }
                      placeholder="Get started, Sign in..."
                      className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-medium text-muted-foreground">Position</label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[10px]">X</span>
                        <span className="font-mono">{Math.round(selected.x)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Y</span>
                        <span className="font-mono">{Math.round(selected.y)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-medium text-muted-foreground">Size</label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[10px]">W</span>
                        <span className="font-mono">{Math.round(selected.width)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">H</span>
                        <span className="font-mono">{Math.round(selected.height)}</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full gap-2 text-destructive hover:text-destructive" onClick={deleteSelected}>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                </>
              ) : (
                <p className="text-xs text-muted-foreground/80">
                  Select a layer to edit content and properties.
                </p>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Talk to AI — slide-up panel */}
      {showAIChat && (
        <>
          <div className="absolute inset-0 bg-black/30 z-40" onClick={() => setShowAIChat(false)} aria-hidden />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed left-0 right-0 md:left-64 bottom-0 z-50 h-[min(70vh,420px)] md:max-w-md md:right-4 md:left-auto rounded-t-2xl md:rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">Design with AI</h2>
                  <p className="text-[11px] text-muted-foreground">Describe a full page — landing, app screen, dashboard, or form</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowAIChat(false)}>
                <ChevronDown className="w-4 h-4 md:hidden" />
                <X className="w-4 h-4 hidden md:block" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3" ref={aiChatEndRef}>
              {aiMessages.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Describe your design in plain English</p>
                  <p className="text-xs mt-1">&quot;Landing page for a coffee shop&quot;</p>
                  <p className="text-xs">&quot;Mobile app screen with nav and cards&quot;</p>
                  <p className="text-xs">&quot;Dashboard with sidebar and 4 cards&quot;</p>
                  <p className="text-xs">&quot;Signup form with logo and submit button&quot;</p>
                  <p className="mt-3 text-xs">You’ll get a full layout you can edit. Use Export → HTML to download or copy a page you can post online.</p>
                </div>
              ) : (
                aiMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm max-w-[85%]",
                      msg.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"
                    )}
                  >
                    {msg.text}
                  </div>
                ))
              )}
              <div ref={aiChatEndRef} />
            </div>
            <div className="p-3 border-t border-border flex gap-2">
              <Textarea
                value={aiChatInput}
                onChange={(e) => setAiChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleAIChatSend())}
                placeholder="e.g. Landing page for a SaaS product..."
                className="min-h-[44px] max-h-24 resize-none text-sm"
              />
              <Button onClick={handleAIChatSend} disabled={!aiChatInput.trim()} className="shrink-0">
                <Sparkles className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );

  return typeof document !== "undefined" ? createPortal(content, document.body) : content;
}
