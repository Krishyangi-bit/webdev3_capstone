import { SLA_HOURS } from '../constants';

const dateFormatter = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});
const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export function formatDate(value) {
  return value ? dateFormatter.format(new Date(value)) : '—';
}

export function formatDateTime(value) {
  return value ? dateTimeFormatter.format(new Date(value)) : '—';
}

export function timeAgo(value) {
  if (!value) return '';
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 45) return 'just now';
  if (abs < 3600) return relative.format(Math.round(seconds / 60), 'minute');
  if (abs < 86400) return relative.format(Math.round(seconds / 3600), 'hour');
  if (abs < 86400 * 7) return relative.format(Math.round(seconds / 86400), 'day');
  return formatDate(value);
}

export function formatHours(hours) {
  if (hours === null || hours === undefined) return '—';
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 48) return `${Math.round(hours * 10) / 10} h`;
  return `${Math.round((hours / 24) * 10) / 10} days`;
}

export function initials(name = '') {
  const parts = name.replace(/^(Dr|Mr|Ms|Mrs)\.?\s+/i, '').trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function firstName(name = '') {
  return name.replace(/^(Dr|Mr|Ms|Mrs)\.?\s+/i, '').split(' ')[0];
}

export function locationLabel(c) {
  if (!c) return '';
  const room = c.roomNumber && (/^\d/.test(c.roomNumber) ? `Room ${c.roomNumber}` : c.roomNumber);
  return [c.building, c.block, c.floor && `Floor ${c.floor}`, room].filter(Boolean).join(' · ');
}

export function slaDueDate(complaint) {
  const hours = SLA_HOURS[complaint.priority] ?? 72;
  return new Date(new Date(complaint.createdAt).getTime() + hours * 3600 * 1000);
}

export function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function complaintPath(role, complaintId) {
  if (role === 'staff') return `/staff/tasks/${complaintId}`;
  if (role === 'admin') return `/admin/complaints/${complaintId}`;
  return `/student/complaints/${complaintId}`;
}

export function pluralize(count, word, plural = `${word}s`) {
  return `${count} ${count === 1 ? word : plural}`;
}
