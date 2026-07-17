import { Button } from '@/components/ui/button';
import { EyeIcon } from 'lucide-react';

export default function ActiveInQueue({ patients }) {
    console.log(patients);
    return (
        <>
            <div className="max-w-full overflow-x-auto">
                <input
                    type="text"
                    placeholder="Filter Patient"
                    className="mb-4 w-full rounded border p-2"
                />
                {patients.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                    Sn
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                    Patient
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                    Visit Token
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                    Queue
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                    Interaction Date
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                    Action
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {patients.map((item, index) => (
                                <tr key={item.id}>
                                    <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-gray-900">
                                        {index + 1}
                                    </td>
                                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                                        {item.patient.first_name}{' '}
                                        {item.patient.last_name}
                                    </td>
                                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                                        {item.token}
                                    </td>
                                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                                        {item.assigned_department.name}
                                    </td>
                                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                                        {item.created_at}
                                    </td>
                                    <td className="space-x-2 px-6 py-4 whitespace-nowrap">
                                        <Button
                                            // variant="secondary"
                                            size={'sm'}
                                            className=""
                                        >
                                            <ShoppingCartIcon />
                                            Cart
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p className="py-4 text-center">No active queue</p>
                )}
            </div>
        </>
    );
}
