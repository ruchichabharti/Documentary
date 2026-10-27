/**
 * pages/Document.jsx — Document route wrapper
 * Extracts docId from URL, handles not-found state.
 */

import { useParams, useNavigate } from 'react-router-dom';
import Editor from '../components/Editor.jsx';

export default function Document() {
  const { id } = useParams();
  const navigate = useNavigate();

  if (!id) {
    navigate('/dashboard');
    return null;
  }

  return <Editor docId={id} />;
}
