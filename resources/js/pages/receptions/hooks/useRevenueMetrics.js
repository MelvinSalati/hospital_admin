import { useEffect, useState } from "react";
import Http from "@/utils/Http";

export default function useRevenueMetrics() {
    const [revenue, setRevenue] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchRevenue = async () => {
        setLoading(true);

        try {
            const response = await Http.get("reception/revenue/metrics/");
            setRevenue(response.data);
        } catch (err) {
            console.error("Revenue error:", err);
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRevenue();
    }, []);

    return { revenue, loading, error, refetch: fetchRevenue };
}