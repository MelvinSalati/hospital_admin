import { useEffect, useState } from "react";
import Http from "@/utils/Http";

export default function useDashboardMetrics() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [metrics, setMetrics] = useState(null);

    useEffect(() => {
        const fetchMetrics = async () => {
            setLoading(true);
            setError(null);

            try {
                const response = await Http.get('reception/dashboard/metrics');
                setMetrics(response.data);
            } catch (err) {
                setError(err);
                console.error("Dashboard metrics error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchMetrics();
    }, []);

    return {
        loading,
        error,
        metrics,
    };
}