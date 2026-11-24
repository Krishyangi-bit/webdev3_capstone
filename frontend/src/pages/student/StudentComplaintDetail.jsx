import { useParams } from 'react-router-dom';
import ComplaintDetailView from '../../components/ComplaintDetailView';
import { StudentActions } from '../../components/ComplaintActions';

export default function StudentComplaintDetail() {
  const { id } = useParams();
  return (
    <ComplaintDetailView
      complaintId={id}
      back={{ to: '/student/complaints', label: 'My complaints' }}
      renderActions={({ complaint, replaceComplaint }) => <StudentActions complaint={complaint} onUpdated={replaceComplaint} />}
    />
  );
}
