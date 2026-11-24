// Mirrors backend/utils/constants.js. The backend validates every value;
// these lists drive form options and filters.

export const CATEGORIES = [
  'Electrical',
  'Plumbing',
  'Internet & Networking',
  'Furniture',
  'Equipment',
  'Cleanliness',
  'Hostel Maintenance',
  'Other',
];

export const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

export const PRIORITY_HELP = {
  Low: 'Minor inconvenience, can wait a few days.',
  Medium: 'Affects daily use but has a workaround.',
  High: 'Stops a room or service from being used.',
  Critical: 'Safety hazard or affects many people.',
};

export const SLA_HOURS = { Critical: 24, High: 48, Medium: 72, Low: 120 };

export const STATUSES = ['Submitted', 'Assigned', 'Accepted', 'In Progress', 'Resolved', 'Reopened', 'Closed'];

export const OPEN_STATUSES = ['Submitted', 'Assigned', 'Accepted', 'In Progress', 'Reopened'];

export const BUILDINGS = [
  'Academic Block A',
  'Academic Block B',
  'Engineering Labs',
  'Central Library',
  'Administrative Block',
  'Boys Hostel 1',
  'Boys Hostel 2',
  'Girls Hostel 1',
  'Cafeteria',
  'Sports Complex',
  'Auditorium',
];

export const HOSTELS = ['Boys Hostel 1', 'Boys Hostel 2', 'Girls Hostel 1'];

export const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Electronics & Communication',
  'Mechanical Engineering',
  'Civil Engineering',
  'Management Studies',
  'School of Law',
  'Pharmaceutical Sciences',
  'Liberal Arts',
];

export const ROLE_HOME = { student: '/student', staff: '/staff', admin: '/admin' };

export const ROLE_LABEL = { student: 'Student', staff: 'Maintenance staff', admin: 'Administrator' };
