import { INQUIRY_PHONES, OFFICE_ADDRESS, OFFICE_MAP_LINK, WHATSAPP_HELLO } from '../../constants/contact';

// Answers are taken from the form itself, so they stay true. Update them if the form changes.
const QUESTIONS = [
  {
    question: 'Who can apply?',
    answer:
      'Any student who is currently studying, in any course and any semester. The form asks for your current semester and passout year.',
  },
  {
    question: 'Which documents do I need?',
    answer:
      'Your Aadhaar or PAN card, your college ID card and your resume (PDF). A passport size photo is optional. ' +
      'Each file can be up to 500 KB (photo 200 KB). Large phone photos are made smaller for you automatically.',
  },
  {
    question: 'Is the internship online or offline?',
    answer:
      'Both are available. Choose Online to work remotely, Offline to work from our office in Ahmedabad, Pune or Mumbai, or Hybrid for a mix of both.',
  },
  {
    question: 'How long is the internship?',
    answer: 'You choose the duration: 15 days, 1 month, 45 days, 3 months, 3 to 4 months, or 3 to 6 months.',
  },
  {
    question: 'Which letters will I get?',
    answer:
      'You select the letters you need in the form: offer letter, completion certificate and experience letter. ' +
      'Our HR team sends them to you by email or WhatsApp.',
  },
  {
    question: 'What happens after I submit?',
    answer:
      'You see your Application ID on the screen and receive a confirmation email. Our HR team reviews your details and contacts you by call or email.',
  },
  {
    question: 'My page refreshed. Did I lose my answers?',
    answer:
      'No. Your typed answers are saved on this device and come back. Uploaded files cannot be saved, so please select them again.',
  },
];

function PhoneIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 013.5 2h1.15a1.5 1.5 0 011.46 1.14l.57 2.3a1.5 1.5 0 01-.43 1.45l-1.1 1.04a11.04 11.04 0 004.92 4.92l1.04-1.1a1.5 1.5 0 011.45-.43l2.3.57A1.5 1.5 0 0118 13.35v1.15A1.5 1.5 0 0116.5 16h-1C8.04 16 2 9.96 2 2.5v1z" clipRule="evenodd" />
    </svg>
  );
}

function WhatsappIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18.2a8.2 8.2 0 01-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1112 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 01-3.3-2.9c-.3-.4.3-.4.7-1.3a.4.4 0 000-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 00-.7.3 3 3 0 00-.9 2.2 5.2 5.2 0 001.1 2.8 11.9 11.9 0 004.6 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 001.8-1.3 2.3 2.3 0 00.2-1.3c-.1-.1-.3-.2-.5-.3z" />
    </svg>
  );
}

// "Still have a question?" box: every inquiry number with Call and WhatsApp, and the office address
function ContactCard() {
  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[15px] font-bold text-slate-900">Still have a question?</p>
      <p className="mt-1 text-[13px] leading-relaxed text-slate-500">Call or WhatsApp our internship team.</p>

      <ul className="mt-4 space-y-2.5">
        {INQUIRY_PHONES.map(function (phone) {
          return (
            <li key={phone.number} className="flex items-center justify-between gap-3">
              <a
                href={'tel:+' + phone.number}
                className="inline-flex items-center gap-2 whitespace-nowrap text-[15px] font-semibold tabular-nums text-brand-800 hover:text-brand-600"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                  <PhoneIcon />
                </span>
                {phone.display}
              </a>
              <a
                href={'https://wa.me/' + phone.number + '?text=' + encodeURIComponent(WHATSAPP_HELLO)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={'WhatsApp ' + phone.display}
                title="Chat on WhatsApp"
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-[#1fa855] px-3 text-[13px] font-semibold text-white hover:bg-[#178a45]"
              >
                <WhatsappIcon />
                Chat
              </a>
            </li>
          );
        })}
      </ul>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <p className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">Office</p>
        <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{OFFICE_ADDRESS}</p>
        <a
          href={OFFICE_MAP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-[13px] font-semibold text-brand-700 underline-offset-4 hover:underline"
        >
          Open in Google Maps →
        </a>
      </div>
    </div>
  );
}

function FaqSection() {
  return (
    <section className="mx-auto mt-14 max-w-6xl px-4 pb-14 sm:mt-20 sm:px-6 sm:pb-20" aria-labelledby="faq-heading">
      <div className="grid gap-10 lg:grid-cols-[340px_1fr] lg:gap-14">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-accent-600">FAQ</p>
          <h2 id="faq-heading" className="mt-2 text-2xl font-extrabold tracking-tight text-brand-800 sm:text-[30px] sm:leading-tight">
            Questions before you apply
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
            Quick answers about eligibility, documents, duration and what happens after you apply.
          </p>
          <ContactCard />
        </div>

        <div className="space-y-3">
          {QUESTIONS.map(function (item, index) {
            return (
              <details
                key={item.question}
                open={index === 0}
                className="group rounded-xl border border-slate-200 bg-white transition-shadow open:border-brand-200 open:shadow-sm"
              >
                <summary className="flex cursor-pointer list-none items-center gap-4 rounded-xl px-5 py-4 text-left text-[15px] font-semibold text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 sm:text-base [&::-webkit-details-marker]:hidden">
                  <span className="w-6 shrink-0 text-[13px] font-bold tabular-nums text-slate-400 group-open:text-accent-600" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="flex-1">{item.question}</span>
                  <span
                    className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-brand-700 transition-colors group-open:bg-brand-700 group-open:text-white"
                    aria-hidden="true"
                  >
                    <span className="absolute h-0.5 w-3 rounded bg-current" />
                    <span className="absolute h-3 w-0.5 rounded bg-current transition-transform duration-200 group-open:scale-y-0" />
                  </span>
                </summary>
                <p className="pb-5 pl-[3.75rem] pr-6 text-[15px] leading-relaxed text-slate-600">{item.answer}</p>
              </details>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default FaqSection;
