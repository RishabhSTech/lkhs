import { ChevronDown } from "lucide-react";

export type Faq = { question: string; answer: string };

/**
 * Native `<details>` rather than the JS accordion: the answers are then always
 * present in the DOM, which keeps the FAQPage structured data matched to
 * visible content, works with scripting off, and gives keyboard and screen
 * reader behaviour for free.
 */
export function FaqList({ faqs }: { faqs: Faq[] }) {
  return (
    <div className="divide-y divide-border border-y border-border">
      {faqs.map((faq) => (
        <details key={faq.question} className="group py-1">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3.5 text-[0.9375rem] font-medium text-foreground transition-colors hover:text-brand-azure [&::-webkit-details-marker]:hidden">
            {faq.question}
            <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <p className="pb-4 text-sm leading-relaxed text-muted-foreground">
            {faq.answer}
          </p>
        </details>
      ))}
    </div>
  );
}
