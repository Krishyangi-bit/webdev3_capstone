/*
 * Seeds MongoDB with demo accounts and realistic complaint data.
 *
 *   npm run seed
 *
 * Existing CampusFix data in the configured database is removed first.
 * Every complaint gets a consistent timeline: status history, assignments,
 * comments and notifications all use matching timestamps in the past.
 */
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const env = require('../config/env');
const { connectDatabase, disconnectDatabase } = require('../config/db');
const { User, Counter, Complaint, Assignment, Comment, Notification, StatusHistory } = require('../models');
const { STATUS, ROLES } = require('../utils/constants');

if (env.isProduction) {
  console.error('[seed] Refusing to seed a production database.');
  process.exit(1);
}

const HOUR = 3600 * 1000;
const NOW = Date.now();
const oid = () => new mongoose.Types.ObjectId();

/* ------------------------------------------------------------------ users */

const PASSWORDS = { admin: 'Admin@123', staff: 'Staff@123', student: 'Student@123' };

const ADMINS = [
  { key: 'neha', name: 'Dr. Neha Verma', email: 'admin@campusfix.edu', department: 'Estate & Maintenance Office', phone: '9810011001', designation: 'Estate Manager' },
  { key: 'sanjay', name: 'Sanjay Kulkarni', email: 'sanjay.kulkarni@campusfix.edu', department: 'Estate & Maintenance Office', phone: '9810011002', designation: 'Facilities Officer' },
];

const STAFF = [
  { key: 'ramesh', name: 'Ramesh Kumar', email: 'ramesh.kumar@campusfix.edu', designation: 'Senior Electrician', specializations: ['Electrical', 'Equipment'], phone: '9820022001' },
  { key: 'suresh', name: 'Suresh Yadav', email: 'suresh.yadav@campusfix.edu', designation: 'Plumber', specializations: ['Plumbing', 'Hostel Maintenance'], phone: '9820022002' },
  { key: 'imran', name: 'Imran Sheikh', email: 'imran.sheikh@campusfix.edu', designation: 'Network Technician', specializations: ['Internet & Networking', 'Equipment'], phone: '9820022003' },
  { key: 'pooja', name: 'Pooja Nair', email: 'pooja.nair@campusfix.edu', designation: 'Housekeeping Supervisor', specializations: ['Cleanliness', 'Hostel Maintenance'], phone: '9820022004' },
  { key: 'harish', name: 'Harish Patel', email: 'harish.patel@campusfix.edu', designation: 'Carpenter', specializations: ['Furniture', 'Other'], phone: '9820022005' },
  { key: 'deepak', name: 'Deepak Joshi', email: 'deepak.joshi@campusfix.edu', designation: 'Electrician', specializations: ['Electrical'], phone: '9820022006', isActive: false },
];

const STUDENTS = [
  { key: 'aarav', name: 'Aarav Sharma', email: 'aarav.sharma@campusfix.edu', department: 'Computer Science & Engineering', studentId: '2023CSE041', hostel: 'Boys Hostel 1', phone: '9830033001' },
  { key: 'ananya', name: 'Ananya Gupta', email: 'ananya.gupta@campusfix.edu', department: 'Electronics & Communication', studentId: '2022ECE017', hostel: 'Girls Hostel 1', phone: '9830033002' },
  { key: 'rohan', name: 'Rohan Mehta', email: 'rohan.mehta@campusfix.edu', department: 'Mechanical Engineering', studentId: '2024ME009', hostel: 'Boys Hostel 2', phone: '9830033003' },
  { key: 'ishita', name: 'Ishita Singh', email: 'ishita.singh@campusfix.edu', department: 'Management Studies', studentId: '2023BBA052', hostel: 'Girls Hostel 1', phone: '9830033004' },
  { key: 'kabir', name: 'Kabir Malhotra', email: 'kabir.malhotra@campusfix.edu', department: 'School of Law', studentId: '2022LAW023', phone: '9830033005' },
  { key: 'sneha', name: 'Sneha Reddy', email: 'sneha.reddy@campusfix.edu', department: 'Pharmaceutical Sciences', studentId: '2024PHA031', hostel: 'Girls Hostel 1', phone: '9830033006' },
  { key: 'vikram', name: 'Vikram Chauhan', email: 'vikram.chauhan@campusfix.edu', department: 'Civil Engineering', studentId: '2021CE044', phone: '9830033007', isActive: false },
];

/* ------------------------------------------------------------- complaints */
// [student, staff, title, description, category, priority, building, floor, room, location, finalStatus, ageHours, options]
const S = STATUS;
const SCENARIOS = [
  // Aarav Sharma - main demo student, one complaint in each interesting state
  ['aarav', null, 'Water dispenser leaking on 2nd floor', 'The water dispenser next to the washroom on the second floor leaks continuously. The floor stays wet and someone already slipped this morning.', 'Plumbing', 'High', 'Boys Hostel 1', '2', null, 'Corridor near washroom', S.SUBMITTED, 5],
  ['aarav', 'ramesh', 'Tube light flickering in Room 214', 'The tube light in my hostel room flickers constantly and turns off for a few seconds at a time. It makes studying at night very difficult.', 'Electrical', 'Medium', 'Boys Hostel 1', '2', '214', null, S.ASSIGNED, 20],
  ['aarav', 'imran', 'Wi-Fi drops every few minutes in Lab 3', 'Campus Wi-Fi in Computer Lab 3 disconnects every 5-10 minutes. Students cannot submit online quizzes and the issue happens on all laptops.', 'Internet & Networking', 'High', 'Engineering Labs', '1', 'Lab 3', null, S.IN_PROGRESS, 30, { comments: [['student', 'It happened again during the 11 AM practical today.'], ['staff', 'Access point on this floor is overloaded. Installing an extra unit this afternoon.']] }],
  ['aarav', 'harish', 'Study table drawer broken', 'The drawer of my study table has come off its rails and cannot be closed. The wooden runner seems to be cracked.', 'Furniture', 'Low', 'Boys Hostel 1', '2', '214', null, S.RESOLVED, 80, { resolution: 'Replaced both drawer runners and tightened the table joints.' }],
  ['aarav', 'ramesh', 'Ceiling fan making grinding noise', 'The ceiling fan in classroom 105 makes a loud grinding noise at all speeds. It is distracting during lectures.', 'Electrical', 'Medium', 'Academic Block A', '1', '105', null, S.CLOSED, 400, { rating: 5, feedback: 'Fixed the same day. Thank you!', resolution: 'Replaced worn bearings and balanced the blades.' }],
  ['aarav', 'suresh', 'Geyser not heating water', 'The geyser in the second floor bathroom has stopped heating water. Cold water only since two days.', 'Hostel Maintenance', 'High', 'Boys Hostel 1', '2', 'Bathroom B', null, S.REOPENED, 120, { resolution: 'Reset the thermostat.', reopen: 'Water is hot for about ten minutes and then turns cold again.' }],

  // Other students
  ['ananya', null, 'Smart board not responding to touch', 'The interactive smart board in seminar hall 2 does not respond to touch input. Faculty are using it only as a projector screen.', 'Equipment', 'Medium', 'Academic Block B', '3', 'Seminar Hall 2', null, S.SUBMITTED, 9],
  ['ishita', null, 'Sparking from switchboard in common room', 'There is visible sparking from the switchboard near the TV in the common room whenever the heater is plugged in. Burning smell as well.', 'Electrical', 'Critical', 'Girls Hostel 1', 'G', null, 'Common room, near TV', S.SUBMITTED, 30],
  ['rohan', null, 'Broken window pane in workshop', 'One of the window panes in the mechanical workshop is cracked and could fall. Area below is used by students during breaks.', 'Other', 'High', 'Engineering Labs', 'G', 'Workshop 1', 'North-facing windows', S.SUBMITTED, 60],
  ['kabir', null, 'Library reading room AC too noisy', 'The AC unit in the silent reading room is making a loud rattling noise. Not urgent but disturbing for readers.', 'Equipment', 'Low', 'Central Library', '1', 'Reading Room', null, S.SUBMITTED, 26],
  ['sneha', 'imran', 'No internet in pharmacy lab', 'LAN ports in pharmacy lab 2 show no network. We need internet for the drug database software.', 'Internet & Networking', 'High', 'Academic Block B', '2', 'Lab 2', null, S.ASSIGNED, 6],
  ['ananya', 'pooja', 'Garbage not collected for two days', 'Dustbins on the first floor corridor have not been emptied for two days. It is starting to smell.', 'Cleanliness', 'Medium', 'Girls Hostel 1', '1', null, 'East corridor', S.ASSIGNED, 14],
  ['rohan', 'ramesh', 'Projector shows blue tint', 'The projector in room 302 shows everything with a strong blue tint. Slides with diagrams are hard to read.', 'Equipment', 'Medium', 'Academic Block A', '3', '302', null, S.ASSIGNED, 4],
  ['kabir', 'harish', 'Moot court bench is wobbly', 'The judges bench in the moot court hall wobbles badly. One leg seems loose.', 'Furniture', 'Low', 'Academic Block B', 'G', 'Moot Court Hall', null, S.ACCEPTED, 50],
  ['ishita', 'suresh', 'Low water pressure in shower', 'Water pressure in the showers on floor 3 is very low in the mornings, barely a trickle.', 'Plumbing', 'Medium', 'Girls Hostel 1', '3', null, 'Shower block', S.ACCEPTED, 22],
  ['sneha', 'ramesh', 'Power socket burnt in Room 118', 'One power socket near my bed is burnt and blackened. I have stopped using it.', 'Electrical', 'High', 'Girls Hostel 1', '1', '118', null, S.IN_PROGRESS, 18, { comments: [['staff', 'Isolated the circuit. Replacement socket is being fetched from store.']] }],
  ['rohan', 'pooja', 'Washroom drain clogged', 'The drain in the ground floor washroom is clogged and water collects on the floor.', 'Cleanliness', 'High', 'Boys Hostel 2', 'G', null, 'Ground floor washroom', S.IN_PROGRESS, 40],
  ['ananya', 'imran', 'Printer in library not connecting', 'The shared printer in the library cannot be found on the network from student laptops.', 'Internet & Networking', 'Low', 'Central Library', 'G', null, 'Print corner', S.IN_PROGRESS, 70],
  ['kabir', 'suresh', 'Leaking pipe under cafeteria sink', 'There is a steady leak from the pipe under the main sink in the cafeteria kitchen area.', 'Plumbing', 'Critical', 'Cafeteria', 'G', null, 'Kitchen wash area', S.IN_PROGRESS, 30, { reject: ['pooja', 'This is a plumbing job, not housekeeping.'] }],
  ['ishita', 'ramesh', 'Emergency light not working on stairs', 'The emergency light on the staircase between floor 2 and 3 does not turn on during power cuts.', 'Electrical', 'High', 'Girls Hostel 1', '2', null, 'Main staircase', S.IN_PROGRESS, 96],
  ['sneha', 'harish', 'Classroom door lock jammed', 'The door lock of room 210 is jammed and the room cannot be locked after classes.', 'Furniture', 'Medium', 'Academic Block A', '2', '210', null, S.RESOLVED, 60, { resolution: 'Replaced the lock cylinder and handed new keys to the department office.' }],
  ['rohan', 'imran', 'Lab computers very slow to log in', 'Login on lab computers takes more than five minutes because of the network profile sync.', 'Internet & Networking', 'Medium', 'Engineering Labs', '2', 'Lab 6', null, S.RESOLVED, 100, { resolution: 'Moved roaming profiles to the local file server, login now under 30 seconds.' }],
  ['kabir', 'pooja', 'Seminar hall not cleaned after event', 'The seminar hall was not cleaned after yesterday’s event. Food packets and paper all over.', 'Cleanliness', 'Low', 'Auditorium', 'G', null, 'Main hall', S.RESOLVED, 36, { resolution: 'Hall cleaned and extra dustbins placed near the exits.' }],
  ['ananya', 'suresh', 'Toilet flush not working', 'The flush in the second cubicle of the first floor washroom does not work.', 'Plumbing', 'Medium', 'Academic Block B', '1', null, 'Ladies washroom', S.REOPENED, 150, { resolution: 'Replaced the flush valve.', reopen: 'Flush works only if the handle is held down for a long time.' }],

  // Closed history across the last six weeks (feeds analytics)
  ['ishita', 'ramesh', 'Street light off near hostel gate', 'The street light near the main gate of the girls hostel is off. The area is very dark at night.', 'Electrical', 'Critical', 'Girls Hostel 1', 'G', null, 'Main gate', S.CLOSED, 900, { rating: 5, feedback: 'Very quick response, thank you.', resolution: 'Replaced the sodium lamp with an LED fixture.' }],
  ['rohan', 'harish', 'Broken chairs in classroom 108', 'Four chairs in classroom 108 have broken backrests.', 'Furniture', 'Medium', 'Academic Block A', '1', '108', null, S.CLOSED, 820, { rating: 4, resolution: 'Repaired three chairs and replaced one.' }],
  ['sneha', 'imran', 'Wi-Fi not available in girls hostel 3rd floor', 'There is no Wi-Fi signal on the third floor of the girls hostel.', 'Internet & Networking', 'High', 'Girls Hostel 1', '3', null, 'Whole floor', S.CLOSED, 760, { rating: 4, feedback: 'Signal is good now.', resolution: 'Installed two new access points on the third floor.' }],
  ['kabir', 'suresh', 'Water cooler not cooling', 'The water cooler near the library entrance dispenses warm water.', 'Equipment', 'Medium', 'Central Library', 'G', null, 'Entrance lobby', S.CLOSED, 700, { rating: 3, feedback: 'Took a while but works now.', resolution: 'Recharged the compressor gas.' }],
  ['ananya', 'pooja', 'Cockroaches in hostel pantry', 'There are cockroaches in the first floor pantry, especially near the sink.', 'Hostel Maintenance', 'High', 'Girls Hostel 1', '1', null, 'Pantry', S.CLOSED, 640, { rating: 5, resolution: 'Pest control done and gaps near sink sealed.' }],
  ['aarav', 'imran', 'LAN port dead in room 214', 'The LAN port in my room has no connectivity.', 'Internet & Networking', 'Medium', 'Boys Hostel 1', '2', '214', null, S.CLOSED, 560, { rating: 4, resolution: 'Re-crimped the cable at the switch end.' }],
  ['ishita', 'harish', 'Notice board fallen off wall', 'The notice board outside the management department office has fallen off the wall.', 'Other', 'Low', 'Academic Block B', '2', null, 'Outside dept. office', S.CLOSED, 500, { resolution: 'Remounted the board with wall anchors.', closedBy: 'admin' }],
  ['rohan', 'ramesh', 'Lab bench power strip not working', 'The power strip on bench 4 in the mechanical lab has no power.', 'Electrical', 'High', 'Engineering Labs', 'G', 'Mech Lab', null, S.CLOSED, 430, { rating: 4, resolution: 'Replaced the tripped MCB and the faulty power strip.' }],
  ['sneha', 'pooja', 'Washroom not cleaned regularly', 'The ground floor washroom in Academic Block A is not cleaned regularly in the afternoon.', 'Cleanliness', 'Medium', 'Academic Block A', 'G', null, 'Ground floor washroom', S.CLOSED, 350, { rating: 3, resolution: 'Added an afternoon cleaning round to the duty roster.' }],
  ['kabir', 'imran', 'Auditorium mic system crackling', 'The wireless microphones in the auditorium crackle and cut out.', 'Equipment', 'High', 'Auditorium', 'G', null, 'Sound console', S.CLOSED, 260, { rating: 5, feedback: 'Event went smoothly, thanks.', resolution: 'Replaced receiver antennas and batteries.' }],
  ['ananya', 'suresh', 'Basin tap broken in lab', 'The tap of the wash basin in electronics lab 1 is broken and water keeps running.', 'Plumbing', 'High', 'Academic Block B', '1', 'ECE Lab 1', null, S.CLOSED, 190, { rating: 4, resolution: 'Replaced the tap and the inlet valve.' }],
  ['rohan', null, 'Duplicate: workshop window', 'The window in the workshop is broken.', 'Other', 'Low', 'Engineering Labs', 'G', 'Workshop 1', null, S.CLOSED, 55, { closedBy: 'admin', adminCloseFromSubmitted: 'Duplicate of an existing complaint about the same window.' }],
  ['ishita', 'ramesh', 'Gym treadmill display not working', 'The display on treadmill 2 in the sports complex gym does not light up.', 'Equipment', 'Low', 'Sports Complex', 'G', null, 'Gym', S.CLOSED, 150, { rating: 4, resolution: 'Replaced the display ribbon cable.' }],
];

const RESOLVE_HOURS = { Critical: 5, High: 16, Medium: 30, Low: 48 };

/* ------------------------------------------------------------------ build */

async function main() {
  await connectDatabase();
  const dbName = mongoose.connection.name;
  console.log(`[seed] Clearing CampusFix collections in "${dbName}"`);
  for (const model of [User, Counter, Complaint, Assignment, Comment, Notification, StatusHistory]) {
    await model.deleteMany({});
    await model.syncIndexes();
  }

  const hashes = {};
  for (const [role, password] of Object.entries(PASSWORDS)) hashes[role] = await bcrypt.hash(password, env.bcryptSaltRounds);

  const users = {};
  const userDocs = [];
  const addUsers = (list, role, joinedDaysAgo) =>
    list.forEach((u, i) => {
      const { key, ...fields } = u;
      const createdAt = new Date(NOW - (joinedDaysAgo - i) * 24 * HOUR);
      const doc = { _id: oid(), ...fields, role, password: hashes[role], isActive: u.isActive ?? true, refreshSessions: [], createdAt, updatedAt: createdAt };
      users[key] = doc;
      userDocs.push(doc);
    });
  addUsers(ADMINS, ROLES.ADMIN, 120);
  addUsers(STAFF, ROLES.STAFF, 110);
  addUsers(STUDENTS, ROLES.STUDENT, 60);
  for (const doc of userDocs) await new User(doc).validate();
  await User.collection.insertMany(userDocs);

  const complaints = [];
  const histories = [];
  const assignments = [];
  const comments = [];
  const notifications = [];
  const admin = users.neha;

  const notify = (recipient, at, title, message, type, complaintId) => {
    if (!recipient || !recipient.isActive) return;
    notifications.push({
      _id: oid(),
      recipient: recipient._id,
      title,
      message,
      type,
      relatedComplaint: complaintId,
      isRead: NOW - at > 36 * HOUR,
      createdAt: new Date(at),
    });
  };

  const ordered = SCENARIOS.map((row) => ({ row, createdAt: NOW - row[11] * HOUR })).sort((a, b) => a.createdAt - b.createdAt);
  const year = new Date().getFullYear();
  let seq = 0;

  for (const { row, createdAt } of ordered) {
    const [studentKey, staffKey, title, description, category, priority, building, floor, roomNumber, location, finalStatus, , opts = {}] = row;
    const student = users[studentKey];
    const staff = staffKey ? users[staffKey] : null;
    const id = oid();
    seq += 1;
    const code = `CF-${year}-${String(seq).padStart(5, '0')}`;
    const label = `${code} "${title}"`;

    // Build the ordered list of steps that lead to the final status.
    const steps = [];
    const reach = (status) => ['Assigned', 'Accepted', 'In Progress', 'Resolved', 'Reopened', 'Closed'].indexOf(finalStatus) >= ['Assigned', 'Accepted', 'In Progress', 'Resolved', 'Reopened', 'Closed'].indexOf(status);
    if (opts.adminCloseFromSubmitted) {
      steps.push({ status: S.CLOSED, by: admin, gap: 6, remarks: opts.adminCloseFromSubmitted });
    } else if (staff) {
      if (opts.reject) {
        steps.push({ status: S.ASSIGNED, by: admin, gap: 1, remarks: `Assigned to ${users[opts.reject[0]].name}`, assignTo: users[opts.reject[0]] });
        steps.push({ status: S.SUBMITTED, by: users[opts.reject[0]], gap: 1, remarks: `Declined by ${users[opts.reject[0]].name}: ${opts.reject[1]}`, rejected: true });
      }
      steps.push({ status: S.ASSIGNED, by: admin, gap: priority === 'Critical' ? 0.5 : 2, remarks: `Assigned to ${staff.name}`, assignTo: staff });
      if (reach(S.ACCEPTED)) steps.push({ status: S.ACCEPTED, by: staff, gap: 1, remarks: `Accepted by ${staff.name}` });
      if (reach(S.IN_PROGRESS)) steps.push({ status: S.IN_PROGRESS, by: staff, gap: 2, remarks: 'Work started on site' });
      if (reach(S.RESOLVED)) steps.push({ status: S.RESOLVED, by: staff, gap: RESOLVE_HOURS[priority], remarks: opts.resolution, resolve: true });
      if (finalStatus === S.REOPENED) steps.push({ status: S.REOPENED, by: student, gap: 18, remarks: opts.reopen, reopen: true });
      if (finalStatus === S.CLOSED) {
        const byAdmin = opts.closedBy === 'admin' || !opts.rating;
        steps.push({
          status: S.CLOSED,
          by: byAdmin ? admin : student,
          gap: 14,
          remarks: byAdmin ? 'Verified on inspection and closed' : `Confirmed by reporter (rated ${opts.rating}/5)`,
          close: true,
        });
      }
    }

    // Fit the timeline inside the complaint's age, leaving the present open.
    const available = NOW - createdAt - 0.5 * HOUR;
    const totalGap = steps.reduce((sum, s) => sum + s.gap * HOUR, 0);
    const scale = totalGap > available ? available / totalGap : 1;
    let cursor = createdAt;
    steps.forEach((s) => {
      cursor += s.gap * HOUR * scale;
      s.at = cursor;
    });

    const complaint = {
      _id: id,
      complaintCode: code,
      title,
      description,
      category,
      priority,
      status: S.SUBMITTED,
      building,
      floor,
      roomNumber: roomNumber || undefined,
      location: location || undefined,
      reportedBy: student._id,
      assignedTo: null,
      images: [],
      reopenCount: 0,
      createdAt: new Date(createdAt),
      updatedAt: new Date(createdAt),
    };

    histories.push({ _id: oid(), complaint: id, previousStatus: null, newStatus: S.SUBMITTED, changedBy: student._id, remarks: 'Complaint submitted', createdAt: new Date(createdAt) });
    notifyAdmins(users, notify, createdAt, `New ${priority.toLowerCase()} priority complaint`, `${student.name} reported ${label} in ${building}.`, 'complaint_created', id);

    let activeAssignment = null;
    for (const step of steps) {
      histories.push({ _id: oid(), complaint: id, previousStatus: complaint.status, newStatus: step.status, changedBy: step.by._id, remarks: step.remarks, createdAt: new Date(step.at) });
      complaint.status = step.status;
      complaint.updatedAt = new Date(step.at);

      if (step.assignTo) {
        activeAssignment = { _id: oid(), complaint: id, assignedBy: admin._id, assignedTo: step.assignTo._id, assignmentStatus: 'pending', assignedAt: new Date(step.at), createdAt: new Date(step.at), updatedAt: new Date(step.at) };
        assignments.push(activeAssignment);
        complaint.assignedTo = step.assignTo._id;
        notify(step.assignTo, step.at, 'New task assigned to you', `${label} at ${building}, Floor ${floor}. Please accept or decline the assignment.`, 'complaint_assigned', id);
        notify(student, step.at, 'Your complaint has been assigned', `${code} has been assigned to ${step.assignTo.name}.`, 'complaint_assigned', id);
      } else if (step.rejected) {
        Object.assign(activeAssignment, { assignmentStatus: 'rejected', rejectedAt: new Date(step.at), responseNote: opts.reject[1], updatedAt: new Date(step.at) });
        complaint.assignedTo = null;
        notifyAdmins(users, notify, step.at, 'Assignment declined - needs reassignment', `${step.by.name} declined ${label}: ${opts.reject[1]}`, 'assignment_rejected', id);
      } else if (step.status === S.ACCEPTED) {
        Object.assign(activeAssignment, { assignmentStatus: 'accepted', acceptedAt: new Date(step.at), updatedAt: new Date(step.at) });
        notify(student, step.at, 'Maintenance accepted your complaint', `${staff.name} accepted ${code} and will start work shortly.`, 'assignment_accepted', id);
      } else if (step.status === S.IN_PROGRESS) {
        notify(student, step.at, 'Work is in progress', `${staff.name} updated ${code} to In Progress: Work started on site`, 'status_updated', id);
      } else if (step.resolve) {
        complaint.resolvedAt = new Date(step.at);
        complaint.resolutionNotes = opts.resolution;
        Object.assign(activeAssignment, { assignmentStatus: 'completed', completedAt: new Date(step.at), updatedAt: new Date(step.at) });
        notify(student, step.at, 'Your complaint has been resolved', `${staff.name} resolved ${code}. Confirm the fix with feedback, or reopen it if the problem persists.`, 'complaint_resolved', id);
      } else if (step.reopen) {
        complaint.reopenCount = 1;
        complaint.resolvedAt = undefined;
        Object.assign(activeAssignment, { assignmentStatus: 'accepted', completedAt: undefined });
        notify(staff, step.at, 'Complaint reopened by student', `${student.name} reopened ${label}: ${opts.reopen}`, 'complaint_reopened', id);
        notifyAdmins(users, notify, step.at, 'Complaint reopened', `${student.name} reopened ${label}: ${opts.reopen}`, 'complaint_reopened', id);
      } else if (step.close) {
        complaint.closedAt = new Date(step.at);
        if (opts.rating) {
          complaint.feedback = { rating: opts.rating, comment: opts.feedback, submittedAt: new Date(step.at) };
          notify(staff, step.at, 'Feedback received', `${student.name} rated your work on ${code} ${opts.rating}/5.`, 'feedback_received', id);
        } else {
          notify(student, step.at, 'Complaint closed', `${code} was closed by ${admin.name}.`, 'complaint_closed', id);
        }
      } else if (step.status === S.CLOSED) {
        complaint.closedAt = new Date(step.at);
        notify(student, step.at, 'Complaint closed', `${code} was closed by ${admin.name}: ${step.remarks}`, 'complaint_closed', id);
      }
    }

    // Comments sit between the last two steps (or after creation).
    (opts.comments || []).forEach(([who, message], i) => {
      const author = who === 'staff' ? staff : student;
      const start = steps.length ? steps[steps.length - 1].at : createdAt;
      const at = Math.min(NOW - 10 * 60 * 1000, start + (i + 1) * 0.6 * HOUR);
      comments.push({ _id: oid(), complaint: id, author: author._id, message, createdAt: new Date(at) });
      const recipient = who === 'staff' ? student : staff;
      notify(recipient, at, `New comment on ${code}`, `${author.name}: ${message}`, 'comment_added', id);
    });

    complaints.push(complaint);
  }

  // Validate against the Mongoose schemas, then bulk insert with the historical timestamps.
  for (const [model, docs] of [[Complaint, complaints], [Assignment, assignments], [StatusHistory, histories], [Comment, comments], [Notification, notifications]]) {
    for (const doc of docs) await new model(doc).validate();
    if (docs.length) await model.collection.insertMany(docs.map((d) => JSON.parse(JSON.stringify(d), reviveDates)));
  }
  await Counter.create({ _id: `complaint-${year}`, seq });

  console.log(`[seed] Inserted ${userDocs.length} users, ${complaints.length} complaints, ${assignments.length} assignments,`);
  console.log(`       ${histories.length} status history entries, ${comments.length} comments, ${notifications.length} notifications.`);
  console.log('\nDemo accounts');
  console.log(`  Admin    admin@campusfix.edu            ${PASSWORDS.admin}`);
  console.log(`  Staff    ramesh.kumar@campusfix.edu     ${PASSWORDS.staff}`);
  console.log(`  Student  aarav.sharma@campusfix.edu     ${PASSWORDS.student}`);
  await disconnectDatabase();
}

function notifyAdmins(users, notify, at, title, message, type, complaintId) {
  ADMINS.forEach((a) => notify(users[a.key], at, title, message, type, complaintId));
}

// JSON round-trip strips undefined fields; revive ISO dates and ObjectIds.
function reviveDates(key, value) {
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return new Date(value);
    if (/^[0-9a-f]{24}$/.test(value) && key !== 'complaintCode') return new mongoose.Types.ObjectId(value);
  }
  return value;
}

main().catch(async (err) => {
  console.error('[seed] Failed:', err);
  await disconnectDatabase();
  process.exit(1);
});
