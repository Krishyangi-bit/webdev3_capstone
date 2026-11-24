import { useParams } from 'react-router-dom';
import ComplaintDetailView from '../../components/ComplaintDetailView';
import { AdminActions } from '../../components/ComplaintActions';

export default function AdminComplaintDetail() {
  const { id } = useParams();
  return (
    <ComplaintDetailView
      complaintId={id}
      showAssignments
      back={{ to: '/admin/complaints', label: 'All complaints' }}
      renderActions={({ complaint, replaceComplaint }) => <AdminActions complaint={complaint} onUpdated={replaceComplaint} />}
    />
  );
}
