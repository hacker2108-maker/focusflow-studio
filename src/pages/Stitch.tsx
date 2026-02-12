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

type SectionKind = "nav" | "hero" | "features" | "featureCard" | "cta" | "footer" | "sidebar" | "header" | "content" | "tabBar" | "form" | "logo" | "input" | "button" | null;

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
  const footer = "© 2025 " + brand + "    Privacy    Terms    Contact";
  return { nav, hero: h, features, ctaHeadline: "Ready to get started?", ctaButton: h.cta, footer };
}

/** Full landing page layout with real content */
function generateLandingLayout(theme: string): Omit<CanvasElement, "id">[] {
  const w = 1280;
  const h = 800;
  const pad = 0;
  const cx = -w / 2;
  const cy = -h / 2;
  const copy = landingCopy(theme);
  const fw = (w - 32 * 4) / 3;
  return [
    { type: "frame", x: cx, y: cy, width: w, height: h, fill: "hsl(var(--card))", label: theme, sectionKind: null },
    { type: "rect", x: cx + pad, y: cy + pad, width: w - pad * 2, height: 56, fill: "hsl(var(--foreground) / 0.08)", label: "Nav", sectionKind: "nav", content: copy.nav },
    { type: "rect", x: cx + pad, y: cy + 56 + pad, width: w - pad * 2, height: 380, fill: "hsl(var(--primary) / 0.12)", label: "Hero", sectionKind: "hero", content: copy.hero.headline, subline: copy.hero.subline, ctaText: copy.hero.cta },
    { type: "rect", x: cx + 32, y: cy + 56 + 380 + 32, width: fw, height: 180, fill: "hsl(var(--card))", label: copy.features[0].title, sectionKind: "featureCard", content: copy.features[0].title, subline: copy.features[0].desc },
    { type: "rect", x: cx + 32 + fw + 32, y: cy + 56 + 380 + 32, width: fw, height: 180, fill: "hsl(var(--card))", label: copy.features[1].title, sectionKind: "featureCard", content: copy.features[1].title, subline: copy.features[1].desc },
    { type: "rect", x: cx + 32 + (fw + 32) * 2, y: cy + 56 + 380 + 32, width: fw, height: 180, fill: "hsl(var(--card))", label: copy.features[2].title, sectionKind: "featureCard", content: copy.features[2].title, subline: copy.features[2].desc },
    { type: "rect", x: cx + pad, y: cy + 56 + 380 + 32 + 180 + 32, width: w - pad * 2, height: 140, fill: "hsl(var(--primary) / 0.2)", label: "CTA", sectionKind: "cta", content: copy.ctaHeadline, ctaText: copy.ctaButton },
    { type: "rect", x: cx + pad, y: cy + h - 80 - pad, width: w - pad * 2, height: 80, fill: "hsl(var(--foreground) / 0.06)", label: "Footer", sectionKind: "footer", content: copy.footer },
  ];
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
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {elements.length === 0 ? (
                <p className="text-xs text-muted-foreground/80 p-3">
                  Click a shape tool and click on the canvas, or add a frame.
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
                  <p className="mt-3 text-xs">You’ll get a full layout (nav, hero, sections, footer) you can move and resize.</p>
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
