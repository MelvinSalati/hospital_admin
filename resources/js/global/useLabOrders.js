
import {useState, useEffect} from 'react'
import routes from '@/constants/routes'
import Http from '@/utils/Http';


const useLabOrders = () => {
  const [labOrders, setLabOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLabOrders = async () => {
      setLoading(true);
      try {
        const response = await Http.get(routes.api.laboratory.labs);
        setLabOrders(response.data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLabOrders();
  }, []);

  const deleteLabOrder = async (orderId) => {
    try {
      const response = await Http.delete(`${routes.api.laboratory.labs}/${orderId}`);
      if (response.data.status) {
        setLabOrders(prev => prev.filter(order => order.id !== orderId));
        return true;
      }
      return false;
    } catch (err) {
      Notiflix.Notify.failure(error.message)
      return false;
    }
  };

  return { labOrders, loading, error, deleteLabOrder };
};

export default useLabOrders;