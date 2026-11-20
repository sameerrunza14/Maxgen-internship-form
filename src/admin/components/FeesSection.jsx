import { useRef, useState } from 'react';
import { ConfirmDialog, useErrorHandler } from './AdminUi';
import PhotoThumb from './PhotoThumb';
import { updateTotalFee, addPayment, deletePayment, getReceipt } from '../adminApi';
import { toDateText } from '../dateRanges';
import { compressImage } from '../../utils/compressImage';

// How a payment was made. Keep the values the same as PAYMENT_METHODS in the backend.
const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank', label: 'Bank transfer' },
  { value: 'card', label: 'Card' },
  { value: 'cheque', label: 'Cheque' },
];

const MAX_RECEIPT_BYTES = 900 * 1024; // bigger photos are made smaller first (backend limit: 1 MB)

function methodLabel(value) {
  for (let i = 0; i < PAYMENT_METHODS.length; i++) {
    if (PAYMENT_METHODS[i].value === value) {
      return PAYMENT_METHODS[i].label;
    }
  }
  return value;
}

// 13000 -> "₹13,000"
function rupees(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN');
}

// '2026-11-20T00:00:00.000Z' -> '20 Nov 2026'
function formatPaidOn(value) {
  return new Date(String(value).slice(0, 10) + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 ' +
  'focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15 sm:text-sm';

function FieldError({ children }) {
  if (!children) {
    return null;
  }
  return <span className="mt-1 block text-[13px] font-medium text-accent-600">{children}</span>;
}

function emptyPayment() {
  return { amount: '', method: 'cash', paidOn: toDateText(new Date()), remark: '' };
}

/**
 * "Fees" box on the application page: total fee, every payment (with an optional receipt photo)
 * and the balance, worked out by itself. HR deletes only their own payments; the superadmin any.
 */
function FeesSection({ application, admin, isSuperadmin, onUpdated }) {
  const handleError = useErrorHandler();
  const receiptInputRef = useRef(null);
  const canChange = !application.deletedAt;
  const fees = application.fees || { totalFee: null, paid: 0, balance: null, payments: [] };

  // Total fee
  const [isEditingTotal, setIsEditingTotal] = useState(false);
  const [totalText, setTotalText] = useState('');
  const [totalError, setTotalError] = useState('');
  const [isSavingTotal, setIsSavingTotal] = useState(false);

  // New payment
  const [isAdding, setIsAdding] = useState(false);
  const [payment, setPayment] = useState(emptyPayment);
  const [receipt, setReceipt] = useState(null); // { file, previewUrl }
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [deleting, setDeleting] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [listError, setListError] = useState('');

  function startEditingTotal() {
    setTotalText(fees.totalFee === null ? '' : String(fees.totalFee));
    setTotalError('');
    setIsEditingTotal(true);
  }

  async function saveTotal(event) {
    event.preventDefault();
    setIsSavingTotal(true);
    setTotalError('');
    try {
      const result = await updateTotalFee(application.id, totalText.trim());
      onUpdated(result.application);
      setIsEditingTotal(false);
    } catch (error) {
      if (error.fieldErrors && error.fieldErrors.totalFee) {
        setTotalError(error.fieldErrors.totalFee);
      } else {
        handleError(error, setTotalError);
      }
    } finally {
      setIsSavingTotal(false);
    }
  }

  function updatePayment(name, value) {
    setPayment({ ...payment, [name]: value });
    setErrors({ ...errors, [name]: '' });
  }

  async function handleReceiptChosen(event) {
    let file = event.target.files[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
      setErrors({ ...errors, receipt: 'Please choose a JPG or PNG photo.' });
      return;
    }
    try {
      // Read it now (phones may not let us read it again later), and make a big photo smaller
      if (file.size > MAX_RECEIPT_BYTES) {
        file = await compressImage(file, MAX_RECEIPT_BYTES);
      } else {
        file = new File([await file.arrayBuffer()], file.name, { type: file.type });
      }
    } catch {
      file = null;
    }
    if (!file) {
      setErrors({ ...errors, receipt: 'This photo could not be opened. Please choose it again.' });
      return;
    }
    if (receipt) {
      URL.revokeObjectURL(receipt.previewUrl);
    }
    setReceipt({ file: file, previewUrl: URL.createObjectURL(file) });
    setErrors({ ...errors, receipt: '' });
  }

  function closeAddForm() {
    if (receipt) {
      URL.revokeObjectURL(receipt.previewUrl);
    }
    setReceipt(null);
    setPayment(emptyPayment());
    setErrors({});
    setIsAdding(false);
  }

  async function handleAddPayment(event) {
    event.preventDefault();
    setIsSaving(true);
    setErrors({});
    setMessage('');
    try {
      const result = await addPayment(
        application.id,
        { amount: payment.amount.trim(), method: payment.method, paidOn: payment.paidOn, remark: payment.remark.trim() },
        receipt ? receipt.file : null
      );
      onUpdated(result.application);
      setMessage(result.message);
      closeAddForm();
    } catch (error) {
      if (error.fieldErrors && Object.keys(error.fieldErrors).length > 0) {
        setErrors(error.fieldErrors);
      } else {
        handleError(error, function (text) {
          setErrors({ form: text });
        });
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    setIsDeleting(true);
    setListError('');
    setMessage('');
    try {
      const updated = await deletePayment(application.id, deleting.id);
      onUpdated(updated);
      setDeleting(null);
    } catch (error) {
      setDeleting(null);
      handleError(error, setListError);
    } finally {
      setIsDeleting(false);
    }
  }

  // Balance: red while money is due, green when fully paid
  let balanceText = '—';
  let balanceClass = 'text-slate-900';
  if (fees.balance !== null) {
    if (fees.balance > 0) {
      balanceText = rupees(fees.balance);
      balanceClass = 'text-accent-600';
    } else if (fees.balance === 0) {
      balanceText = 'Fully paid';
      balanceClass = 'text-emerald-700';
    } else {
      balanceText = rupees(-fees.balance) + ' extra';
      balanceClass = 'text-amber-700';
    }
  }
  const paidPercent = fees.totalFee ? Math.min(100, Math.round((fees.paid / fees.totalFee) * 100)) : 0;

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 sm:px-5">
        <h2 className="text-[15px] font-bold text-slate-900">Fees</h2>
        {fees.payments.length > 0 && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
            {fees.payments.length} {fees.payments.length === 1 ? 'payment' : 'payments'}
          </span>
        )}
      </div>

      <div className="px-4 py-4 sm:px-5">
        {/* Total / Paid / Balance */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-slate-50 px-2 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Total fee</p>
            <p className="mt-0.5 text-[15px] font-bold text-slate-900">{fees.totalFee === null ? '—' : rupees(fees.totalFee)}</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-2 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Paid</p>
            <p className="mt-0.5 text-[15px] font-bold text-emerald-700">{rupees(fees.paid)}</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-2 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Balance</p>
            <p className={'mt-0.5 text-[15px] font-bold ' + balanceClass}>{balanceText}</p>
          </div>
        </div>
        {fees.totalFee ? (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: paidPercent + '%' }} />
          </div>
        ) : null}

        {/* Total fee: set / change */}
        {canChange &&
          (isEditingTotal ? (
            <form onSubmit={saveTotal} className="mt-3 flex flex-wrap items-start gap-2">
              <label className="min-w-0 flex-1">
                <span className="sr-only">Total fee in rupees</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  value={totalText}
                  onChange={function (event) {
                    setTotalText(event.target.value);
                    setTotalError('');
                  }}
                  placeholder="Total fee, e.g. 13000"
                  className={inputClass}
                />
                <FieldError>{totalError}</FieldError>
              </label>
              <button
                type="submit"
                disabled={isSavingTotal}
                className="rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
              >
                {isSavingTotal ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                disabled={isSavingTotal}
                onClick={function () {
                  setIsEditingTotal(false);
                }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button type="button" onClick={startEditingTotal} className="mt-2 text-[13px] font-semibold text-brand-700 hover:underline">
              {fees.totalFee === null ? '+ Set total fee' : 'Change total fee'}
            </button>
          ))}

        {message && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800">{message}</p>}
        {listError && <p className="mt-3 text-[13px] font-medium text-accent-600">{listError}</p>}

        {/* Payments */}
        {fees.payments.length > 0 && (
          <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4">
            {fees.payments
              .slice()
              .reverse()
              .map(function (item) {
                const canDelete = canChange && (isSuperadmin || item.adminId === admin.id);
                return (
                  <li key={item.id} className="flex items-start gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
                    {item.receipt && (
                      <PhotoThumb
                        label={'receipt-' + item.id}
                        size="h-12 w-12"
                        load={function () {
                          return getReceipt(application.id, item.id);
                        }}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="text-[15px] font-bold text-slate-900">{rupees(item.amount)}</span>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                          {methodLabel(item.method)}
                        </span>
                      </p>
                      {item.remark && <p className="mt-0.5 break-words text-sm text-slate-700">{item.remark}</p>}
                      <p className="mt-0.5 text-xs text-slate-500">
                        Paid on {formatPaidOn(item.paidOn)} · added by {item.authorName}
                      </p>
                    </div>
                    {canDelete && (
                      <button
                        type="button"
                        title="Delete this payment"
                        aria-label={'Delete payment of ' + rupees(item.amount)}
                        onClick={function () {
                          setDeleting(item);
                        }}
                        className="-mr-1 shrink-0 rounded-md p-1 text-slate-400 hover:bg-accent-50 hover:text-accent-600"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                        </svg>
                      </button>
                    )}
                  </li>
                );
              })}
          </ul>
        )}

        {/* Add a payment */}
        {canChange &&
          (isAdding ? (
            <form onSubmit={handleAddPayment} className="mt-4 rounded-lg border border-slate-200 p-3">
              <p className="text-sm font-semibold text-slate-900">Add a payment</p>
              <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                <label className="block">
                  <span className="mb-1 block text-[13px] font-semibold text-slate-700">Amount (₹)</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoFocus
                    value={payment.amount}
                    onChange={function (event) {
                      updatePayment('amount', event.target.value);
                    }}
                    placeholder="e.g. 2000"
                    className={inputClass}
                  />
                  <FieldError>{errors.amount}</FieldError>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[13px] font-semibold text-slate-700">Paid by</span>
                  <select
                    value={payment.method}
                    onChange={function (event) {
                      updatePayment('method', event.target.value);
                    }}
                    className={inputClass + ' cursor-pointer'}
                  >
                    {PAYMENT_METHODS.map(function (option) {
                      return (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      );
                    })}
                  </select>
                  <FieldError>{errors.method}</FieldError>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[13px] font-semibold text-slate-700">Date</span>
                  <input
                    type="date"
                    value={payment.paidOn}
                    max={toDateText(new Date())}
                    onChange={function (event) {
                      updatePayment('paidOn', event.target.value);
                    }}
                    className={inputClass}
                  />
                  <FieldError>{errors.paidOn}</FieldError>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[13px] font-semibold text-slate-700">Remark (optional)</span>
                  <input
                    type="text"
                    maxLength={200}
                    value={payment.remark}
                    onChange={function (event) {
                      updatePayment('remark', event.target.value);
                    }}
                    placeholder="e.g. Registration"
                    className={inputClass}
                  />
                  <FieldError>{errors.remark}</FieldError>
                </label>
              </div>

              <input
                ref={receiptInputRef}
                type="file"
                accept=".jpg,.jpeg,.png"
                onChange={handleReceiptChosen}
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
              />
              <div className="mt-2.5 flex items-center gap-2">
                {receipt && (
                  <span className="relative">
                    <img src={receipt.previewUrl} alt="Receipt" className="h-12 w-12 rounded-lg object-cover ring-1 ring-slate-200" />
                    <button
                      type="button"
                      onClick={function () {
                        URL.revokeObjectURL(receipt.previewUrl);
                        setReceipt(null);
                      }}
                      aria-label="Remove receipt photo"
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[11px] text-white hover:bg-accent-600"
                    >
                      ×
                    </button>
                  </span>
                )}
                <button
                  type="button"
                  onClick={function () {
                    receiptInputRef.current.click();
                  }}
                  className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-brand-600 hover:text-brand-700"
                >
                  {receipt ? 'Change receipt photo' : '+ Receipt photo (optional)'}
                </button>
              </div>
              <FieldError>{errors.receipt}</FieldError>
              <FieldError>{errors.form}</FieldError>

              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={closeAddForm}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {isSaving ? 'Saving…' : 'Save payment'}
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={function () {
                setMessage('');
                setIsAdding(true);
              }}
              className="mt-4 w-full rounded-lg border border-dashed border-emerald-300 bg-emerald-50/50 px-3 py-2.5 text-sm font-semibold text-emerald-800 hover:border-emerald-500 hover:bg-emerald-50"
            >
              + Add payment
            </button>
          ))}
      </div>

      {deleting && (
        <ConfirmDialog
          title={'Delete the payment of ' + rupees(deleting.amount) + '?'}
          message="The payment and its receipt photo are removed, and the balance is worked out again. The activity log keeps a record."
          confirmLabel="Delete payment"
          danger
          busy={isDeleting}
          onConfirm={confirmDelete}
          onCancel={function () {
            setDeleting(null);
          }}
        />
      )}
    </section>
  );
}

export default FeesSection;
