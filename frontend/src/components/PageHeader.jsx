import { Link } from 'react-router-dom';
import Icon from './Icon';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function PageHeader({ title, description, actions, back, documentTitle }) {
  useDocumentTitle(documentTitle || (typeof title === 'string' ? title : undefined));
  return (
    <>
      {back && (
        <Link to={back.to} className="back-link">
          <Icon name="arrowLeft" size={14} />
          {back.label}
        </Link>
      )}
      <header className="page-header">
        <div className="page-header__text">
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
        {actions && <div className="page-header__actions">{actions}</div>}
      </header>
    </>
  );
}
