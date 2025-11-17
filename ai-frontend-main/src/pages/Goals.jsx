import { useState, useEffect } from "react";
import { useGoals } from "../context/GoalsContext";
import { useUser } from "../context/UserContext";
import SetGoals from "./GoalsPage/SetGoals";
import EnterWeight from "./GoalsPage/EnterWeight";
import GoalsDashboard from "./GoalsPage/GoalsDashboard";

function Goals() {
    const { currentWeight, goalWeight, goal } = useGoals();
    const { user, markOnboardingComplete } = useUser();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(true);

    // Check if user has already set up their goals OR completed onboarding
    useEffect(() => {
        console.log('=== LOADING GOALS PAGE ===');
        console.log('localStorage keys:', Object.keys(localStorage));
        console.log('localStorage goals:', localStorage.getItem('goalsData'));
        console.log('Context value:', { currentWeight, goalWeight, goal });
        console.log('User data:', user);
        console.log('========================');
        
        console.log('Goals page - checking data:', { 
            currentWeight, 
            goalWeight, 
            goal, 
            hasCompletedOnboarding: user.hasCompletedOnboarding,
            user: user 
        });
        
        // If user has completed onboarding, go directly to dashboard
        if (user.hasCompletedOnboarding) {
            console.log('User has completed onboarding, going to dashboard');
            setStep(3);
            setIsLoading(false);
            return;
        }
        
        // Otherwise, check if goals are set up
        // Check for null/undefined, not falsy values (0 is falsy but valid weight)
        if (currentWeight !== null && goalWeight !== null && goal) {
            console.log('Goals are set up, going to dashboard');
            setStep(3); // Go directly to dashboard
        } else if (goal) {
            console.log('Goal selected but weights missing, going to weight entry');
            setStep(2); // Go to weight entry
        } else {
            console.log('No goals set, starting with goal selection');
            setStep(1); // Start with goal selection
        }
        
        setIsLoading(false);
    }, [currentWeight, goalWeight, goal, user.hasCompletedOnboarding]);

    // Show loading state while checking data
    if (isLoading) {
        return (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
                <p>Loading your goals...</p>
            </div>
        );
    }

    const handleGoalContinue = () => {
        setStep(2);
    };

    const handleWeightContinue = () => {
        // Mark onboarding as complete when user finishes weight entry
        markOnboardingComplete();
        setStep(3);
    };

    return (
        <div>
            {step === 1 && (
                <SetGoals onContinue={handleGoalContinue} />
            )}

            {step === 2 && (
                <EnterWeight onContinue={handleWeightContinue} />
            )}

            {step === 3 && (
                <GoalsDashboard />
            )}
        </div>
    );
}

export default Goals;

 