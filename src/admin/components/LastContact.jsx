// One line at the top of the application page: when HR last called / noted this student.
// Helps with follow-ups: nobody is forgotten. Shown only while the student is under review.

const TYPE_WORDS = { call: 'Call', visit: 'Visit', payment: 'Payment', follow_up: 'Note', other: 'Note' };

// "today" / "yesterday" / "5 days ago"
function daysAgoText(dateText) {
  const then = new Date(dateText);
  const now = new Date();
  const startOfThen = new Date(then.getFullYear(), then.getMonth(), then.getDate());
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((startOfToday - startOfThen) / (24 * 60 * 60 * 1000));
  if (days <= 0) return { text: 'today', days: 0 };
  if (days === 1) return { text: 'yesterday', days: 1 };
  return { text: days + ' days ago', days: days };
}

function LastContact({ notes, onGoToNotes }) {
  const list = notes || [];

  if (list.length === 0) {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-900 ring-1 ring-amber-200">
        <span className="font-semibold">Not contacted yet.</span>
        <span>After calling, add a note below.</span>
        <button type="button" onClick={onGoToNotes} className="font-semibold text-brand-700 underline underline-offset-2">
          Add note
        </button>
      </div>
    );
  }

  // Notes come oldest first, so the last one is the newest
  const last = list[list.length - 1];
  const when = daysAgoText(last.createdAt);
  const isOld = when.days >= 3; // 3 days or more without contact: show in orange
  let preview = last.text || '';
  if (preview.length > 70) {
    preview = preview.slice(0, 70) + '…';
  }

  return (
    <div
      className={
        'mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg px-3 py-2 text-[13px] ring-1 ' +
        (isOld ? 'bg-amber-50 text-amber-900 ring-amber-200' : 'bg-slate-50 text-slate-700 ring-slate-200')
      }
    >
      <span className="font-semibold">Last contact: {when.text}</span>
      <span>
        · {TYPE_WORDS[last.type] || 'Note'} by {last.authorName}
      </span>
      {preview && <span className="text-slate-500">“{preview}”</span>}
      {isOld && <span className="font-semibold">Time to follow up.</span>}
      <button type="button" onClick={onGoToNotes} className="font-semibold text-brand-700 underline underline-offset-2">
        Add note
      </button>
    </div>
  );
}

export default LastContact;
