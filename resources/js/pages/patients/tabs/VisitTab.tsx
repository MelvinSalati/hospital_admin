import { useState } from 'react';

export default function VisitTab({ patient }) {
    const [notes, setNotes] = useState('');
    const [queues, setQueues] = useState([]);
    const startVisit = () => {
        console.log('Start visit', patient.id);
    };

    const saveNotes = () => {
        console.log('Save visit notes', notes);
    };

    return (
        <div className="space-y-4">
            <div className="hidden overflow-x-auto md:block">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">
                                Token
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">
                                Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">
                                Contact
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">
                                Gender
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">
                                Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">
                                Registered
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {queues.length > 0 ? (
                            queues.map((patient) => (
                                <tr
                                    key={patient.id}
                                    className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    <td className="p-2 text-sm font-semibold whitespace-nowrap text-blue-900 dark:text-blue-400">
                                        {'AMH-'}
                                        {patient.token}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                            {patient.first_name}{' '}
                                            {patient.last_name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            <div>{patient.email}</div>
                                            <div>{patient.phone}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500 capitalize dark:text-gray-400">
                                        {patient.gender}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span
                                            className={`rounded-full px-2 py-1 text-xs font-medium ${
                                                patient.status === 'active'
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                            }`}
                                        >
                                            {'Pending'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                                        {new Date(
                                            patient.created_at,
                                        ).toLocaleDateString()}
                                    </td>
                                    <td className="flex gap-2 px-6 py-4 text-right text-sm font-medium whitespace-nowrap">
                                       
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td
                                    colSpan={7}
                                    className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                                >
                                    <div className="flex flex-col items-center">
                                        <svg
                                            className="mb-3 h-12 w-12 text-gray-400"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                            />
                                        </svg>
                                        <p className="text-lg font-medium">
                                            No patients found
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
