import { useEffect, useState, useMemo, useCallback } from "react";
import Http from "../utils/Http"; // Assuming this import
import Routes from "../constants/Routes"; // Assuming this import

export default function useDepartments(){
    const [loading, setLoading] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [countAssigned, setCountAssigned] = useState([]);
    const [error, setError] = useState(null);
    const [usersAssignable, setUsersAssignable] = useState([])

    const getDepartments = useCallback(async () => {
        // Prevent multiple requests if already loading
        if (loading) return;
        
        setLoading(true);
        setError(null);
        
        try {
            const response = await Http.get(Routes.api.departments);
            setDepartments(response.data.departments);
            setCountAssigned(response.data.countAssigned);
            setUsersAssignable(response.data.users);
        } catch(error) {
            setError(error?.message || 'Failed to fetch departments');
            console.error('Error fetching departments:', error);
        } finally {
            setLoading(false);
        }
    }, []); 
    
    useEffect(() => {
        getDepartments();
    }, [getDepartments]);

    // Use useMemo to memoize computed values
    const departmentStats = useMemo(() => {
        return {
            totalDepartments: departments?.length || 0,
            totalAssigned: countAssigned?.length || 0,
            // Calculate available departments (total - assigned)
            availableDepartments: (departments?.length || 0) - (countAssigned?.length || 0),
            // Group departments by some criteria if needed
            departmentsByFirstLetter: departments?.reduce((acc, dept) => {
                if (!dept?.department_name) return acc;
                const firstLetter = dept.department_name[0].toUpperCase();
                if (!acc[firstLetter]) {
                    acc[firstLetter] = [];
                }
                acc[firstLetter].push(dept);
                return acc;
            }, {}) || {}
        };
    }, [departments, countAssigned]);

    // Memoize the active departments list
    const activeDepartments = useMemo(() => {
        return departments?.filter(dept => dept.is_active !== false) || [];
    }, [departments]);

    // Memoize departments with assigned counts
    const departmentsWithAssignment = useMemo(() => {
        return departments?.map(dept => ({
            ...dept,
            assignedCount: countAssigned?.filter(
                assigned => assigned.department_id === dept.id
            )?.length || 0
        })) || [];
    }, [departments, countAssigned]);

    // Return memoized values to prevent unnecessary re-renders
    return useMemo(() => ({
        loading,
        error,
        departments,
        countAssigned,
        activeDepartments,
        usersAssignable,
        departmentStats,
        departmentsWithAssignment,
        // Function to refresh data
        refreshDepartments: getDepartments,
        // Function to set departments manually if needed
        setDepartments,
        // Function to clear error
        clearError: () => setError(null)
    }), [
        loading, 
        error, 
        departments, 
        countAssigned, 
        activeDepartments, 
        usersAssignable,
        departmentStats, 
        departmentsWithAssignment, 
        getDepartments
    ]);
}