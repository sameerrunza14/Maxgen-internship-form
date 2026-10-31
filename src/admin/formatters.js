// "30 Oct 2026, 3:41 pm"
export function formatDateTime(value) {
  if (!value) {
    return '';
  }
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// "30 Oct 2026"
export function formatDate(value) {
  if (!value) {
    return '';
  }
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// "98765 43210"
export function formatPhone(number) {
  if (!number || number.length !== 10) {
    return number || '';
  }
  return number.slice(0, 5) + ' ' + number.slice(5);
}

export function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) {
    return Math.max(1, Math.round(bytes / 1024)) + ' KB';
  }
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
