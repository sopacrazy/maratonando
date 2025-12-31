import React, { useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AppContext } from '../../App';
import OnboardingWizard from './OnboardingWizard';

const OnboardingManager: React.FC = () => {
    const { user } = useContext(AppContext);
    const location = useLocation();
    const [showOnboarding, setShowOnboarding] = useState(false);

    useEffect(() => {
        // Only show onboarding if:
        // 1. User is logged in (has ID)
        // 2. User has the "new user" default bio
        // 3. We are NOT on the login page ('/')
        if (user?.id && user.bio === 'Novo na comunidade maratonando!') {
            if (location.pathname !== '/') {
                setShowOnboarding(true);
            } else {
                setShowOnboarding(false);
            }
        } else {
            setShowOnboarding(false);
        }
    }, [user, location.pathname]);

    if (!showOnboarding) return null;

    return <OnboardingWizard onComplete={() => setShowOnboarding(false)} />;
};

export default OnboardingManager;
