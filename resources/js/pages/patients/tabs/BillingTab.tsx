export default function BillingTab({ patient }) {

    const bills = patient.bills || []

    return (
        <div>

            <h3 className="text-lg font-semibold mb-4">
                Billing
            </h3>

            <table className="w-full border">

                <thead>
                    <tr className="bg-gray-100">
                        <th className="p-2">Invoice</th>
                        <th className="p-2">Date</th>
                        <th className="p-2">Amount</th>
                        <th className="p-2">Status</th>
                    </tr>
                </thead>

                <tbody>
                    {bills.map((bill, i) => (
                        <tr key={i} className="border-t">
                            <td className="p-2">{bill.number}</td>
                            <td className="p-2">{bill.date}</td>
                            <td className="p-2">{bill.amount}</td>
                            <td className="p-2">{bill.status}</td>
                        </tr>
                    ))}
                </tbody>

            </table>

        </div>
    )
}
