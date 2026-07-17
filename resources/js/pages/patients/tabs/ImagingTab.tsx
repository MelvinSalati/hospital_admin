export default function ImagingTab({ patient }) {

    const imaging = patient.imaging || []

    return (
        <div>

            <h3 className="text-lg font-semibold mb-4">
                Imaging History
            </h3>

            <table className="w-full border">

                <thead>
                    <tr className="bg-gray-100">
                        <th className="p-2">Type</th>
                        <th className="p-2">Date</th>
                        <th className="p-2">Radiologist</th>
                        <th className="p-2">Report</th>
                    </tr>
                </thead>

                <tbody>
                    {imaging.map((scan, i) => (
                        <tr key={i} className="border-t">
                            <td className="p-2">{scan.type}</td>
                            <td className="p-2">{scan.date}</td>
                            <td className="p-2">{scan.radiologist}</td>
                            <td className="p-2">
                                <button className="text-blue-600">
                                    View Report
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>

            </table>

        </div>
    )
}
