import { useEffect, useState } from "react";
import routes from "../constants/routes";
import Http from '../utils/Http' 


export default function useBills(){
  
    const [loading, setLoading]  = useState(false)
    const [error, setError]      = useState(false)
    const [labs, setLabs]        = useState([]);

    const getLabs               = async () => {
        setLoading(true)
       try {
         const  labs             = await Http.get(routes.api.laboratory.labs);
         setLabs(labs.data)
          setLoading(false)
       }
       catch(error){
         setLoading(false)
        setError(error.message)
       }
    } 
    useEffect(()=>{
        getLabs();
    },[]); 

    return {
        loading,
        error,
        labs
    }
}