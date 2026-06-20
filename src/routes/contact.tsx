import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CONTACT, whatsappLink } from "@/components/FloatingContact";
import { Mail, MapPin, Phone, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Deshi Cart" },
      { name: "description", content: "Reach Deshi Cart on WhatsApp, Messenger, email, or phone." },
      { property: "og:title", content: "Contact Deshi Cart" },
      { property: "og:description", content: "Reach us on WhatsApp, Messenger, email, or phone." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="min-h-screen bg-brand-surface font-sans text-brand-ink">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="font-display text-4xl font-extrabold md:text-5xl">Get in touch</h1>
        <p className="mt-3 max-w-prose text-stone-600">
          Send us a message on WhatsApp or Messenger and we'll get back to you quickly.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <a
            href={whatsappLink("Hi! I'd like to ask about a product.")}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-4 rounded-2xl border border-stone-200 bg-white p-5 transition-shadow hover:shadow-md"
          >
            <div className="grid size-11 place-items-center rounded-full bg-[#25D366] text-white">
              <Phone className="size-5" />
            </div>
            <div>
              <div className="font-display text-lg font-semibold">WhatsApp</div>
              <div className="text-sm text-stone-500">{CONTACT.phoneDisplay}</div>
            </div>
          </a>
          <a
            href={CONTACT.messengerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-4 rounded-2xl border border-stone-200 bg-white p-5 transition-shadow hover:shadow-md"
          >
            <div className="grid size-11 place-items-center rounded-full bg-[#0084FF] text-white">
              <MessageCircle className="size-5" />
            </div>
            <div>
              <div className="font-display text-lg font-semibold">Messenger</div>
              <div className="text-sm text-stone-500">Chat on Facebook Messenger</div>
            </div>
          </a>
          <a
            href={`mailto:${CONTACT.email}`}
            className="flex items-start gap-4 rounded-2xl border border-stone-200 bg-white p-5 transition-shadow hover:shadow-md"
          >
            <div className="grid size-11 place-items-center rounded-full bg-brand-mango text-white">
              <Mail className="size-5" />
            </div>
            <div>
              <div className="font-display text-lg font-semibold">Email</div>
              <div className="text-sm text-stone-500">{CONTACT.email}</div>
            </div>
          </a>
          <div className="flex items-start gap-4 rounded-2xl border border-stone-200 bg-white p-5">
            <div className="grid size-11 place-items-center rounded-full bg-brand-leaf text-white">
              <MapPin className="size-5" />
            </div>
            <div>
              <div className="font-display text-lg font-semibold">Location</div>
              <div className="text-sm text-stone-500">{CONTACT.address}</div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}