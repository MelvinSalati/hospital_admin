import { useEffect, useState } from "react";
import Http from "@/utils/Http";

export default function usePatientQueued(departmentId) {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchPatients = async () => {
        if (!departmentId) return;

        setLoading(true);

        try {
            const response = await Http.get(`reception/patients/queues`);
            setPatients(response.data);
        } catch (err) {
            console.error("Queue error:", err);
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPatients();
    }, [departmentId]);

    return { patients, loading, error, refetch: fetchPatients };
}