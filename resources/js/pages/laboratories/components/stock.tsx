import { AlertCircle, BoxIcon } from "lucide-react"

export default function StockAlerts () {

    const metrics    =  [
        {
            name: 'Stock Status',
            number: 3,
            alertLevel:100
        }
    ]
    return <>
        <div className="p-4">
            <div className="flex gap-4">
                {metrics.map((item)=>(
                    <div className="p-2 bg-gray-100 flex gap-2 shadow-lg rounded-lg w-1/3">
                       <div className="m-auto ">
                        <AlertCircle style={{fontSize:28,height:50,width:50,color: 'red'}}/>
                       </div>
                       <div className="border-l font-bold">{item.name}
                        <p className="items-center">{item.number}</p>
                       </div>

                    </div>
                ))}
            </div>
        </div>
    </>
}
