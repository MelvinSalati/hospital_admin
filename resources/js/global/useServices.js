import { useEffect, useState } from "react";
import routes from "../constants/routes";
import Http from '../utils/Http' 


export default function useBills(){
  
    const [loading, setLoading]     = useState(false)
    const [error, setError]         = useState(false)
    const [services, setServices]   = useState([]);

    const getServices               = async () => {
        setLoading(true)
       try {
         const  services            = await Http.get(routes.api.services);
         setBills(services.data)
          setLoading(false)
       }
       catch(error){
         setLoading(false)
        setError(error.message)
       }
    } 
    useEffect(()=>{
        getServices();
    },[]); 

    return {
        loading,
        error,
        services
    }
}