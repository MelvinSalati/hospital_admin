export default function LabHistoryTab({ patient }) {

    const labs = patient.labs || []

    return (
        <div>

            <h3 className="text-lg font-semibold mb-4">
                Laboratory History
            </h3>

            <table className="w-full border">

                <thead>
                    <tr className="bg-gray-100">
                        <th className="p-2">Test</th>
                        <th className="p-2">Date</th>
                        <th className="p-2">Result</th>
                        <th className="p-2">Doctor</th>
                    </tr>
                </thead>

                <tbody>
                    {labs.map((lab, i) => (
                        <tr key={i} className="border-t">
                            <td className="p-2">{lab.test}</td>
                            <td className="p-2">{lab.date}</td>
                            <td className="p-2">{lab.result}</td>
                            <td className="p-2">{lab.doctor}</td>
                        </tr>
                    ))}
                </tbody>

            </table>

        </div>
    )
}
