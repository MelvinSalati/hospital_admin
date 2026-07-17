export default function OverviewTab({ patient }) {
    return (
        <div className="grid grid-cols-2 gap-6">

            <div className="space-y-2">
                <h3 className="text-sm  text-gray-600">Patient Information</h3>
                <p className="text-2xl"><b>Name:</b> {patient.first_name}</p>
                <p className="text-2xl"><b>Gender:</b> {patient.gender}</p>
            </div>

            <div className="space-y-2 text-gray-600">
                <h3 className="text-sm font-medium text-gray-600">Medical Summary</h3>

                <p className="text-2xl" ><b>Blood Group:</b> {patient.blood_group}</p>
                <p className="text-2xl"><b>Allergies:</b> {patient.allergies || "None"}</p>
            </div>

        </div>
    )
}
