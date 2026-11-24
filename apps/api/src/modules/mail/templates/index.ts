import { BRAND, formatINR, type EmailTemplateInfo } from '@cardai/shared';
import { kit, type Kit, type MailLocale, type RenderedEmail } from './blocks.js';

export type { MailLocale } from './blocks.js';

/**
 * How a mail is routed:
 * - `auth`: sign-in codes. Sent immediately (not queued) so the user sees failures, and never
 *   blocked by the suppression list.
 * - `transactional`: account, payment and marketplace notices. Queued with retries; skipped for
 *   suppressed (bounced / complained) addresses.
 * - `marketing`: offers and automations. Also needs the user's opt-in, respects the frequency
 *   cap, goes out from the marketing sender and carries one-click unsubscribe headers.
 */
export type MailCategory = 'auth' | 'transactional' | 'marketing';

export interface MailContext {
  appUrl: string;
  locale: MailLocale;
  unsubscribeUrl?: string;
}

/** Everything a template body needs: the builders for its language plus small helpers. */
interface R extends Kit {
  /** Pick the string for the recipient's language. */
  t: <S>(en: S, hi: S) => S;
  url: (path: string) => string;
  date: (iso: string) => string;
  ctx: MailContext;
}

interface Definition<P> {
  label: string;
  group: EmailTemplateInfo['group'];
  category: MailCategory;
  /** Realistic data for the admin preview gallery. */
  sample: P;
  render(props: P, r: R): RenderedEmail;
}

const define = <P>(d: Definition<P>) => d;

const DATE_FMT = {
  en: new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }),
  hi: new Intl.DateTimeFormat('hi-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }),
};

const PRINT_STATUS: Record<string, { en: [string, string]; hi: [string, string] }> = {
  requested: {
    en: ['We received your print request', 'Our print partner will review it and send you a quote shortly.'],
    hi: ['आपका प्रिंट अनुरोध मिल गया', 'हमारा प्रिंट पार्टनर जल्द ही इसकी कीमत भेजेगा।'],
  },
  quoted: { en: ['Your print quote is ready', 'Review the quote and confirm to start printing.'], hi: ['आपकी प्रिंट कीमत तैयार है', 'कीमत देखें और छपाई शुरू करने के लिए पुष्टि करें।'] },
  confirmed: { en: ['Your print order is confirmed', 'Thank you. Your cards are queued with the press.'], hi: ['आपका प्रिंट ऑर्डर पक्का हो गया', 'धन्यवाद। आपके कार्ड छपाई की कतार में हैं।'] },
  printing: { en: ['Your cards are being printed', 'The press has started on your invitations.'], hi: ['आपके कार्ड छप रहे हैं', 'प्रेस ने आपके निमंत्रण पत्र छापना शुरू कर दिया है।'] },
  shipped: { en: ['Your cards are on the way', 'Your printed invitations have been shipped.'], hi: ['आपके कार्ड रास्ते में हैं', 'आपके छपे हुए निमंत्रण पत्र भेज दिए गए हैं।'] },
  delivered: { en: ['Your cards were delivered', 'We hope your guests love them.'], hi: ['आपके कार्ड पहुँच गए', 'उम्मीद है आपके मेहमानों को ये पसंद आएँगे।'] },
  cancelled: {
    en: ['Your print order was cancelled', 'If this is unexpected, reply to this email and we will help.'],
    hi: ['आपका प्रिंट ऑर्डर रद्द हो गया', 'अगर यह अनचाहा है, तो इस ईमेल का जवाब दें, हम मदद करेंगे।'],
  },
};

const OFFER_REASON = {
  en: `You are receiving this because you have a ${BRAND.name} account and opted in to offers.`,
  hi: `यह ईमेल इसलिए आया क्योंकि आपका ${BRAND.name} खाता है और आपने ऑफ़र पाने की सहमति दी है।`,
};

export const TEMPLATES = {
  'otp.signin': define<{ code: string; ttlMinutes: number }>({
    label: 'Sign-in code',
    group: 'Sign-in',
    category: 'auth',
    sample: { code: '482915', ttlMinutes: 10 },
    render: (p, { t, layout, kicker, heading, para, codeBox, ctx }) =>
      layout({
        appUrl: ctx.appUrl,
        subject: t(`${p.code} is your ${BRAND.name} sign-in code`, `${p.code} आपका ${BRAND.name} साइन-इन कोड है`),
        preheader: t(`Enter this code to sign in. It expires in ${p.ttlMinutes} minutes.`, `साइन इन करने के लिए यह कोड डालें। यह ${p.ttlMinutes} मिनट में समाप्त हो जाएगा।`),
        reason: t(
          `You are receiving this because someone asked to sign in to ${BRAND.name} with this address. If it was not you, ignore this email.`,
          `यह ईमेल इसलिए आया क्योंकि किसी ने इस पते से ${BRAND.name} में साइन इन करना चाहा। अगर यह आप नहीं थे, तो इसे अनदेखा करें।`,
        ),
        blocks: [
          kicker(t('Sign in', 'साइन इन')),
          heading(t('Your sign-in code', 'आपका साइन-इन कोड')),
          para(
            t(
              'Enter this code on the sign-in screen. New here? The same code creates your account.',
              'साइन-इन स्क्रीन पर यह कोड डालें। नए हैं? यही कोड आपका खाता बना देगा।',
            ),
          ),
          codeBox(p.code),
          para(
            t(
              `It expires in ${p.ttlMinutes} minutes. Never share this code with anyone, including ${BRAND.name} staff.`,
              `यह ${p.ttlMinutes} मिनट में समाप्त हो जाएगा। यह कोड किसी के साथ साझा न करें, ${BRAND.name} टीम के साथ भी नहीं।`,
            ),
            { muted: true, small: true },
          ),
        ],
      }),
  }),

  'otp.delete': define<{ code: string; ttlMinutes: number }>({
    label: 'Account deletion code',
    group: 'Sign-in',
    category: 'auth',
    sample: { code: '615203', ttlMinutes: 10 },
    render: (p, { t, layout, kicker, heading, para, codeBox, notice, ctx }) =>
      layout({
        appUrl: ctx.appUrl,
        subject: t(`${p.code} is your ${BRAND.name} account deletion code`, `${p.code} आपका ${BRAND.name} खाता हटाने का कोड है`),
        preheader: t(`Enter this code to permanently delete your account. It expires in ${p.ttlMinutes} minutes.`, `खाता हमेशा के लिए हटाने के लिए यह कोड डालें। यह ${p.ttlMinutes} मिनट में समाप्त होगा।`),
        blocks: [
          kicker(t('Delete account', 'खाता हटाएँ')),
          heading(t('Confirm account deletion', 'खाता हटाने की पुष्टि करें')),
          para(
            t(
              'Enter this code to permanently delete your account, invitations, guest lists and files. This cannot be undone.',
              'अपना खाता, निमंत्रण, मेहमान सूची और फ़ाइलें हमेशा के लिए हटाने के लिए यह कोड डालें। इसे वापस नहीं किया जा सकता।',
            ),
          ),
          codeBox(p.code),
          notice(
            t(
              'If you did not ask to delete your account, ignore this email: nothing is deleted without this code. Then sign out every device from Settings.',
              'अगर आपने खाता हटाने को नहीं कहा, तो इस ईमेल को अनदेखा करें: इस कोड के बिना कुछ नहीं हटेगा। फिर सेटिंग्स से सभी डिवाइस से लॉग आउट करें।',
            ),
          ),
        ],
      }),
  }),

  'event.cohost': define<{ inviterName: string | null; eventTitle: string; role: string; eventId: string }>({
    label: 'Co-host invitation',
    group: 'Account',
    category: 'transactional',
    sample: { inviterName: 'Priya Sharma', eventTitle: 'Rahul weds Priya', role: 'Guests & RSVPs only', eventId: '00000000-0000-0000-0000-000000000000' },
    render: (p, { t, layout, kicker, heading, para, details, button, url, ctx }) =>
      layout({
        appUrl: ctx.appUrl,
        subject: t(`${p.inviterName ?? 'Your family'} added you as a co-host of ${p.eventTitle}`, `${p.inviterName ?? 'आपके परिवार'} ने आपको ${p.eventTitle} का सह-मेज़बान बनाया`),
        preheader: t('Help with guests, RSVPs and the invitation. Sign in with this email to start.', 'मेहमान, RSVP और निमंत्रण में मदद करें। शुरू करने के लिए इसी ईमेल से साइन इन करें।'),
        reason: t('You are receiving this because a host added this address as a co-host.', 'यह ईमेल इसलिए आया क्योंकि एक मेज़बान ने इस पते को सह-मेज़बान के रूप में जोड़ा।'),
        blocks: [
          kicker(t('Co-host invitation', 'सह-मेज़बान निमंत्रण')),
          heading(p.eventTitle),
          para(
            t(
              `${p.inviterName ?? 'A host'} wants your help running this invitation on ${BRAND.name}.`,
              `${p.inviterName ?? 'एक मेज़बान'} चाहते हैं कि आप ${BRAND.name} पर इस निमंत्रण को संभालने में मदद करें।`,
            ),
          ),
          details([{ label: t('Your role', 'आपकी भूमिका'), value: p.role }]),
          button(t('Open the invitation', 'निमंत्रण खोलें'), url(`/dashboard/events/${p.eventId}`)),
          para(t('Sign in with this email address. The invitation then shows on your dashboard.', 'इसी ईमेल पते से साइन इन करें। फिर निमंत्रण आपके डैशबोर्ड पर दिखेगा।'), { muted: true, small: true }),
        ],
      }),
  }),

  'referral.reward': define<{ name: string | null; code: string; percent: number; validDays: number }>({
    label: 'Referral thank-you coupon',
    group: 'Account',
    category: 'transactional',
    sample: { name: 'Priya Sharma', code: 'THANKS-K7QP2', percent: 20, validDays: 90 },
    render: (p, { t, layout, kicker, heading, greeting, para, codeBox, button, url, ctx }) =>
      layout({
        appUrl: ctx.appUrl,
        subject: t(`A thank-you from ${BRAND.name}: ${p.percent}% off your next invitation`, `${BRAND.name} की ओर से धन्यवाद: अगले निमंत्रण पर ${p.percent}% छूट`),
        preheader: t('Someone who saw your invitation made one of their own.', 'आपका निमंत्रण देखकर किसी ने अपना निमंत्रण बनाया।'),
        blocks: [
          kicker(t('Thank you', 'धन्यवाद')),
          heading(t('Your invitation inspired someone', 'आपके निमंत्रण से किसी को प्रेरणा मिली')),
          greeting(p.name),
          para(
            t(
              `A guest who opened your invitation made and paid for one of their own. Here is ${p.percent}% off your next one.`,
              `आपका निमंत्रण खोलने वाले एक मेहमान ने अपना निमंत्रण बनाया। आपके अगले निमंत्रण पर ${p.percent}% की छूट।`,
            ),
          ),
          codeBox(p.code, t(`Valid for ${p.validDays} days`, `${p.validDays} दिन तक मान्य`)),
          button(t('Make an invitation', 'निमंत्रण बनाएँ'), url('/create')),
        ],
      }),
  }),

  'account.welcome': define<{ name: string | null }>({
    label: 'Welcome',
    group: 'Account',
    category: 'transactional',
    sample: { name: 'Priya Sharma' },
    render: (p, { t, layout, kicker, heading, greeting, para, list, button, url, ctx }) =>
      layout({
        appUrl: ctx.appUrl,
        subject: t(`Welcome to ${BRAND.name}`, `${BRAND.name} में आपका स्वागत है`),
        preheader: t('Make your first card, video or website invitation in about two minutes.', 'लगभग दो मिनट में अपना पहला कार्ड, वीडियो या वेबसाइट निमंत्रण बनाइए।'),
        blocks: [
          kicker(t('Welcome', 'स्वागत है')),
          heading(t('Your invitations start here', 'आपके निमंत्रण यहीं से शुरू होते हैं')),
          greeting(p.name),
          para(t(`Thanks for joining ${BRAND.name}. Here is what you can make:`, `${BRAND.name} से जुड़ने के लिए धन्यवाद। आप ये बना सकते हैं:`)),
          list(
            t(
              ['Image cards for WhatsApp and print', 'Cinematic 9:16 video invites with music', 'An invitation website with RSVPs, map and wishes'],
              ['WhatsApp और प्रिंट के लिए कार्ड', 'संगीत के साथ 9:16 वीडियो निमंत्रण', 'RSVP, नक्शा और शुभकामनाओं वाली निमंत्रण वेबसाइट'],
            ),
          ),
          button(t('Start an invitation', 'निमंत्रण बनाना शुरू करें'), url('/create')),
          para(t('Questions? Just reply to this email.', 'कोई सवाल? बस इस ईमेल का जवाब दें।'), { muted: true, small: true }),
        ],
      }),
  }),

  'security.new_login': define<{ name: string | null; device: string; method: string; at: string }>({
    label: 'New sign-in alert',
    group: 'Account',
    category: 'transactional',
    sample: { name: 'Priya Sharma', device: 'Chrome on Windows', method: 'Email code', at: '2026-11-18T10:12:00.000Z' },
    render: (p, { t, layout, kicker, heading, greeting, para, details, notice, button, url, date, ctx }) =>
      layout({
        appUrl: ctx.appUrl,
        subject: t(`New sign-in to your ${BRAND.name} account`, `आपके ${BRAND.name} खाते में नया लॉगिन`),
        preheader: `${p.device} · ${date(p.at)}`,
        blocks: [
          kicker(t('Security', 'सुरक्षा')),
          heading(t('New sign-in detected', 'नया लॉगिन हुआ')),
          greeting(p.name),
          para(t('Your account was just signed in to from a device we have not seen before.', 'आपके खाते में अभी एक ऐसे डिवाइस से लॉगिन हुआ जिसे हमने पहले नहीं देखा।')),
          details([
            { label: t('Device', 'डिवाइस'), value: p.device },
            { label: t('Method', 'तरीका'), value: p.method },
            { label: t('Time', 'समय'), value: date(p.at) },
          ]),
          notice(
            t(
              'If this was you, there is nothing to do. If not, sign out every device from Settings now, and secure the email or WhatsApp account that receives your sign-in codes.',
              'अगर यह आप थे, तो कुछ करने की ज़रूरत नहीं। अगर नहीं, तो अभी सेटिंग्स से सभी डिवाइस से लॉग आउट करें, और जिस ईमेल या WhatsApp पर साइन-इन कोड आते हैं उसे सुरक्षित करें।',
            ),
            t('Not you?', 'यह आप नहीं थे?'),
          ),
          button(t('Review signed-in devices', 'लॉग-इन डिवाइस देखें'), url('/dashboard/settings')),
        ],
      }),
  }),

  'payment.receipt': define<{
    name: string | null;
    orderId: string;
    product: string;
    eventTitle: string;
    listPricePaise: number;
    discountPaise: number;
    couponCode: string | null;
    amountPaise: number;
    paymentId: string | null;
    paidAt: string;
    eventId: string;
  }>({
    label: 'Payment receipt',
    group: 'Payments',
    category: 'transactional',
    sample: {
      name: 'Priya Sharma',
      orderId: '9b2f6c1e-4d0a-4f7e-8a51-3c2d1e0f9a87',
      product: 'Video Invite',
      eventTitle: 'Priya & Arjun — Wedding',
      listPricePaise: 49900,
      discountPaise: 10000,
      couponCode: 'SHAADI100',
      amountPaise: 39900,
      paymentId: 'pay_PQ8x2LmN0aBc',
      paidAt: '2026-11-18T10:12:00.000Z',
      eventId: '00000000-0000-4000-8000-000000000000',
    },
    render: (p, { t, layout, kicker, heading, greeting, para, details, button, url, date, ctx }) =>
      layout({
        appUrl: ctx.appUrl,
        subject: t(`Receipt for ${p.product} · ${formatINR(p.amountPaise)}`, `${p.product} की रसीद · ${formatINR(p.amountPaise)}`),
        preheader: t(`Payment received for ${p.eventTitle}. Your ${p.product} is unlocked.`, `${p.eventTitle} के लिए भुगतान मिल गया। आपका ${p.product} चालू है।`),
        blocks: [
          kicker(t('Payment receipt', 'भुगतान रसीद')),
          heading(t('Thank you, payment received', 'धन्यवाद, भुगतान मिल गया')),
          greeting(p.name),
          para(t(`Your ${p.product} for “${p.eventTitle}” is unlocked and ready to use.`, `“${p.eventTitle}” के लिए आपका ${p.product} चालू है और इस्तेमाल के लिए तैयार है।`)),
          details([
            { label: t('Item', 'आइटम'), value: p.product },
            ...(p.discountPaise > 0
              ? [
                  { label: t('Price', 'कीमत'), value: formatINR(p.listPricePaise) },
                  { label: p.couponCode ? `${t('Discount', 'छूट')} (${p.couponCode})` : t('Discount', 'छूट'), value: `− ${formatINR(p.discountPaise)}` },
                ]
              : []),
            { label: t('Total paid', 'कुल भुगतान'), value: formatINR(p.amountPaise), strong: true },
            { label: t('Date', 'तारीख'), value: date(p.paidAt) },
            { label: t('Order', 'ऑर्डर'), value: p.orderId.slice(0, 8).toUpperCase() },
            ...(p.paymentId ? [{ label: t('Payment ID', 'पेमेंट ID'), value: p.paymentId }] : []),
          ]),
          button(t('Open your invitation', 'अपना निमंत्रण खोलें'), url(`/dashboard/events/${p.eventId}`)),
          para(
            t('Keep this email for your records. For billing questions, reply with your order number.', 'यह ईमेल अपने रिकॉर्ड के लिए रखें। भुगतान से जुड़े सवालों के लिए ऑर्डर नंबर के साथ जवाब दें।'),
            { muted: true, small: true },
          ),
        ],
      }),
  }),

  'print.status': define<{
    name: string | null;
    orderId: string;
    status: string;
    eventTitle: string;
    quantity: number;
    paperType: string;
    quotePaise: number | null;
    note: string | null;
  }>({
    label: 'Print order update',
    group: 'Payments',
    category: 'transactional',
    sample: {
      name: 'Priya Sharma',
      orderId: '5a1e2b3c-4d5e-4f60-8a71-b2c3d4e5f607',
      status: 'quoted',
      eventTitle: 'Priya & Arjun — Wedding',
      quantity: 150,
      paperType: 'Matte 350gsm',
      quotePaise: 675000,
      note: null,
    },
    render: (p, { t, layout, kicker, heading, greeting, para, details, notice, button, url, ctx }) => {
      const s = PRINT_STATUS[p.status];
      const [title, line] = s ? t(s.en, s.hi) : [t(`Print order: ${p.status}`, `प्रिंट ऑर्डर: ${p.status}`), t('Your print order was updated.', 'आपका प्रिंट ऑर्डर अपडेट हुआ।')];
      return layout({
        appUrl: ctx.appUrl,
        subject: `${title} · ${p.eventTitle}`,
        preheader: line,
        blocks: [
          kicker(`${t('Print order', 'प्रिंट ऑर्डर')} · ${p.status}`),
          heading(title),
          greeting(p.name),
          para(line),
          details([
            { label: t('Invitation', 'निमंत्रण'), value: p.eventTitle },
            { label: t('Quantity', 'संख्या'), value: t(`${p.quantity} cards`, `${p.quantity} कार्ड`) },
            { label: t('Paper', 'कागज़'), value: p.paperType },
            ...(p.quotePaise != null ? [{ label: t('Quote', 'कीमत'), value: formatINR(p.quotePaise), strong: true }] : []),
            { label: t('Order', 'ऑर्डर'), value: p.orderId.slice(0, 8).toUpperCase() },
          ]),
          ...(p.note ? [notice(p.note, t('Note from the press', 'प्रेस की ओर से नोट'))] : []),
          button(t('View print order', 'प्रिंट ऑर्डर देखें'), url('/dashboard/orders')),
        ],
      });
    },
  }),

  'marketplace.template_reviewed': define<{ name: string | null; templateName: string; approved: boolean; note: string | null }>({
    label: 'Template review result',
    group: 'Marketplace',
    category: 'transactional',
    sample: { name: 'Kavya Iyer', templateName: 'Marigold Mandap', approved: true, note: null },
    render: (p, { t, layout, kicker, heading, greeting, para, notice, button, url, ctx }) =>
      layout({
        appUrl: ctx.appUrl,
        subject: p.approved
          ? t(`“${p.templateName}” is live on ${BRAND.name}`, `“${p.templateName}” अब ${BRAND.name} पर लाइव है`)
          : t(`Changes needed for “${p.templateName}”`, `“${p.templateName}” में कुछ बदलाव चाहिए`),
        preheader: p.approved
          ? t('Your template passed review and is now in the catalogue.', 'आपका टेम्पलेट समीक्षा में पास हुआ और अब कैटलॉग में है।')
          : t('Your template needs a few changes before it can go live.', 'लाइव होने से पहले आपके टेम्पलेट में कुछ बदलाव चाहिए।'),
        blocks: [
          kicker(t('Marketplace review', 'मार्केटप्लेस समीक्षा')),
          heading(p.approved ? t('Your template is live', 'आपका टेम्पलेट लाइव है') : t('A few changes needed', 'कुछ बदलाव चाहिए')),
          greeting(p.name),
          para(
            p.approved
              ? t(
                  `“${p.templateName}” passed review and is now in the ${BRAND.name} catalogue. You earn a share every time someone pays for an invitation made with it.`,
                  `“${p.templateName}” समीक्षा में पास हुआ और अब ${BRAND.name} कैटलॉग में है। जब भी कोई इससे बने निमंत्रण के लिए भुगतान करेगा, आपको हिस्सा मिलेगा।`,
                )
              : t(`Thanks for submitting “${p.templateName}”. It is not ready to publish yet.`, `“${p.templateName}” भेजने के लिए धन्यवाद। यह अभी प्रकाशित करने के लिए तैयार नहीं है।`),
          ),
          ...(p.note ? [notice(p.note, t('Reviewer note', 'समीक्षक का नोट'))] : []),
          button(p.approved ? t('See your templates', 'अपने टेम्पलेट देखें') : t('Edit and resubmit', 'सुधारें और दोबारा भेजें'), url('/designer')),
        ],
      }),
  }),

  'marketplace.designer_reviewed': define<{ name: string | null; approved: boolean }>({
    label: 'Designer application result',
    group: 'Marketplace',
    category: 'transactional',
    sample: { name: 'Kavya Iyer', approved: true },
    render: (p, { t, layout, kicker, heading, greeting, para, button, url, ctx }) =>
      layout({
        appUrl: ctx.appUrl,
        subject: p.approved ? t(`You are now a ${BRAND.name} designer`, `अब आप ${BRAND.name} डिज़ाइनर हैं`) : t(`About your ${BRAND.name} designer application`, `आपके ${BRAND.name} डिज़ाइनर आवेदन के बारे में`),
        preheader: p.approved ? t('Start publishing templates to the marketplace.', 'मार्केटप्लेस पर टेम्पलेट प्रकाशित करना शुरू करें।') : t('An update on your designer application.', 'आपके डिज़ाइनर आवेदन पर अपडेट।'),
        blocks: [
          kicker(t('Designer programme', 'डिज़ाइनर प्रोग्राम')),
          heading(p.approved ? t('Welcome to the marketplace', 'मार्केटप्लेस में स्वागत है') : t('Application update', 'आवेदन अपडेट')),
          greeting(p.name),
          para(
            p.approved
              ? t(
                  'Your designer application was approved. You can now build templates, submit them for review and earn from every sale.',
                  'आपका डिज़ाइनर आवेदन स्वीकार हो गया। अब आप टेम्पलेट बना सकते हैं, समीक्षा के लिए भेज सकते हैं और हर बिक्री से कमा सकते हैं।',
                )
              : t(
                  'Thank you for applying. We are not able to approve your designer application right now. You are welcome to apply again with an updated portfolio.',
                  'आवेदन के लिए धन्यवाद। अभी हम आपका डिज़ाइनर आवेदन स्वीकार नहीं कर पा रहे हैं। नए पोर्टफ़ोलियो के साथ आप फिर से आवेदन कर सकते हैं।',
                ),
          ),
          button(p.approved ? t('Open designer studio', 'डिज़ाइनर स्टूडियो खोलें') : t('View application', 'आवेदन देखें'), url('/designer')),
        ],
      }),
  }),

  'marketplace.sale_earned': define<{ name: string | null; templateName: string; amountPaise: number }>({
    label: 'Template sale earning',
    group: 'Marketplace',
    category: 'transactional',
    sample: { name: 'Kavya Iyer', templateName: 'Marigold Mandap', amountPaise: 11970 },
    render: (p, { t, layout, kicker, heading, greeting, para, button, url, ctx }) =>
      layout({
        appUrl: ctx.appUrl,
        subject: t(`You earned ${formatINR(p.amountPaise)} from “${p.templateName}”`, `“${p.templateName}” से आपने ${formatINR(p.amountPaise)} कमाए`),
        preheader: t('Someone just paid for an invitation made with your template.', 'किसी ने अभी आपके टेम्पलेट से बने निमंत्रण के लिए भुगतान किया।'),
        blocks: [
          kicker(t('Marketplace earning', 'मार्केटप्लेस कमाई')),
          heading(`+ ${formatINR(p.amountPaise)}`),
          greeting(p.name),
          para(
            t(
              `Someone just paid for an invitation made with “${p.templateName}”. Your share has been added to your pending payouts.`,
              `किसी ने अभी “${p.templateName}” से बने निमंत्रण के लिए भुगतान किया। आपका हिस्सा आपके बकाया भुगतान में जोड़ दिया गया है।`,
            ),
          ),
          button(t('View earnings', 'कमाई देखें'), url('/designer')),
        ],
      }),
  }),

  campaign: define<{
    name: string | null;
    subject: string;
    preheader: string | null;
    heading: string;
    body: string;
    ctaLabel: string | null;
    ctaUrl: string | null;
    couponCode: string | null;
  }>({
    label: 'Offer / campaign',
    group: 'Offers',
    category: 'marketing',
    sample: {
      name: 'Priya Sharma',
      subject: 'Wedding season: 25% off video invites',
      preheader: 'This week only, every cinematic video invite is 25% off.',
      heading: 'Wedding season is here',
      body: 'Every cinematic video invite is 25% off until Sunday.\n\n- 10+ painted wedding designs\n- Music library and 9:16 export for WhatsApp\n- Matching invitation website included',
      ctaLabel: 'Browse video designs',
      ctaUrl: '/templates?format=video',
      couponCode: 'SHAADI25',
    },
    // Admin-written copy is one language; only the frame (greeting, labels, footer) follows the user.
    render: (p, { t, layout, kicker, heading, greeting, richText, codeBox, button, divider, url, ctx }) =>
      layout({
        appUrl: ctx.appUrl,
        unsubscribeUrl: ctx.unsubscribeUrl,
        reason: t(OFFER_REASON.en, OFFER_REASON.hi),
        subject: p.subject,
        preheader: p.preheader ?? p.heading,
        blocks: [
          kicker(`${BRAND.name} · ${t('Offer', 'ऑफ़र')}`),
          heading(p.heading),
          greeting(p.name),
          ...richText(p.body),
          ...(p.couponCode ? [codeBox(p.couponCode, t('Use code at checkout', 'भुगतान के समय यह कोड डालें'))] : []),
          ...(p.ctaLabel && p.ctaUrl ? [button(p.ctaLabel, p.ctaUrl.startsWith('/') ? url(p.ctaUrl) : p.ctaUrl)] : [divider()]),
        ],
      }),
  }),

  'lifecycle.abandoned_checkout': define<{ name: string | null; product: string; eventTitle: string; eventId: string; pricePaise: number; couponCode: string | null }>({
    label: 'Abandoned checkout reminder',
    group: 'Automations',
    category: 'marketing',
    sample: { name: 'Priya Sharma', product: 'Video Invite', eventTitle: 'Priya & Arjun — Wedding', eventId: '00000000-0000-4000-8000-000000000000', pricePaise: 49900, couponCode: 'COMEBACK10' },
    render: (p, { t, layout, kicker, heading, greeting, para, codeBox, button, url, ctx }) =>
      layout({
        appUrl: ctx.appUrl,
        unsubscribeUrl: ctx.unsubscribeUrl,
        subject: t(`Your ${p.product} for “${p.eventTitle}” is waiting`, `“${p.eventTitle}” का ${p.product} आपका इंतज़ार कर रहा है`),
        preheader: p.couponCode
          ? t(`Finish checkout with code ${p.couponCode} for a little extra off.`, `कोड ${p.couponCode} के साथ भुगतान पूरा करें और थोड़ी और छूट पाएँ।`)
          : t('Pick up where you left off. Your design is saved.', 'जहाँ छोड़ा था वहीं से शुरू करें। आपका डिज़ाइन सुरक्षित है।'),
        reason: t(OFFER_REASON.en, OFFER_REASON.hi),
        blocks: [
          kicker(t('Still deciding?', 'अभी सोच रहे हैं?')),
          heading(t('Your invitation is one step away', 'आपका निमंत्रण बस एक कदम दूर है')),
          greeting(p.name),
          para(
            t(
              `You started buying the ${p.product} (${formatINR(p.pricePaise)}) for “${p.eventTitle}” but did not finish. Your design is saved exactly as you left it.`,
              `आपने “${p.eventTitle}” के लिए ${p.product} (${formatINR(p.pricePaise)}) खरीदना शुरू किया था, पर पूरा नहीं हुआ। आपका डिज़ाइन वैसे ही सुरक्षित है।`,
            ),
          ),
          ...(p.couponCode ? [codeBox(p.couponCode, t('A little extra off', 'थोड़ी और छूट'))] : []),
          button(t('Finish checkout', 'भुगतान पूरा करें'), url(`/dashboard/events/${p.eventId}`)),
          para(t('Had trouble paying? Reply to this email and we will help.', 'भुगतान में दिक्कत आई? इस ईमेल का जवाब दें, हम मदद करेंगे।'), { muted: true, small: true }),
        ],
      }),
  }),

  'site.visitor_limit': define<{ name: string | null; eventTitle: string; eventId: string; visitors: number; limit: number; reached: boolean }>({
    label: 'Free website visitor limit',
    group: 'Automations',
    category: 'transactional',
    sample: { name: 'Priya Sharma', eventTitle: 'Priya & Arjun — Wedding', eventId: '00000000-0000-4000-8000-000000000000', visitors: 50, limit: 50, reached: true },
    render: (p, { t, layout, kicker, heading, greeting, para, button, url, ctx }) =>
      layout({
        appUrl: ctx.appUrl,
        subject: p.reached
          ? t(`${p.limit} people opened “${p.eventTitle}”: upgrade so everyone sees all of it`, `“${p.eventTitle}” ${p.limit} लोगों ने खोला: अपग्रेड करें ताकि सबको पूरा दिखे`)
          : t(`${p.visitors} of ${p.limit} free website visits used for “${p.eventTitle}”`, `“${p.eventTitle}” की ${p.limit} में से ${p.visitors} मुफ़्त विज़िट हो गईं`),
        preheader: p.reached
          ? t('New guests now see only the names, date and venue.', 'नए मेहमानों को अब सिर्फ़ नाम, तारीख़ और जगह दिख रही है।')
          : t(`After ${p.limit} people, new guests will see only the basics.`, `${p.limit} लोगों के बाद नए मेहमानों को सिर्फ़ मुख्य जानकारी दिखेगी।`),
        reason: t(
          `You are receiving this because you made the invitation “${p.eventTitle}” on ${BRAND.name} on the free plan.`,
          `यह ईमेल इसलिए आया क्योंकि आपने ${BRAND.name} पर मुफ़्त प्लान में “${p.eventTitle}” निमंत्रण बनाया है।`,
        ),
        blocks: [
          kicker(t('Your invitation website', 'आपकी निमंत्रण वेबसाइट')),
          heading(
            p.reached
              ? t('Your guests love your invitation', 'आपके मेहमानों को निमंत्रण पसंद आ रहा है')
              : t(`${p.visitors} people have opened it already`, `${p.visitors} लोग इसे खोल चुके हैं`),
          ),
          greeting(p.name),
          para(
            p.reached
              ? t(
                  `${p.limit} people have opened your free invitation website. Guests who open it from now on still see the names, date, venue and map, but not your photos, story, RSVP and the other sections.`,
                  `आपकी मुफ़्त निमंत्रण वेबसाइट ${p.limit} लोगों ने खोल ली है। अब से खोलने वाले मेहमानों को नाम, तारीख़, जगह और नक्शा दिखेगा, पर आपकी फ़ोटो, कहानी, RSVP और बाकी हिस्से नहीं।`,
                )
              : t(
                  `The free website opens in full for ${p.limit} people. After that, new guests see only the names, date, venue and map.`,
                  `मुफ़्त वेबसाइट ${p.limit} लोगों के लिए पूरी खुलती है। उसके बाद नए मेहमानों को सिर्फ़ नाम, तारीख़, जगह और नक्शा दिखेगा।`,
                ),
          ),
          para(
            t(
              'Upgrade to Site Premium and every guest sees the whole invitation, with no visitor limit, RSVPs, music and your own link.',
              'साइट प्रीमियम में अपग्रेड करें: हर मेहमान को पूरा निमंत्रण दिखेगा, बिना विज़िट सीमा के, RSVP, संगीत और आपके अपने लिंक के साथ।',
            ),
          ),
          button(t('Upgrade the website', 'वेबसाइट अपग्रेड करें'), url(`/dashboard/events/${p.eventId}?upgrade=site`)),
        ],
      }),
  }),

  'lifecycle.winback': define<{ name: string | null; newDesigns: number }>({
    label: 'Win-back (inactive 60 days)',
    group: 'Automations',
    category: 'marketing',
    sample: { name: 'Priya Sharma', newDesigns: 24 },
    render: (p, { t, layout, kicker, heading, greeting, para, list, button, url, ctx }) =>
      layout({
        appUrl: ctx.appUrl,
        unsubscribeUrl: ctx.unsubscribeUrl,
        subject:
          p.newDesigns > 0
            ? t(`${p.newDesigns} new invitation designs since your last visit`, `आपकी पिछली विज़िट के बाद ${p.newDesigns} नए निमंत्रण डिज़ाइन`)
            : t(`What's new on ${BRAND.name}`, `${BRAND.name} पर नया क्या है`),
        preheader: t('New designs for weddings, festivals and family functions.', 'शादी, त्योहार और पारिवारिक समारोहों के लिए नए डिज़ाइन।'),
        reason: t(OFFER_REASON.en, OFFER_REASON.hi),
        blocks: [
          kicker(t('It has been a while', 'काफ़ी समय हो गया')),
          heading(p.newDesigns > 0 ? t(`${p.newDesigns} new designs to explore`, `देखने के लिए ${p.newDesigns} नए डिज़ाइन`) : t('Fresh designs are waiting', 'नए डिज़ाइन आपका इंतज़ार कर रहे हैं')),
          greeting(p.name),
          para(t('Planning a function soon? Here is what is new since you last visited:', 'जल्द कोई समारोह है? आपकी पिछली विज़िट के बाद यह नया आया है:')),
          list(
            t(
              ['New card and video designs for weddings and festivals', 'Invitation websites with RSVPs and directions', 'Send on WhatsApp in a tap'],
              ['शादी और त्योहारों के लिए नए कार्ड और वीडियो डिज़ाइन', 'RSVP और रास्ते के साथ निमंत्रण वेबसाइट', 'एक टैप में WhatsApp पर भेजें'],
            ),
          ),
          button(t('See new designs', 'नए डिज़ाइन देखें'), url('/templates')),
        ],
      }),
  }),
  'admin.otp': define<{ code: string; ttlMinutes: number; device: string }>({
    label: 'Admin sign-in check',
    group: 'Admin',
    category: 'auth',
    sample: { code: '615204', ttlMinutes: 10, device: 'Chrome on Windows' },
    render: (p, { layout, kicker, heading, para, codeBox, notice, ctx }) =>
      layout({
        appUrl: ctx.appUrl,
        subject: `${p.code} is your ${BRAND.name} admin console code`,
        preheader: `Someone is opening the admin console. The code expires in ${p.ttlMinutes} minutes.`,
        reason: `You are receiving this because your account has admin access to ${BRAND.name}.`,
        blocks: [
          kicker('Admin console'),
          heading('Confirm it is you'),
          para(`Enter this code to open the admin console on ${p.device}. You will not be asked again on this device for 12 hours.`),
          codeBox(p.code),
          notice('If you did not just try to open the admin console, someone else is signed in to your account. Sign out every device from Settings, secure your email and tell the other admins.', 'Not you?'),
        ],
      }),
  }),

  'admin.alert': define<{ title: string; detail: string; severity: 'warn' | 'critical'; actions: string[] }>({
    label: 'Admin alert',
    group: 'Admin',
    category: 'transactional',
    sample: { title: '7 video renders failed in 30 minutes', detail: '7 of 9 renders failed since 14:10 IST. Latest error: Chrome crashed.', severity: 'critical', actions: ['Check the worker logs', 'Pause video rendering from Settings → Switches if it keeps failing'] },
    render: (p, { layout, kicker, heading, para, list, button, url, ctx }) =>
      layout({
        appUrl: ctx.appUrl,
        subject: `${p.severity === 'critical' ? '🔴' : '🟠'} ${p.title}`,
        preheader: p.detail.slice(0, 120),
        reason: `You are receiving this because you are a ${BRAND.name} admin. Alerts repeat at most every 2 hours per problem.`,
        blocks: [
          kicker(p.severity === 'critical' ? 'Critical alert' : 'Alert'),
          heading(p.title),
          para(p.detail),
          ...(p.actions.length ? [list(p.actions)] : []),
          button('Open operations', url('/admin/operations')),
        ],
      }),
  }),

  'admin.digest': define<{
    day: string;
    rows: Array<{ label: string; value: string; change: string }>;
    topTemplates: string[];
    topStates: string[];
    alerts: number;
  }>({
    label: 'Daily summary (admins)',
    group: 'Admin',
    category: 'transactional',
    sample: {
      day: 'Thursday, 19 Nov 2026',
      rows: [
        { label: 'Visitors', value: '1,240', change: '+12%' },
        { label: 'Sign-ups', value: '86 (6.9%)', change: '+4%' },
        { label: 'Revenue', value: '₹18,420', change: '−3%' },
      ],
      topTemplates: ['Royal Rajasthani · 14 invitations', 'Kerala Kasavu · 9 invitations'],
      topStates: ['Maharashtra · 312 visitors', 'Uttar Pradesh · 205 visitors'],
      alerts: 0,
    },
    render: (p, { layout, kicker, heading, para, details, list, button, url, ctx }) =>
      layout({
        appUrl: ctx.appUrl,
        subject: `${BRAND.name} yesterday: ${p.rows.find((r) => r.label === 'Revenue')?.value ?? ''} · ${p.rows.find((r) => r.label === 'Sign-ups')?.value ?? ''} sign-ups`,
        preheader: `Your daily summary for ${p.day}.`,
        reason: `You are receiving this daily summary as a ${BRAND.name} admin. Turn it off from the admin console (Settings → Admins).`,
        blocks: [
          kicker('Daily summary'),
          heading(p.day),
          details(p.rows.map((r) => ({ label: r.label, value: r.change ? `${r.value}   ${r.change}` : r.value }))),
          ...(p.topTemplates.length ? [para('Most used templates', { small: true, muted: true }), list(p.topTemplates)] : []),
          ...(p.topStates.length ? [para('Top states', { small: true, muted: true }), list(p.topStates)] : []),
          para(p.alerts ? `${p.alerts} alert(s) were raised. Check Operations.` : 'No alerts were raised.', { small: true, muted: true }),
          button('Open the admin console', url('/admin')),
        ],
      }),
  }),

  'payment.refund': define<{ name: string | null; product: string; eventTitle: string; amountPaise: number; full: boolean; refundId: string }>({
    label: 'Refund issued',
    group: 'Payments',
    category: 'transactional',
    sample: { name: 'Priya Sharma', product: 'Video Invite', eventTitle: 'Priya & Arjun — Wedding', amountPaise: 24900, full: true, refundId: 'rfnd_PQ8x2LmN0aBc' },
    render: (p, { t, layout, kicker, heading, greeting, para, details, ctx }) =>
      layout({
        appUrl: ctx.appUrl,
        subject: t(`Refund of ${formatINR(p.amountPaise)} started`, `${formatINR(p.amountPaise)} का रिफ़ंड शुरू हो गया`),
        preheader: t('It usually reaches your account in 5–7 working days.', 'यह आमतौर पर 5–7 कार्यदिवस में आपके खाते में आ जाता है।'),
        blocks: [
          kicker(t('Refund', 'रिफ़ंड')),
          heading(t('Your refund is on its way', 'आपका रिफ़ंड भेज दिया गया है')),
          greeting(p.name),
          para(
            t(
              `We have refunded ${formatINR(p.amountPaise)} for ${p.product} (“${p.eventTitle}”). It goes back to the same UPI account, card or bank you paid with.`,
              `${p.product} (“${p.eventTitle}”) के लिए ${formatINR(p.amountPaise)} रिफ़ंड कर दिए गए हैं। पैसे उसी UPI, कार्ड या बैंक खाते में लौटेंगे जिससे भुगतान हुआ था।`,
            ),
          ),
          details([
            { label: t('Amount', 'राशि'), value: formatINR(p.amountPaise), strong: true },
            { label: t('Type', 'प्रकार'), value: p.full ? t('Full refund', 'पूरा रिफ़ंड') : t('Partial refund', 'आंशिक रिफ़ंड') },
            { label: t('Refund ID', 'रिफ़ंड ID'), value: p.refundId },
          ]),
          para(
            t('UPI refunds usually arrive within 2 days; cards and net banking can take 5–7 working days. Your bank may show it under the refund ID above.', 'UPI रिफ़ंड आमतौर पर 2 दिन में आ जाता है; कार्ड और नेट बैंकिंग में 5–7 कार्यदिवस लग सकते हैं। बैंक स्टेटमेंट में ऊपर दिया रिफ़ंड ID दिख सकता है।'),
            { muted: true, small: true },
          ),
        ],
      }),
  }),
};

export type MailKind = keyof typeof TEMPLATES;
export type MailProps<K extends MailKind> = (typeof TEMPLATES)[K]['sample'];

export const toLocale = (v: string | null | undefined): MailLocale => (v === 'hi' ? 'hi' : 'en');

export function renderMail<K extends MailKind>(kind: K, props: MailProps<K>, ctx: MailContext): RenderedEmail {
  const r: R = {
    ...kit(ctx.locale),
    ctx,
    t: (en, hi) => (ctx.locale === 'hi' ? hi : en),
    url: (path) => `${ctx.appUrl.replace(/\/+$/, '')}${path}`,
    date: (iso) => `${DATE_FMT[ctx.locale].format(new Date(iso))} IST`,
  };
  return (TEMPLATES[kind] as unknown as Definition<MailProps<K>>).render(props, r);
}

export const mailCategory = (kind: MailKind): MailCategory => TEMPLATES[kind].category;

export const TEMPLATE_INFO: EmailTemplateInfo[] = Object.entries(TEMPLATES).map(([kind, d]) => ({ kind, label: d.label, group: d.group }));
