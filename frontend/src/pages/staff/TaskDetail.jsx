import { useParams } from 'react-router-dom';
import ComplaintDetailView from '../../components/ComplaintDetailView';
import { StaffActions } from '../../components/ComplaintActions';

// Staff view of a complaint. The API returns only this staff member's
// assignments for the complaint; the most recent one drives the actions.
export default function TaskDetail() {
  const { id } = useParams();
  return (
    <ComplaintDetailView
      complaintId={id}
      back={{ to: '/staff/tasks', label: 'Assigned tasks' }}
      renderActions={({ complaint, assignments, reload }) => {
        const mine = complaint.assignedTo?._id ? assignments.find((a) => ['pending', 'accepted'].includes(a.assignmentStatus)) : null;
        return <StaffActions complaint={complaint} assignment={mine} onUpdated={reload} />;
      }}
    />
  );
}
