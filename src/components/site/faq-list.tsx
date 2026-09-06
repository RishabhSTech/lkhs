import { Plus } from "lucide-react";

export type Faq = { question: string; answer: string };

/**
 * Native `<details>` rather than the JS accordion: the answers are then always
 * present in the DOM, which keeps the FAQPage structured data matched to
 * visible content, works with scripting off, and gives keyboard and screen
 * reader behaviour for free. That decision is load-bearing and is not what
 * changed here.
 *
 * What changed is the dressing. A stack of full-width rows with a chevron on
 * the right is the single most recognisable component on the web, and it made
 * a section of genuinely useful answers look like boilerplate. Numbering the
 * questions and hanging them off the same hairline the rest of the page uses
 * puts them back in the document - and the answer is indented into the measure
 * so an open row reads as a paragraph rather than as a drawer.
 */
export function FaqList({ faqs }: { faqs: Faq[] }) {
  return (
    <div className="border-t border-border">
      {faqs.map((faq, i) => (
        <details key={faq.question} className="group border-b border-border">
          <summary className="flex cursor-pointer list-none items-baseline gap-4 py-4 outline-none focus-visible:underline [&::-webkit-details-marker]:hidden">
            <span className="rule-index__num shrink-0 pt-0.5 text-brand-mist">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="flex-1 text-[0.9375rem] font-medium text-foreground transition-colors group-hover:text-brand-azure">
              {faq.question}
            </span>
            {/* A plus that becomes a minus. It rotates rather than swapping
                glyphs, so the state change is one continuous movement and
                there is no second icon to load. */}
            <Plus
              aria-hidden
              className="size-4 shrink-0 translate-y-0.5 text-brand-mist transition-transform duration-300 group-open:rotate-[135deg] group-open:text-brand-azure"
            />
          </summary>
          {/* Indented to clear the numeral, so the answer sits inside the
              question's measure rather than restarting at the margin. */}
          <p className="copy max-w-prose pb-5 pl-10 text-sm leading-relaxed text-muted-foreground">
            {faq.answer}
          </p>
        </details>
      ))}
    </div>
  );
}
