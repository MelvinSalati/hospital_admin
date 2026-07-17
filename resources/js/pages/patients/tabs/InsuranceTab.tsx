import { Button } from "@/components/ui/button"

export default function InsuranceTab({ patient }) {

    const policies = patient.insurance || []

    return (
        <div>

           <div className="flex gap-5">
                <div className="w-50">
                    <Button>
                        Add Insurance
                    </Button>
                </div>
                 <div className="w-50">
                     <h3 className="text-lg mb-4">
                Medical Insurance Policy
            </h3>
                </div>
            </div>

          

        </div>
    )
}
