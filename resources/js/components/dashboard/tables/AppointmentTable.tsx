// components/dashboard/tables/AppointmentTable.tsx
import React from 'react';
import { DataTable } from './DataTable';
import { Badge } from '../../ui/badge';

interface Appointment {
    id: string;
    time: string;
    patient: string;
    type: string;
    status: 'checked-in' | 'waiting' | 'in-progress' | 'scheduled';
    room: string;
    urgent?: boolean;
}

const statusColors = {
    'checked-in': 'bg-green-100 text-green-700 dark:bg-green-900/20',
    'waiting': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20',
    'in-progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900/20',
    'scheduled': 'bg-gray-100 text-gray-700 dark:bg-gray-900/20'
};

interface AppointmentTableProps {
    appointments: Appointment[];
    title?: string;
    icon?: string;
    onAppointmentClick?: (appointment: Appointment) => void;
}

export const AppointmentTable: React.FC<AppointmentTableProps> = ({
    appointments,
    title = 'Today\'s Appointments',
    icon = '📋',
    onAppointmentClick
}) => {
    const columns = [
        {
            key: 'time',
            header: 'Time',
            render: (apt: Appointment) => (
                <div>
                    <div className="font-medium">{apt.time}</div>
                    <div className="text-xs text-gray-500">Room {apt.room}</div>
                </div>
            )
        },
        {
            key: 'patient',
            header: 'Patient',
            render: (apt: Appointment) => (
                <div>
                    <div className="flex items-center gap-2">
                        <span className="font-medium">{apt.patient}</span>
                        {apt.urgent && (
                            <Badge variant="destructive" size="sm">URGENT</Badge>
                        )}
                    </div>
                    <div className="text-sm text-gray-500">{apt.type}</div>
                </div>
            )
        },
        {
            key: 'status',
            header: 'Status',
            render: (apt: Appointment) => (
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[apt.status]}`}>
                    {apt.status}
                </span>
            )
        }
    ];

    return (
        <DataTable
            data={appointments}
            columns={columns}
            title={title}
            icon={icon}
            onRowClick={onAppointmentClick}
        />
    );
};