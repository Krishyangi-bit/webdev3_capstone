const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { io: connectSocket } = require('socket.io-client');
const { startTestServer, createUser, loginAs } = require('./helpers');
const { StatusHistory, Notification, Assignment } = require('../models');

// 1x1 transparent PNG
const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const waitFor = (socket, event, predicate = () => true, ms = 3000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${event}`)), ms);
    const handler = (payload) => {
      if (!predicate(payload)) return;
      clearTimeout(timer);
      socket.off(event, handler);
      resolve(payload);
    };
    socket.on(event, handler);
  });

const settle = () => new Promise((r) => setTimeout(r, 150)); // let async listeners finish

let ctx;
let admin;
let staff;
let otherStaff;
let student;
let otherStudent;
const sockets = [];

function socketFor(client) {
  const socket = connectSocket(ctx.baseUrl, { auth: { token: client.token }, transports: ['websocket'] });
  sockets.push(socket);
  return new Promise((resolve, reject) => {
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', reject);
  });
}

before(async () => {
  ctx = await startTestServer();
  await createUser({ name: 'Admin One', email: 'admin@campus.edu', role: 'admin' });
  await createUser({ name: 'Ravi Electrician', email: 'ravi@campus.edu', role: 'staff', specializations: ['Electrical'] });
  await createUser({ name: 'Meena Plumber', email: 'meena@campus.edu', role: 'staff', specializations: ['Plumbing'] });
  await createUser({ name: 'Aarav Student', email: 'aarav@campus.edu', role: 'student' });
  await createUser({ name: 'Other Student', email: 'other@campus.edu', role: 'student' });
  admin = await loginAs(ctx.baseUrl, 'admin@campus.edu');
  staff = await loginAs(ctx.baseUrl, 'ravi@campus.edu');
  otherStaff = await loginAs(ctx.baseUrl, 'meena@campus.edu');
  student = await loginAs(ctx.baseUrl, 'aarav@campus.edu');
  otherStudent = await loginAs(ctx.baseUrl, 'other@campus.edu');
});

after(async () => {
  sockets.forEach((s) => s.close());
  await ctx.stop();
});

describe('complaint lifecycle', () => {
  let complaintId;
  let assignmentId;

  test('sockets reject connections without a valid token', async () => {
    const socket = connectSocket(ctx.baseUrl, { auth: { token: 'bad' }, transports: ['websocket'] });
    sockets.push(socket);
    const err = await new Promise((resolve) => socket.on('connect_error', resolve));
    assert.match(err.message, /Invalid|expired/);
  });

  test('student creates a complaint with an image; admin is notified in real time', async () => {
    const adminSocket = await socketFor(admin);
    const notified = waitFor(adminSocket, 'notification:new', (n) => n.type === 'complaint_created');

    const res = await student.post('/api/complaints', {
      title: 'Projector not turning on',
      description: 'The projector in room 204 does not power on, lectures are affected.',
      category: 'Equipment',
      priority: 'High',
      building: 'Academic Block A',
      floor: '2',
      roomNumber: '204',
      images: [{ name: 'p.png', dataUrl: PNG }],
      status: 'Closed', // must be ignored
      reportedBy: '000000000000000000000000', // must be ignored
    });
    assert.equal(res.status, 201, res.body.message);
    const complaint = res.body.data.complaint;
    complaintId = complaint._id;
    assert.equal(complaint.status, 'Submitted');
    assert.equal(complaint.reportedBy.email, 'aarav@campus.edu');
    assert.match(complaint.complaintCode, /^CF-\d{4}-\d{5}$/);
    assert.equal(complaint.images.length, 1);
    const file = path.join(__dirname, '..', 'uploads', 'complaints', path.basename(complaint.images[0]));
    assert.ok(fs.existsSync(file), 'image written to disk');
    fs.rmSync(file);

    const notification = await notified;
    assert.match(notification.message, /Projector not turning on/);
  });

  test('validation and role checks on complaint creation', async () => {
    const bad = await student.post('/api/complaints', { title: 'x', category: 'Nope' });
    assert.equal(bad.status, 400);
    assert.ok(Array.isArray(bad.body.errors));
    const fakeImage = await student.post('/api/complaints', {
      title: 'Broken chair in lab',
      description: 'Chair leg is broken and unsafe to sit on.',
      category: 'Furniture',
      priority: 'Low',
      building: 'Engineering Labs',
      floor: '1',
      images: [{ dataUrl: 'data:image/png;base64,aGVsbG8gd29ybGQ=' }],
    });
    assert.equal(fakeImage.status, 400, 'non-image bytes rejected');
    const asStaff = await staff.post('/api/complaints', {});
    assert.equal(asStaff.status, 403);
  });

  test('students only see their own complaints', async () => {
    const mine = await student.get('/api/complaints/my-complaints');
    assert.equal(mine.body.data.complaints.length, 1);
    const theirs = await otherStudent.get(`/api/complaints/${complaintId}`);
    assert.equal(theirs.status, 403);
    const unassignedStaff = await staff.get(`/api/complaints/${complaintId}`);
    assert.equal(unassignedStaff.status, 403);
  });

  test('non-admins cannot reach admin endpoints', async () => {
    assert.equal((await student.get('/api/admin/complaints')).status, 403);
    assert.equal((await staff.patch(`/api/admin/complaints/${complaintId}/assign`, {})).status, 403);
    assert.equal((await student.get('/api/admin/analytics')).status, 403);
  });

  test('invalid transitions are rejected', async () => {
    const res = await staff.patch(`/api/complaints/${complaintId}/status`, { status: 'Resolved', resolutionNotes: 'Fixed it all up' });
    assert.equal(res.status, 403, 'not assigned yet');
    const reopen = await student.post(`/api/complaints/${complaintId}/reopen`, { reason: 'Still broken after all' });
    assert.equal(reopen.status, 422);
  });

  test('admin assigns; staff is notified; staff declines; admin reassigns', async () => {
    const staffSocket = await socketFor(staff);
    const assignedNote = waitFor(staffSocket, 'notification:new', (n) => n.type === 'complaint_assigned');
    const res = await admin.patch(`/api/admin/complaints/${complaintId}/assign`, {
      staffId: String((await staff.get('/api/auth/me')).body.data.user._id),
      remarks: 'Urgent - exams this week',
    });
    assert.equal(res.status, 200, res.body.message);
    assert.equal(res.body.data.complaint.status, 'Assigned');
    await assignedNote;

    const list = await staff.get('/api/staff/assignments?view=pending');
    assert.equal(list.body.data.assignments.length, 1);
    const firstAssignment = list.body.data.assignments[0]._id;

    const otherTry = await otherStaff.patch(`/api/staff/assignments/${firstAssignment}/accept`, {});
    assert.equal(otherTry.status, 403);

    const declined = await staff.patch(`/api/staff/assignments/${firstAssignment}/reject`, { reason: 'Out on leave this week' });
    assert.equal(declined.status, 200);
    const afterDecline = await admin.get(`/api/complaints/${complaintId}`);
    assert.equal(afterDecline.body.data.complaint.status, 'Submitted');
    assert.equal(afterDecline.body.data.complaint.assignedTo, null);

    // Reassign to the same staff member again (they came back).
    const reassigned = await admin.patch(`/api/admin/complaints/${complaintId}/assign`, {
      staffId: String((await staff.get('/api/auth/me')).body.data.user._id),
    });
    assert.equal(reassigned.status, 200);
    const pending = await staff.get('/api/staff/assignments?view=pending');
    assignmentId = pending.body.data.assignments[0]._id;
  });

  test('staff accepts, starts work and resolves; student gets live updates', async () => {
    const studentSocket = await socketFor(student);
    const joined = await new Promise((resolve) => studentSocket.emit('complaint:join', complaintId, resolve));
    assert.equal(joined.ok, true);

    const otherSocket = await socketFor(otherStudent);
    const denied = await new Promise((resolve) => otherSocket.emit('complaint:join', complaintId, resolve));
    assert.equal(denied.ok, false, 'other students cannot join the complaint room');

    const accepted = await staff.patch(`/api/staff/assignments/${assignmentId}/accept`, {});
    assert.equal(accepted.status, 200);
    assert.equal(accepted.body.data.assignment.assignmentStatus, 'accepted');

    const skip = await staff.patch(`/api/complaints/${complaintId}/status`, { status: 'Resolved', resolutionNotes: 'Replaced lamp' });
    assert.equal(skip.status, 422, 'cannot resolve before starting work');

    const update = waitFor(studentSocket, 'complaint:updated', (p) => p.status === 'In Progress');
    const started = await staff.patch(`/api/complaints/${complaintId}/status`, { status: 'In Progress', remarks: 'Checking power supply' });
    assert.equal(started.status, 200);
    await update;

    const noNotes = await staff.patch(`/api/complaints/${complaintId}/status`, { status: 'Resolved' });
    assert.equal(noNotes.status, 400);

    const resolvedNote = waitFor(studentSocket, 'notification:new', (n) => n.type === 'complaint_resolved');
    const resolved = await staff.patch(`/api/complaints/${complaintId}/status`, {
      status: 'Resolved',
      resolutionNotes: 'Replaced the projector lamp and tested it.',
    });
    assert.equal(resolved.status, 200);
    assert.ok(resolved.body.data.complaint.resolvedAt);
    await resolvedNote;
  });

  test('comments are delivered live to the complaint room', async () => {
    const studentSocket = await socketFor(student);
    await new Promise((resolve) => studentSocket.emit('complaint:join', complaintId, resolve));
    const live = waitFor(studentSocket, 'comment:new');
    const res = await staff.post(`/api/complaints/${complaintId}/comments`, { message: 'Please check and confirm.' });
    assert.equal(res.status, 201);
    const comment = await live;
    assert.equal(comment.author.name, 'Ravi Electrician');
    const list = await student.get(`/api/complaints/${complaintId}/comments`);
    assert.equal(list.body.data.comments.length, 1);
    const forbidden = await otherStudent.post(`/api/complaints/${complaintId}/comments`, { message: 'hi' });
    assert.equal(forbidden.status, 403);
  });

  test('student reopens, staff resolves again, student closes with feedback', async () => {
    const reopened = await student.post(`/api/complaints/${complaintId}/reopen`, { reason: 'Projector flickers again after an hour' });
    assert.equal(reopened.status, 200);
    assert.equal(reopened.body.data.complaint.status, 'Reopened');
    assert.equal(reopened.body.data.complaint.reopenCount, 1);

    await staff.patch(`/api/complaints/${complaintId}/status`, { status: 'In Progress' });
    await staff.patch(`/api/complaints/${complaintId}/status`, { status: 'Resolved', resolutionNotes: 'Replaced the HDMI board too.' });

    const feedback = await student.post(`/api/complaints/${complaintId}/feedback`, { rating: 4, comment: 'Works now, thanks' });
    assert.equal(feedback.status, 200);
    assert.equal(feedback.body.data.complaint.status, 'Closed');
    assert.equal(feedback.body.data.complaint.feedback.rating, 4);
    const again = await student.post(`/api/complaints/${complaintId}/feedback`, { rating: 5 });
    assert.equal(again.status, 409);
    const comment = await student.post(`/api/complaints/${complaintId}/comments`, { message: 'late' });
    assert.equal(comment.status, 422, 'closed complaints do not accept comments');
  });

  test('complete status history and assignment trail is recorded', async () => {
    await settle();
    const history = await StatusHistory.find({ complaint: complaintId }).sort({ createdAt: 1 });
    assert.deepEqual(
      history.map((h) => h.newStatus),
      ['Submitted', 'Assigned', 'Submitted', 'Assigned', 'Accepted', 'In Progress', 'Resolved', 'Reopened', 'In Progress', 'Resolved', 'Closed']
    );
    assert.equal(history[0].previousStatus, null);
    const assignments = await Assignment.find({ complaint: complaintId }).sort({ assignedAt: 1 });
    assert.deepEqual(assignments.map((a) => a.assignmentStatus), ['rejected', 'completed']);

    const res = await student.get(`/api/complaints/${complaintId}/history`);
    assert.equal(res.body.data.history.length, 11);
    assert.ok(res.body.data.history[1].changedBy.name);
  });

  test('notifications are stored per user and can be marked read', async () => {
    const list = await student.get('/api/notifications');
    assert.ok(list.body.data.notifications.length >= 4);
    const unread = list.body.meta.unreadCount;
    const first = list.body.data.notifications[0]._id;
    const read = await student.patch(`/api/notifications/${first}/read`);
    assert.equal(read.status, 200);
    const othersRead = await otherStudent.patch(`/api/notifications/${first}/read`);
    assert.equal(othersRead.status, 404);
    const count = await student.get('/api/notifications/unread-count');
    assert.equal(count.body.data.unreadCount, unread - 1);
    await student.patch('/api/notifications/read-all');
    assert.equal(await Notification.countDocuments({ isRead: false, recipient: list.body.data.notifications[0].recipient }), 0);
  });

  test('admin dashboard, analytics and staff performance come from real data', async () => {
    const dash = await admin.get('/api/admin/dashboard');
    assert.equal(dash.status, 200);
    assert.equal(dash.body.data.totals.total, 1);
    assert.equal(dash.body.data.totals.resolved, 1);

    const analytics = await admin.get('/api/admin/analytics?days=30');
    assert.equal(analytics.status, 200);
    assert.equal(analytics.body.data.totals.total, 1);
    assert.equal(analytics.body.data.byCategory.find((c) => c.key === 'Equipment').count, 1);
    assert.equal(analytics.body.data.byCategory.find((c) => c.key === 'Plumbing').count, 0);
    assert.equal(analytics.body.data.totals.avgRating, 4);
    assert.equal(analytics.body.data.trend.length, 30);

    const perf = await admin.get('/api/admin/staff-performance');
    const ravi = perf.body.data.staff.find((s) => s.name === 'Ravi Electrician');
    assert.equal(ravi.assigned, 2);
    assert.equal(ravi.rejected, 1);
    assert.equal(ravi.resolved, 1);
    assert.equal(ravi.avgRating, 4);
    const meena = perf.body.data.staff.find((s) => s.name === 'Meena Plumber');
    assert.equal(meena.resolved, 0);

    const history = await staff.get('/api/staff/work-history');
    assert.equal(history.body.data.stats.resolved, 1);
  });

  test('admin manages staff accounts', async () => {
    const created = await admin.post('/api/admin/staff', {
      name: 'Kiran Network',
      email: 'kiran@campus.edu',
      password: 'Network123',
      phone: '9876543210',
      designation: 'Network Technician',
      specializations: ['Internet & Networking'],
      role: 'admin', // ignored
    });
    assert.equal(created.status, 201, created.body.message);
    assert.equal(created.body.data.user.role, 'staff');

    const staffList = await admin.get('/api/admin/staff?category=Internet%20%26%20Networking');
    assert.equal(staffList.body.data.staff[0].name, 'Kiran Network');

    const deactivate = await admin.patch(`/api/admin/users/${created.body.data.user._id}`, { isActive: false, role: 'admin' });
    assert.equal(deactivate.status, 200);
    assert.equal(deactivate.body.data.user.isActive, false);
    assert.equal(deactivate.body.data.user.role, 'staff');

    const adminTarget = (await admin.get('/api/admin/users?role=admin')).body.data.users[0]._id;
    const editAdmin = await admin.patch(`/api/admin/users/${adminTarget}`, { isActive: false });
    assert.equal(editAdmin.status, 403);
  });

  test('profile updates cannot change role', async () => {
    const res = await student.patch('/api/users/me', { name: 'Aarav S.', role: 'admin', hostel: 'Boys Hostel 1' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.user.role, 'student');
    assert.equal(res.body.data.user.name, 'Aarav S.');
    const pw = await student.patch('/api/users/me/password', { currentPassword: 'wrong', newPassword: 'NewPass123' });
    assert.equal(pw.status, 400);
  });
});
