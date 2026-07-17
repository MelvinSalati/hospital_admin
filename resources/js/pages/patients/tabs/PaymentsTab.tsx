export default function PaymentsTab({ patient }) {

    const payments = patient.payments || []

    return (
        <div>

            <h3 className="text-lg font-semibold mb-4">
                Payments
            </h3>

            <button className="mb-4 bg-blue-600 text-white px-4 py-2 rounded">
                Add Payment Method
            </button>

            <table className="w-full border">

                <thead>
                    <tr className="bg-gray-100">
                        <th className="p-2">Date</th>
                        <th className="p-2">Amount</th>
                        <th className="p-2">Method</th>
                        <th className="p-2">Reference</th>
                    </tr>
                </thead>

                <tbody>
                    {payments.map((payment, i) => (
                        <tr key={i} className="border-t">
                            <td className="p-2">{payment.date}</td>
                            <td className="p-2">{payment.amount}</td>
                            <td className="p-2">{payment.method}</td>
                            <td className="p-2">{payment.reference}</td>
                        </tr>
                    ))}
                </tbody>

            </table>

        </div>
    )
}
