# Content briefs: Noyta blog, next 4 posts

Written 2026-11-22. Goal for all four: traffic + clicks to the maker (`/create`).
Not measured: search volumes, SERP word counts, competitor headings. No live SERP was pulled, so "competitive notes" are assumptions to check in Search Console / Ahrefs before writing. Word counts follow the strategy doc and your existing posts.

Shared rules (match the existing posts):
- File in `apps/web/src/features/blog/posts/`, registered in `index.ts`. Fields: slug, category, occasions, sample block with `lang`, FAQ, mid-article `cta` block.
- 10+ copyable samples, Hindi + English (Devanagari written with the Write tool, no \u escapes).
- Tone: warm, practical, conversational. Reader is the parent/family member sending cards on WhatsApp today.
- Schema: `Article` + `FAQPage` (existing pattern). Add `BreadcrumbList` if the blog layout already emits it.
- Link back to the occasion page, one sibling wording post, and the maker.
- Image: one hero card from the template gallery, alt text with the keyword. Samples should be text, not images.

---

## Brief 1: Haldi, Mehndi and Sangeet invitation message

- **Target keyword**: mehndi invitation message
- **Secondary**: haldi ceremony invitation message, sangeet invitation message, mehndi function invitation in Hindi, haldi invitation card matter, pre-wedding function invitation WhatsApp
- **Intent**: informational with tool tie-in (copy text, then make the card)
- **Word count**: 1300-1500 (assumed, verify against top 5)
- **Audience**: bride/groom's family member or the couple, inviting friends and relatives to pre-wedding events
- **Type**: sample-led wording guide. Category: Wording
- **Slug**: `haldi-mehndi-sangeet-invitation-message`
- **Occasions field**: `['wedding']` (no haldi/mehndi occasion page exists yet; do not invent one)

**Titles**
1. Haldi, Mehndi & Sangeet Invitation Messages (Hindi + English)
2. Mehndi Invitation Message: 12 Samples You Can Copy
3. Sangeet, Haldi, Mehndi Invite Wording for WhatsApp

**Meta description**: Copy-ready haldi, mehndi and sangeet invitation messages in Hindi and English, with dress code lines and timing. Edit and send on WhatsApp. (about 150 chars; trim to fit)

**Outline**
- H1: Haldi, Mehndi & Sangeet Invitation Messages
- H2 Intro: why these functions need their own message (guest lists differ, dress code, timing, often evening or afternoon); what is on the page
- H2 What to include in a pre-wedding function invite: date, time, venue, dress code or colour theme, who is hosting, RSVP, parking or stay info
- H2 Haldi invitation messages: 4 English, 4 Hindi (formal family, friendly, short WhatsApp)
- H2 Mehndi invitation messages: 4 English, 4 Hindi (include "mehndi artists will be there" line)
- H2 Sangeet invitation messages: 4 English, 4 Hindi (include performance/dance line)
- H2 One message for all three functions (combined schedule format)
- mid-article CTA: "Put the schedule on a card, with a map link"
- H2 Dress code and theme lines (yellow for haldi, green for mehndi, etc.), 6 one-liners
- H2 Tips: who to invite to which function, send 2-3 weeks before, include a reminder the day before
- H2 FAQ
  - Should haldi and mehndi get a separate invitation?
  - How early should I invite for sangeet?
  - Can I send one card for all functions?
  - What to write for a ladies-only mehndi?
  - How to write a dress code politely?
- H2 Conclusion with CTA to maker

**Keywords table**
| Keyword | Uses | Where |
|---|---|---|
| mehndi invitation message | 4-5 | title, H1, intro, one H2, conclusion |
| haldi invitation message | 3 | H2, body |
| sangeet invitation message | 3 | H2, body |
| mehndi function invitation in Hindi | 2 | Hindi sample heading, FAQ |

**Internal links**: wedding occasion page ("wedding invitation card"), `wedding-invitation-wording`, `marriage-invitation-message-for-whatsapp`, `when-to-send-wedding-invitations` (timing), `indian-wedding-rsvp-guide`.
**External links**: none required. Optional: none. Do not cite stats you cannot source.
**Competitive notes (assumed)**: generic "wedding card matter" pages mix events; most do not give a dress-code line or a combined-schedule format.
**Differentiation**: separate sample sets per function plus a combined-schedule template, Hindi in Devanagari and Hinglish, ready for WhatsApp length.

---

## Brief 2: Personalised WhatsApp invites for each guest

- **Target keyword**: personalised wedding invitation whatsapp
- **Secondary**: personalised invitation link for each guest, send wedding invitation to guest list on WhatsApp, WhatsApp wedding invitation with guest name, bulk wedding invitation WhatsApp, track who opened wedding invite
- **Intent**: commercial (feature-led how-to)
- **Word count**: 1200-1500
- **Audience**: wedding organiser, often the couple or the parent with 150-500 guests, currently forwarding one forward-message to everyone
- **Type**: how-to guide. Category: Guides
- **Slug**: `personalised-whatsapp-wedding-invitations`
- **Occasions**: `['wedding']`

**Titles**
1. Personalised WhatsApp Wedding Invites for Every Guest
2. How to Send a Personal Wedding Invite to Each Guest
3. Personalised Wedding Invitation on WhatsApp: Step by Step

**Meta description**: Send each guest an invitation with their own name, function list and RSVP link on WhatsApp. Here is how, step by step, and why it works. (trim to 160)

**Outline**
- H1 title
- H2 Intro: the "forwarded many times" invite problem; guests ignore it; what personal means (name, which functions they are invited to, plus-ones)
- H2 What a personalised invite contains (name, function list, RSVP link, count of seats)
- H2 Why it gets more replies than a forward (reasoned, no invented stats)
- H2 Step by step with Noyta: 1 build the card, 2 add guests, 3 choose functions per guest group, 4 send on WhatsApp, 5 see RSVPs. Confirm each step against the real product before publishing.
- mid CTA
- H2 Group guests so each gets the right message (family, friends, office, elders)
- H2 Sample messages to send with the link (6 English, 6 Hindi)
- H2 Etiquette: don't send at night, follow up once, call elders
- H2 Manual option vs tool: honest comparison table (copy-paste names vs Noyta)
- H2 FAQ
  - Can I send different functions to different guests?
  - Does the guest need to install anything?
  - How do I know who has RSVPed?
  - Is it okay to send the invitation only on WhatsApp?
  - How many guests can I add?  (check product limits first)
- H2 Conclusion + CTA

**Internal links**: `indian-wedding-rsvp-guide` (strongest), `wedding-invitation-video-for-whatsapp`, `when-to-send-wedding-invitations`, maker, pricing, template gallery.
**Notes**: verify every feature claim against the product (personalised links, WhatsApp sending, guest groups). Do not claim a WhatsApp Business bot feature unless it is live. Use real screenshots of the guest list screen.
**Competitive notes (assumed)**: top results are probably generic e-invite sites and Canva. Few explain per-guest function lists in an Indian wedding context.
**Differentiation**: per-guest function visibility and RSVP tracking, which matters for multi-day weddings.

---

## Brief 3: Marathi Lagna Patrika matter

- **Target keyword**: lagna patrika matter in marathi
- **Secondary**: lagna patrika marathi, marathi wedding invitation wording, lagnpatrika mayna, marathi lagna patrika format, marathi wedding invitation message for whatsapp
- **Intent**: informational with tool tie-in
- **Word count**: 1500
- **Audience**: Maharashtrian families writing the card text, often in Marathi script, and wanting traditional wording
- **Type**: sample-led wording guide in Marathi + English intro. Category: Wording
- **Slug**: `lagna-patrika-matter-in-marathi`
- **Occasions**: `['wedding']`

**Titles**
1. Lagna Patrika Matter in Marathi: 12 Samples
2. Marathi Wedding Card Matter (Lagna Patrika) With Examples
3. लग्नपत्रिका मजकूर (Lagna Patrika Matter) in Marathi

**Meta description**: Traditional and modern Marathi lagna patrika matter you can copy, with the usual order of lines and sample text. Make the card on Noyta. (trim to 160)

**Outline**
- H1 title
- H2 Intro (English, short), what a lagna patrika usually contains
- H2 Standard order of a Marathi lagna patrika: shri ganesh invocation, family names, bride/groom details, muhurat, venue, "aher/ukhana-free" lines as the user's native review confirms, signatures, "Aapli Upasthiti"
- H2 Traditional samples (4)
- H2 Modern/short samples (4)
- H2 Bride-side and groom-side invitations (2 each)
- mid CTA: Marathi templates with Devanagari fonts
- H2 Common phrases and what they mean (glossary, English gloss for non-Marathi readers)
- H2 WhatsApp-length Marathi message (3)
- H2 FAQ (write in Marathi with English gloss)
  - What is written on a Marathi lagna patrika?
  - Who is named first, bride's or groom's family?
  - Which deity invocation is typical?
  - Can I write it in English or Hinglish?
- H2 Conclusion

**Risk and requirements**: this is regional wording where mistakes are visible. Have a native Marathi speaker review all samples before publishing. Don't machine-translate customs. Verify blog types: `sample.lang` currently only `'en' | 'hi'`; add `'mr'` in `types.ts` (per strategy doc technical notes). Hreflang not needed yet.
**Internal links**: `shadi-card-matter-in-hindi` (sibling), `wedding-invitation-wording`, wedding occasion page, maker (confirm Marathi is one of the 12 UI languages and templates render Marathi fonts).
**Competitive notes (assumed)**: Marathi-script sample blogs exist but are often low quality and ad-heavy. Quality and mobile speed are the differentiator.
**Differentiation**: copy-ready Marathi script with correct fonts plus English gloss, usable straight in the maker.

---

## Brief 4: Canva alternative for Indian wedding cards

- **Target keyword**: canva alternative wedding card india
- **Secondary**: canva vs indian wedding card maker, wedding card maker with hindi fonts, devanagari wedding card online, best wedding card maker india, wedding invitation video maker india
- **Intent**: commercial investigation
- **Word count**: 1500-1800
- **Audience**: someone who tried Canva (or a generic template site) and hit limits: Devanagari/regional text, Indian ritual symbols, RSVP, sending
- **Type**: honest comparison. Category: needs `'Compare'` or use `'Guides'` (type change noted in strategy doc)
- **Slug**: `canva-alternative-indian-wedding-cards`
- **Occasions**: `['wedding']`

**Titles**
1. Canva Alternative for Indian Wedding Cards
2. Canva vs a Wedding Card Maker Built for India
3. Better Than Canva for Hindi Wedding Cards?

**Meta description**: Canva is great for many things. Here is where it falls short for Indian wedding cards, and what to look for in an alternative. (trim to 160)

**Outline**
- H1 title
- H2 Intro: be fair to Canva, state where it works well
- H2 What Indian wedding cards need that generic tools don't: Devanagari + regional fonts, multi-function schedules, sacred marks that follow the family's faith, guest list + RSVP, WhatsApp sharing, print-ready PDF
- H2 Comparison table (Canva vs Noyta vs "other card sites"). Verify every Canva claim on canva.com first and date-stamp the table; avoid unverifiable claims. Only state Noyta features that are live.
- H2 When Canva is the better choice (honesty builds trust)
- H2 When an India-specific maker is better
- mid CTA: try a template
- H2 Checklist: 8 questions to ask any wedding card maker
- H2 Cost and effort (use real Noyta pricing; do not guess)
- H2 FAQ
  - Can I make a wedding card in Hindi on Canva?
  - Which tool gives a print-ready PDF?
  - Can I send cards to guests on WhatsApp?
  - Is there a free option?
- H2 Conclusion + CTA

**Internal links**: template gallery, pricing, `wedding-invitation-video-for-whatsapp`, `personalised-whatsapp-wedding-invitations`, `indian-wedding-rsvp-guide`.
**Risk**: comparison pages invite legal/accuracy scrutiny. Use only verifiable claims, no trademark logos, avoid "best". Date the page and revisit quarterly.
**Competitive notes (assumed)**: Canva's own pages and listicles will dominate the head term; the long tail "hindi" / "india" is the realistic target.
**Differentiation**: India-specific feature checklist, honest "when Canva is better" section, real screenshots of Devanagari rendering.

---

## Production order and checks

1. Brief 1 (mehndi), quick win, no product-claim risk
2. Brief 2 (personalised WhatsApp), confirm product features first
3. Brief 3 (Marathi), needs native reviewer and type change
4. Brief 4 (Canva), write last, needs product and pricing facts confirmed

Pre-publish check for each: target keyword in title and H1, 10+ samples, FAQ matches real questions (check Search Console "People also ask" style queries), links to occasion page and sibling, mid CTA, schema, hero image alt text.
