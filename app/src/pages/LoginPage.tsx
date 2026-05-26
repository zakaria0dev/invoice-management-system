import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, ArrowRight, Sun, Moon, Receipt } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

// Animated Dot Map Component
const DotMap = ({ isDarkMode }: { isDarkMode: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const routes = [
    { start: { x: 0.15, y: 0.3 }, end: { x: 0.4, y: 0.2 }, delay: 0, color: "hsl(var(--primary))" },
    { start: { x: 0.4, y: 0.2 }, end: { x: 0.6, y: 0.25 }, delay: 2, color: "hsl(var(--primary))" },
    { start: { x: 0.08, y: 0.15 }, end: { x: 0.3, y: 0.5 }, delay: 1, color: "hsl(var(--primary))" },
    { start: { x: 0.7, y: 0.2 }, end: { x: 0.5, y: 0.55 }, delay: 0.5, color: "hsl(var(--primary))" },
  ];

  const generateDots = (width: number, height: number) => {
    const dots: { x: number; y: number; radius: number; opacity: number }[] = [];
    const gap = 12;
    for (let x = 0; x < width; x += gap) {
      for (let y = 0; y < height; y += gap) {
        const nx = x / width;
        const ny = y / height;
        const isInMapShape =
          (nx > 0.05 && nx < 0.25 && ny > 0.1 && ny < 0.4) ||
          (nx > 0.15 && nx < 0.25 && ny > 0.4 && ny < 0.8) ||
          (nx > 0.3 && nx < 0.45 && ny > 0.15 && ny < 0.35) ||
          (nx > 0.35 && nx < 0.5 && ny > 0.35 && ny < 0.65) ||
          (nx > 0.45 && nx < 0.7 && ny > 0.1 && ny < 0.5) ||
          (nx > 0.65 && nx < 0.8 && ny > 0.6 && ny < 0.8);
        if (isInMapShape && Math.random() > 0.3) {
          dots.push({ x, y, radius: 1, opacity: Math.random() * 0.5 + 0.1 });
        }
      }
    }
    return dots;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
      canvas.width = width;
      canvas.height = height;
    });
    resizeObserver.observe(canvas.parentElement as Element);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!dimensions.width || !dimensions.height) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dots = generateDots(dimensions.width, dimensions.height);
    let animationFrameId: number;
    let startTime = Date.now();

    function animate() {
      ctx!.clearRect(0, 0, dimensions.width, dimensions.height);
      dots.forEach((dot) => {
        ctx!.beginPath();
        ctx!.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
        ctx!.fillStyle = isDarkMode
          ? `rgba(255, 255, 255, ${dot.opacity})`
          : `rgba(0, 0, 0, ${dot.opacity})`;
        ctx!.fill();
      });
      const currentTime = (Date.now() - startTime) / 1000;
      routes.forEach((route) => {
        const elapsed = currentTime - route.delay;
        if (elapsed <= 0) return;
        const progress = Math.min(elapsed / 3, 1);
        const sx = route.start.x * dimensions.width;
        const sy = route.start.y * dimensions.height;
        const ex = route.end.x * dimensions.width;
        const ey = route.end.y * dimensions.height;
        const cx = sx + (ex - sx) * progress;
        const cy = sy + (ey - sy) * progress;
        ctx!.beginPath();
        ctx!.moveTo(sx, sy);
        ctx!.lineTo(cx, cy);
        ctx!.strokeStyle = isDarkMode ? "rgba(96, 165, 250, 0.6)" : "rgba(37, 99, 235, 0.4)";
        ctx!.lineWidth = 1.5;
        ctx!.stroke();
        ctx!.beginPath();
        ctx!.arc(sx, sy, 3, 0, Math.PI * 2);
        ctx!.fillStyle = isDarkMode ? "rgba(96, 165, 250, 0.8)" : "rgba(37, 99, 235, 0.6)";
        ctx!.fill();
        ctx!.beginPath();
        ctx!.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx!.fillStyle = isDarkMode ? "#60a5fa" : "#2563eb";
        ctx!.fill();
        ctx!.beginPath();
        ctx!.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx!.fillStyle = isDarkMode ? "rgba(96, 165, 250, 0.3)" : "rgba(37, 99, 235, 0.2)";
        ctx!.fill();
      });
      if (currentTime > 15) startTime = Date.now();
      animationFrameId = requestAnimationFrame(animate);
    }
    animate();
    return () => cancelAnimationFrame(animationFrameId);
  }, [dimensions, isDarkMode]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
};

export default function LoginPage() {
  const { login, isDarkMode, toggleDarkMode } = useAppStore();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [error, setError] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const loginSchema = z.object({
    email: z.string().email(t("login.email_required")),
    password: z.string().min(1, t("login.password_required")),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginForm) => {
    const success = await login(data.email, data.password);
    if (success) {
      navigate("/");
    } else {
      setError(t("login.invalid_credentials"));
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors duration-300">
      <div className="absolute top-6 right-6 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={toggleDarkMode}
          className={cn(
            "rounded-full w-10 h-10 bg-background/50 backdrop-blur-sm border-border transition-all duration-300",
            isDarkMode ? "hover:bg-white hover:text-black" : "hover:bg-black hover:text-white"
          )}
        >
          {isDarkMode ? (
            <Sun className="h-[1.2rem] w-[1.2rem] text-yellow-500" />
          ) : (
            <Moon className="h-[1.2rem] w-[1.2rem] text-blue-500" />
          )}
          <span className="sr-only">{t("common.toggle_theme")}</span>
        </Button>
      </div>

      <div className="flex min-h-screen w-full">
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden rounded-r-3xl">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
          <DotMap isDarkMode={isDarkMode} />
          <div className="absolute inset-0 flex flex-col items-start justify-end p-12 z-10">
            <h2 className="text-3xl font-bold text-foreground mb-3">{t("common.app_title")}</h2>
            <p className="text-muted-foreground/80 text-sm max-w-sm leading-relaxed">
              {t("login.tagline")}
            </p>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center p-6 sm:p-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md"
          >
            <div className="lg:hidden mb-10 flex items-center gap-3">
              <span className="text-xl font-bold text-foreground">{t("common.app_title")}</span>
            </div>

            <h1 className="text-2xl font-bold text-foreground mb-1">{t("login.welcome_back")}</h1>
            <p className="text-muted-foreground text-sm mb-8">{t("login.sign_in_to_account")}</p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                  {t("common.email")} <span className="text-destructive">*</span>
                </label>
                <input
                  {...register("email")}
                  type="email"
                  aria-label={t("common.email")}
                  placeholder={t("login.email_placeholder")}
                  className="w-full rounded-lg border border-input bg-background/50 backdrop-blur-sm px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                  {t("common.password")} <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <input
                    {...register("password")}
                    type={isPasswordVisible ? "text" : "password"}
                    aria-label={t("common.password")}
                    placeholder={t("login.password_placeholder")}
                    className="w-full rounded-lg border border-input bg-background/50 backdrop-blur-sm px-3.5 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {isPasswordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>
                )}
              </div>

              <motion.div
                onHoverStart={() => setIsHovered(true)}
                onHoverEnd={() => setIsHovered(false)}
                className="pt-1"
              >
                <button
                  type="submit"
                  className="relative w-full overflow-hidden rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500 transition-colors flex items-center justify-center gap-2"
                >
                  {t("login.sign_in")}
                  <motion.span
                    animate={{ x: isHovered ? 4 : 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <ArrowRight size={16} />
                  </motion.span>
                </button>
              </motion.div>

            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
