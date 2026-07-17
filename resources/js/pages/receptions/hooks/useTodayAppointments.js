import { useEffect, useState } from "react";
import Http from "@/utils/Http";

export default function useTodayAppointments() {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchAppointments = async () => {
        setLoading(true);

        try {
            const response = await Http.get("reception/appointments/today");
            setAppointments(response.data);
        } catch (err) {
            console.error("Appointments error:", err);
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAppointments();
    }, []);

    return { appointments, loading, error, refetch: fetchAppointments };
}