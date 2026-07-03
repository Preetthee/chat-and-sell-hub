import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "bn";

type Dict = Record<string, string>;

const dictionaries: Record<Lang, Dict> = {
  en: {
    "nav.contact": "Contact",
    "nav.openCart": "Open cart",
    "lang.toggle": "বাংলা",

    "hero.badge": "Harvest Season Ended",
    "hero.title": "Deshi Cart — Tech Essentials\nand Premium Rajshahi Mangoes",
    "hero.subtitle": "Our premium Rajshahi mangoes are sold out for this season. See you next May! Meanwhile, browse our tech essentials below.",

    "products.heading": "Tech Essentials",
    "products.tagline": "Fast delivery across Bangladesh",
    "products.sort": "Sort",
    "products.sort.featured": "Featured",
    "products.sort.priceAsc": "Price: Low → High",
    "products.sort.priceDesc": "Price: High → Low",
    "products.all": "All",
    "products.priceRange": "Price range",
    "products.min": "Min",
    "products.max": "Max",
    "products.empty": "No products match these filters.",

    "card.soldOut": "Sold out",
    "card.inStock": "In stock",
    "card.addToCart": "Add to cart",
    "card.outOfStock": "Out of stock",
    "card.seasonEnded": "Season Ended",
    "card.allOut": "All out.\nStay tuned next year.",

    "cart.title": "Your Cart",
    "cart.empty": "Your cart is empty",
    "cart.emptyHint": "Add some tech essentials to get started.",
    "cart.subtotal": "Subtotal",
    "cart.checkout": "Checkout via WhatsApp",
    "cart.clear": "Clear cart",
    "cart.remove": "Remove",
    "cart.decrease": "Decrease",
    "cart.increase": "Increase",
    "cart.added": "Added {name}",
    "cart.view": "View cart",

    "footer.tagline": "Seasonal mangoes and everyday tech essentials, delivered across Bangladesh.",
    "footer.reach": "Reach us",
    "footer.chat": "Chat now",
    "footer.rights": "All rights reserved.",
  },
  bn: {
    "nav.contact": "যোগাযোগ",
    "nav.openCart": "কার্ট খুলুন",
    "lang.toggle": "English",

    "hero.badge": "মৌসুম শেষ",
    "hero.title": "দেশি কার্ট — টেক এসেনশিয়ালস\nএবং প্রিমিয়াম রাজশাহীর আম",
    "hero.subtitle": "আমাদের প্রিমিয়াম রাজশাহীর আম এই মৌসুমের জন্য শেষ। আগামী মে মাসে আবার দেখা হবে! ততক্ষণে আমাদের টেক পণ্যগুলো দেখুন।",

    "products.heading": "টেক এসেনশিয়ালস",
    "products.tagline": "সারা বাংলাদেশে দ্রুত ডেলিভারি",
    "products.sort": "সাজান",
    "products.sort.featured": "ফিচার্ড",
    "products.sort.priceAsc": "দাম: কম → বেশি",
    "products.sort.priceDesc": "দাম: বেশি → কম",
    "products.all": "সব",
    "products.priceRange": "দামের সীমা",
    "products.min": "সর্বনিম্ন",
    "products.max": "সর্বোচ্চ",
    "products.empty": "এই ফিল্টারে কোনো পণ্য নেই।",

    "card.soldOut": "স্টক শেষ",
    "card.inStock": "স্টকে আছে",
    "card.addToCart": "কার্টে যোগ করুন",
    "card.outOfStock": "স্টকে নেই",
    "card.seasonEnded": "মৌসুম শেষ",
    "card.allOut": "সব শেষ।\nআগামী বছর আবার আসুন।",

    "cart.title": "আপনার কার্ট",
    "cart.empty": "আপনার কার্ট খালি",
    "cart.emptyHint": "শুরু করতে কিছু টেক পণ্য যোগ করুন।",
    "cart.subtotal": "সাবটোটাল",
    "cart.checkout": "WhatsApp-এ চেকআউট",
    "cart.clear": "কার্ট খালি করুন",
    "cart.remove": "সরান",
    "cart.decrease": "কমান",
    "cart.increase": "বাড়ান",
    "cart.added": "{name} যোগ হয়েছে",
    "cart.view": "কার্ট দেখুন",

    "footer.tagline": "মৌসুমি আম আর প্রতিদিনের টেক পণ্য, সারা বাংলাদেশে ডেলিভারি।",
    "footer.reach": "যোগাযোগ",
    "footer.chat": "এখনই চ্যাট করুন",
    "footer.rights": "সর্বস্বত্ব সংরক্ষিত।",
  },
};

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const I18nCtx = createContext<Ctx | null>(null);
const KEY = "deshicart.lang.v1";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY) as Lang | null;
      if (saved === "en" || saved === "bn") setLangState(saved);
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(KEY, l); } catch {}
  };

  const t: Ctx["t"] = (key, vars) => {
    const raw = dictionaries[lang][key] ?? dictionaries.en[key] ?? key;
    if (!vars) return raw;
    return Object.entries(vars).reduce(
      (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)),
      raw,
    );
  };

  return <I18nCtx.Provider value={{ lang, setLang, t }}>{children}</I18nCtx.Provider>;
}

export function useT() {
  const ctx = useContext(I18nCtx);
  if (!ctx) throw new Error("useT must be used within I18nProvider");
  return ctx;
}

export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang, t } = useT();
  return (
    <button
      type="button"
      onClick={() => setLang(lang === "en" ? "bn" : "en")}
      aria-label="Switch language"
      className={
        className ??
        "rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-50"
      }
    >
      {t("lang.toggle")}
    </button>
  );
}