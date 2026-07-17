export default function DrugHistoryTab({ patient }) {

    const drugs = patient.drugs || []

    return (
        <div>

            <h3 className="text-lg font-semibold mb-4">
                Medication History
            </h3>

            <table className="w-full border">

                <thead>
                    <tr className="bg-gray-100">
                        <th className="p-2">Drug</th>
                        <th className="p-2">Dosage</th>
                        <th className="p-2">Frequency</th>
                        <th className="p-2">Doctor</th>
                    </tr>
                </thead>

                <tbody>
                    {drugs.map((drug, i) => (
                        <tr key={i} className="border-t">
                            <td className="p-2">{drug.name}</td>
                            <td className="p-2">{drug.dosage}</td>
                            <td className="p-2">{drug.frequency}</td>
                            <td className="p-2">{drug.doctor}</td>
                        </tr>
                    ))}
                </tbody>

            </table>

        </div>
    )
}
