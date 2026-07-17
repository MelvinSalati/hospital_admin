'use client';

import React, { useState, useMemo } from 'react';
import {
    Search,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    MoreHorizontal,
    Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

// Example helper functions (customize as needed)
const getPriorityIcon = (priority?: string) => {
    // Return icon component or emoji
    switch (priority?.toLowerCase()) {
        case 'high':
            return '🔴';
        case 'medium':
            return '🟡';
        default:
            return '🟢';
    }
};

const getVisitStatusLabel = (status?: string) => {
    const label = status || 'Pending';
    let variant: 'default' | 'secondary' | 'destructive' | 'outline' =
        'default';

    if (status?.toLowerCase() === 'completed') variant = 'secondary';
    if (status?.toLowerCase() === 'in progress') variant = 'default';

    return <Badge variant={variant}>{label}</Badge>;
};

const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

interface Patient {
    id: string | number;
    token?: string;
    patient_name: string;
    priority?: string;
    visit_status?: string;
    registered_at?: string;
    // Add other fields as needed
}

interface PatientTableProps {
    patients: Patient[];
    baseUrl?: string; // Base URL for navigation (e.g., '/patients')
    onStartConsultation?: (patient: Patient) => void;
    onQuickConsultation?: (patient: Patient) => void;
    onViewProfile?: (patient: Patient) => void;
    onViewHistory?: (patient: Patient) => void;
}

const PatientTable: React.FC<PatientTableProps> = ({
    patients = [],
    baseUrl = '/',
    onStartConsultation,
    onQuickConsultation,
    onViewProfile,
    onViewHistory,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Filter patients
    const filteredPatients = useMemo(() => {
        if (!searchTerm.trim()) return patients;

        const term = searchTerm.toLowerCase().trim();
        return patients.filter(
            (patient) =>
                patient.patient_name?.toLowerCase().includes(term) ||
                patient.token?.toLowerCase().includes(term) ||
                patient.visit_status?.toLowerCase().includes(term) ||
                patient.priority?.toLowerCase().includes(term),
        );
    }, [patients, searchTerm]);

    // Pagination
    const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
    const paginatedPatients = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredPatients.slice(start, start + itemsPerPage);
    }, [filteredPatients, currentPage]);

    const handleGoToPatient = (patient: Patient) => {
        // Navigate to patient detail page
        window.location.href = `${baseUrl}/${patient.id}`;
    };

    const clearSearch = () => setSearchTerm('');

    // No results state
    if (filteredPatients.length === 0) {
        return (
            <div className="align-center mt-auto flex w-[990px] flex-col rounded-md bg-blue-50 py-12 text-center">
                <center>
                    <div className="mb-4 text-6xl">
                        <Users />
                    </div>
                    <h3 className="mb-1 text-xl font-medium">
                        {searchTerm
                            ? 'No patients match your search'
                            : 'No patients in queue'}
                    </h3>
                </center>
                <p className="mb-4 text-muted-foreground">
                    {searchTerm
                        ? 'Try adjusting your search terms'
                        : 'Patients will appear here once registered'}
                </p>
                {searchTerm && (
                    <Button variant="outline" onClick={clearSearch}>
                        Clear Search
                    </Button>
                )}
            </div>
        );
    }

    return (
        <div className="w-[990px] space-y-4">
            {/* Search Filter */}
            <div className="relative max-w-sm">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Search patients by name, token, or status..."
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1); // Reset to first page on search
                    }}
                    className="pl-10"
                />
            </div>

            {/* Table */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Token</TableHead>
                            <TableHead>Patient</TableHead>
                            <TableHead>Priority</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Registered</TableHead>
                            <TableHead className="text-right">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedPatients.map((patient) => (
                            <TableRow key={patient.id}>
                                <TableCell className="font-medium">
                                    {patient.token || `VIS-${patient.id}`}
                                </TableCell>

                                <TableCell>{patient.patient_name}</TableCell>

                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        {getPriorityIcon(patient.priority)}
                                        <span>
                                            {patient.priority || 'Routine'}
                                        </span>
                                    </div>
                                </TableCell>

                                <TableCell>
                                    {getVisitStatusLabel(patient.visit_status)}
                                </TableCell>

                                <TableCell>
                                    <div className="text-sm">
                                        <div>
                                            {formatTime(patient.registered_at)}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {formatDate(patient.registered_at)}
                                        </div>
                                    </div>
                                </TableCell>

                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        {/* Primary Action */}
                                        <Button
                                            onClick={() =>
                                                handleGoToPatient(patient)
                                            }
                                            className="bg-blue-600 text-white hover:bg-blue-700"
                                            size="sm"
                                        >
                                            Start Consultation
                                        </Button>

                                        {/* Quick Actions Dropdown */}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                >
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        handleGoToPatient(
                                                            patient,
                                                        )
                                                    }
                                                >
                                                    Start Consultation
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        onQuickConsultation?.(
                                                            patient,
                                                        )
                                                    }
                                                >
                                                    Quick Consultation Form
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        onViewProfile?.(patient)
                                                    }
                                                >
                                                    View Patient Profile
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        onViewHistory?.(patient)
                                                    }
                                                >
                                                    View Visit History
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                        {Math.min(
                            currentPage * itemsPerPage,
                            filteredPatients.length,
                        )}{' '}
                        of {filteredPatients.length} patients
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                        >
                            <ChevronsLeft className="h-4 w-4" />
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                setCurrentPage((prev) => Math.max(prev - 1, 1))
                            }
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <div className="px-4 py-2 text-sm">
                            Page {currentPage} of {totalPages}
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                setCurrentPage((prev) =>
                                    Math.min(prev + 1, totalPages),
                                )
                            }
                            disabled={currentPage === totalPages}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage === totalPages}
                        >
                            <ChevronsRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PatientTable;
