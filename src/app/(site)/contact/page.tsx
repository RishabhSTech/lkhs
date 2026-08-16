import type { Metadata } from "next";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { ContactForm } from "@/components/site/contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with the Lime Kraft Home Stays team about a booking, a stay or working together.",
  alternates: { canonical: "/contact" },
};

const CHANNELS = [
  { icon: MessageCircle, label: "WhatsApp", value: "+91 98200 11001", hint: "Fastest for anything urgent" },
  { icon: Mail, label: "Email", value: "stay@limekraft.in", hint: "We reply within a few hours" },
  { icon: Phone, label: "Phone", value: "+91 98200 11001", hint: "9am – 9pm, every day" },
  { icon: MapPin, label: "Office", value: "Vijay Nagar, Indore", hint: "By appointment" },
];

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:py-16">
          <h1 className="font-heading text-4xl leading-tight text-brand-green sm:text-5xl">
            Get in touch
          </h1>
          <p className="mt-3 max-w-lg text-[0.9375rem] leading-relaxed text-muted-foreground">
            Questions about a stay, a booking you've already made, or working
            with us — all of it comes to the same small team.
          </p>

          <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_20rem]">
            <ContactForm />

            <aside>
              <h2 className="text-[0.6875rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                Reach us directly
              </h2>
              <ul className="mt-4 space-y-5">
                {CHANNELS.map((channel) => (
                  <li key={channel.label} className="flex gap-3">
                    <channel.icon className="mt-0.5 size-4 shrink-0 text-brand-sage" />
                    <div>
                      <p className="text-sm font-medium text-brand-ink">
                        {channel.value}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {channel.label} · {channel.hint}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}
