import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ProfileService } from '../services/profileService';

const HandleRedirect = () => {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    const redirectToProfile = async () => {
      if (!handle) {
        navigate('/feed');
        return;
      }

      try {
        // Remove @ if present
        const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle;
        
        // Search for user by handle
        const users = await ProfileService.searchUsers(cleanHandle);
        
        if (users && users.length > 0) {
          const user = users.find((u: any) => u.handle === cleanHandle);
          if (user) {
            navigate(`/user/${user.id}`);
          } else {
            navigate('/feed');
          }
        } else {
          navigate('/feed');
        }
      } catch (error) {
        console.error('Error redirecting to profile:', error);
        navigate('/feed');
      }
    };

    redirectToProfile();
  }, [handle, navigate]);

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
      <div className="text-slate-900 dark:text-white">
        <p>Redirecionando...</p>
      </div>
    </div>
  );
};

export default HandleRedirect;
