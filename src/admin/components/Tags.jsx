// Small tags used in the applications list and on the application page

// "2nd", "3rd", "4th" …
export function ordinal(number) {
  if (number % 100 >= 11 && number % 100 <= 13) {
    return number + "th";
  }
  if (number % 10 === 1) return number + "st";
  if (number % 10 === 2) return number + "nd";
  if (number % 10 === 3) return number + "rd";
  return number + "th";
}

// Orange tag next to the name of someone who applied before, e.g. "Returning · 2nd time"
export function ReturningTag({ earlierCount }) {
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200"
      title={"This person (same phone or email) applied " + earlierCount + (earlierCount === 1 ? " time" : " times") + " before"}
    >
      <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M15.3 4.7a.75.75 0 01.2.7l-.6 3a.75.75 0 01-1.2.4l-.9-.7A5 5 0 105 12.5a.75.75 0 01-1.5.2 6.5 6.5 0 0110-5.4l.8-.6a.75.75 0 01.97.04z" clipRule="evenodd" />
      </svg>
      Returning · {ordinal(earlierCount + 1)} time
    </span>
  );
}

// Small blue tag: the student visited the office
export function VisitedTag() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-800 ring-1 ring-sky-200">
      <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 011.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z" clipRule="evenodd" />
      </svg>
      Visited
    </span>
  );
}

// Small green tag: the student joined the internship
export function JoinedTag() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white">
      <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 011.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z" clipRule="evenodd" />
      </svg>
      Joined
    </span>
  );
}

// Two small steps in one line: "Visited" and "Joined".
// A done step is coloured with a tick; a step not done yet is grey with an empty circle,
// so HR can see at a glance what is still left for each student.
function ProgressStep({ label, done, doneClassName }) {
  if (done) {
    return (
      <span className={"inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold " + doneClassName}>
        <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 011.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z" clipRule="evenodd" />
        </svg>
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium text-slate-400 ring-1 ring-slate-200">
      <span className="h-2.5 w-2.5 rounded-full border-[1.5px] border-slate-300" aria-hidden="true" />
      {label}
    </span>
  );
}

export function ProgressSteps({ visitedAt, joinedAt }) {
  return (
    <span
      className="inline-flex items-center gap-1"
      aria-label={"Visited: " + (visitedAt ? "yes" : "no") + ", Joined: " + (joinedAt ? "yes" : "no")}
    >
      <ProgressStep label="Visited" done={Boolean(visitedAt)} doneClassName="bg-sky-50 text-sky-800 ring-1 ring-sky-200" />
      <span className={"h-px w-2 " + (joinedAt ? "bg-emerald-400" : "bg-slate-200")} aria-hidden="true" />
      <ProgressStep label="Joined" done={Boolean(joinedAt)} doneClassName="bg-emerald-600 text-white" />
    </span>
  );
}
