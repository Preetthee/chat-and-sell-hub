import { CONTACT, whatsappLink } from "./FloatingContact";
import { Mail, Phone, MapPin } from "lucide-react";
import { useT } from "@/lib/i18n";

export function Footer() {
  const { t } = useT();
  return (
    <footer className="mt-20 border-t border-stone-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-full bg-brand-mango" />
            <span className="font-display text-lg font-bold tracking-tight text-brand-ink">DESHI CART</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-stone-500">
            {t("footer.tagline")}
          </p>
        </div>
        <div>
          <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-stone-500">
            {t("footer.reach")}
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-stone-700">
            <li className="flex items-center gap-2">
              <Phone className="size-4 text-brand-mango" />
              <a href={`tel:+${CONTACT.whatsapp}`} className="hover:underline">{CONTACT.phoneDisplay}</a>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="size-4 text-brand-mango" />
              <a href={`mailto:${CONTACT.email}`} className="hover:underline">{CONTACT.email}</a>
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="size-4 text-brand-mango" />
              <span>{CONTACT.address}</span>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-stone-500">
            {t("footer.chat")}
          </h3>
          <div className="mt-3 flex flex-col gap-2">
            <a
              href={whatsappLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              WhatsApp
            </a>
            <a
              href={CONTACT.messengerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0084FF] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Messenger
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-stone-200 px-4 py-4 text-center text-xs text-stone-400">
        &copy; {new Date().getFullYear()} Deshi Cart. {t("footer.rights")}
      </div>
    </footer>
  );
}