import { useEffect, useState } from "react";
import routes from "../constants/routes";
import Http from '../utils/Http' 


export default function useDrugs(){
  
    const [loading, setLoading]  = useState(false)
    const [error, setError]      = useState(false)
    const [drugs, setDrugs]      = useState([]);

    const getDrugs              = async () => {
        setLoading(true)
       try {
         const  drugs            = await Http.get(routes.api.pharmacy.drugs);
         setDrugs(drugs.data)
          setLoading(false)
       }
       catch(error){
         setLoading(false)
        setError(error.message)
       }
    } 
    useEffect(()=>{
        getDrugs();
    },[]); 

    return {
        loading,
        error,
        drugs
    }
}