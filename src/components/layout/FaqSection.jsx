
// Answers are taken from the form itself, so they stay true. Update them if the form changes.
const QUESTIONS = [
  {
    question: 'Who can apply?',
    answer: 'Students who are currently studying — any course, any semester. You will be asked for your current semester and passout year.',
  },
  {
    question: 'Which documents do I need?',
    answer: `Your Aadhaar or PAN card and your resume as a PDF. College ID and a passport size photo are optional. Files can be up to 500 KB (photo 200 KB) — large photos are resized for you automatically.`,
  },
  {
    question: 'Is the internship online or offline?',
    answer: 'Both are available. Choose Online to intern remotely, Offline to intern at our office in Ahmedabad, Pune or Mumbai, or Hybrid for a mix of both.',
  },
  {
    question: 'How long is the internship?',
    answer: 'You choose: 15 days, 1 month, 45 days, 3 months, 3 to 4 months, or 3 to 6 months.',
  },
  {
    question: 'Which letters will I get?',
    answer: 'You select the ones you need in the form: offer letter, completion certificate, experience letter and progress reports.',
  },
  {
    question: 'What happens after I submit?',
    answer: 'You get an application ID on screen. Our HR team reviews your details and contacts you by call or email.',
  },
  {
    question: 'My page refreshed. Did I lose my answers?',
    answer: 'Your typed answers are saved on this device, so they come back. Uploaded files are not saved — please select them again.',
  },
];

function FaqSection() {
  return (
    <section className="mx-auto mt-14 max-w-6xl px-4 pb-14 sm:mt-20 sm:px-6 sm:pb-20" aria-labelledby="faq-heading">
      <div className="grid gap-8 lg:grid-cols-[290px_1fr] lg:gap-12">
        <div>
          <h2 id="faq-heading" className="text-2xl font-extrabold tracking-tight text-brand-800 sm:text-[28px]">
            Questions before you apply
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
            Something else on your mind? Ask our HR team when they call you after you apply.
          </p>
        </div>

        <div className="divide-y divide-slate-200 border-y border-slate-200">
          {QUESTIONS.map(function (item) {
            return (
              <details key={item.question} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-[15px] font-semibold text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 sm:text-base [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <span className="relative h-4 w-4 shrink-0 text-brand-700" aria-hidden="true">
                    <span className="absolute left-0 top-1/2 h-0.5 w-4 -translate-y-1/2 rounded bg-current" />
                    <span className="absolute left-1/2 top-0 h-4 w-0.5 -translate-x-1/2 rounded bg-current transition-transform duration-200 group-open:scale-y-0" />
                  </span>
                </summary>
                <p className="max-w-2xl pb-5 pr-8 text-[15px] leading-relaxed text-slate-600">{item.answer}</p>
              </details>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default FaqSection;
