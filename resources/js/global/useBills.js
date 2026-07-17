import { useEffect, useState } from "react";
import routes from "../constants/routes";
import Http from '../utils/Http' 


export default function useBills(){
  
    const [loading, setLoading]  = useState(false)
    const [error, setError]      = useState(false)
    const [bills, setBills]      = useState([]);

    const getBills               = async () => {
        setLoading(true)
       try {
         const  bills              = await Http.get(routes.api.bills);
         setBills(bills.data)
          setLoading(false)
       }
       catch(error){
         setLoading(false)
        setError(error.message)
       }
    } 
    useEffect(()=>{
        getBills();
    },[]); 

    return {
        loading,
        error,
        bills
    }
}