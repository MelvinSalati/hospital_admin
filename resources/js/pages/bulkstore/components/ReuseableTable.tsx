import React, { useState, useMemo, useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface Column<T = any> {
    id: keyof T | string;
    label: string;
    minWidth?: number;
    align?: 'right' | 'left' | 'center';
    format?: (value: any, row: T) => React.ReactNode;
    sortable?: boolean;
    filterable?: boolean;
    filterType?: 'text' | 'select' | 'status';
    filterOptions?: { value: string | number; label: string }[];
    statusColors?: Record<
        string,
        | 'default'
        | 'primary'
        | 'secondary'
        | 'error'
        | 'info'
        | 'success'
        | 'warning'
    >;
}

export interface Action<T = any> {
    label: string;
    icon?: React.ReactNode;
    color?:
        | 'primary'
        | 'secondary'
        | 'error'
        | 'info'
        | 'success'
        | 'warning'
        | 'inherit';
    variant?: 'text' | 'outlined' | 'contained';
    onClick: (row: T) => void;
    show?: (row: T) => boolean;
}

export interface TableProps<T = any> {
    columns: Column<T>[];
    data: T[];
    actions?: Action<T>[];
    title?: string;
    rowsPerPageOptions?: number[];
    defaultRowsPerPage?: number;
    defaultOrderBy?: keyof T | string;
    defaultOrder?: 'asc' | 'desc';
    onRowClick?: (row: T) => void;
    loading?: boolean;
    emptyMessage?: string;
    filterPlaceholder?: string;
    statusFilterKey?: string;
    statusOptions?: { value: string | number; label: string }[];
}

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
    borderRadius: theme.spacing(2),
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    overflow: 'auto',
    '& .MuiTableHead-root .MuiTableCell-root': {
        backgroundColor: theme.palette.grey[50],
        fontWeight: 600,
        color: theme.palette.text.secondary,
        borderBottom: `2px solid ${theme.palette.divider}`,
    },
    '& .MuiTableRow-root:hover': {
        backgroundColor: theme.palette.action.hover,
    },
    '& .MuiTableRow-root.Mui-selected': {
        backgroundColor: theme.palette.action.selected,
    },
}));

const FilterBar = styled(Box)(({ theme }) => ({
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing(2),
    padding: theme.spacing(2, 0),
    borderBottom: `1px solid ${theme.palette.divider}`,
    marginBottom: theme.spacing(2),
}));

const TitleTypography = styled(Typography)(({ theme }) => ({
    fontWeight: 700,
    fontSize: '1.25rem',
    color: theme.palette.text.primary,
    marginRight: 'auto',
}));

const ActionsContainer = styled(Box)(({ theme }) => ({
    display: 'flex',
    gap: theme.spacing(1),
    marginLeft: 'auto',
}));

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ReusableTable<T extends Record<string, any>>({
    columns,
    data,
    actions = [],
    title,
    rowsPerPageOptions = [5, 10, 25, 50],
    defaultRowsPerPage = 10,
    defaultOrderBy,
    defaultOrder = 'asc',
    onRowClick,
    loading = false,
    emptyMessage = 'No data available',
    filterPlaceholder = 'Search...',
    statusFilterKey,
    statusOptions = [],
}: TableProps<T>) {
    // ===== STATE =====
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);
    const [orderBy, setOrderBy] = useState<string | keyof T | undefined>(
        defaultOrderBy,
    );
    const [order, setOrder] = useState<'asc' | 'desc'>(defaultOrder);
    const [globalFilter, setGlobalFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState<string | number>('');
    const [selectedRow, setSelectedRow] = useState<T | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState<React.ReactNode | null>(
        null,
    );

    // ===== FILTERING & SORTING =====
    const filteredData = useMemo(() => {
        let result = [...data];

        // Global text filter
        if (globalFilter.trim()) {
            const searchTerm = globalFilter.toLowerCase().trim();
            result = result.filter((row) =>
                columns.some((col) => {
                    const value = row[col.id as keyof T];
                    if (value == null) return false;
                    return String(value).toLowerCase().includes(searchTerm);
                }),
            );
        }

        // Status filter
        if (statusFilter && statusFilterKey) {
            result = result.filter((row) => {
                const status = row[statusFilterKey as keyof T];
                return (
                    status != null && String(status) === String(statusFilter)
                );
            });
        }

        // Sorting
        if (orderBy) {
            result.sort((a, b) => {
                const aVal = a[orderBy as keyof T];
                const bVal = b[orderBy as keyof T];

                if (aVal == null && bVal == null) return 0;
                if (aVal == null) return order === 'asc' ? -1 : 1;
                if (bVal == null) return order === 'asc' ? 1 : -1;

                if (typeof aVal === 'number' && typeof bVal === 'number') {
                    return order === 'asc' ? aVal - bVal : bVal - aVal;
                }

                const aStr = String(aVal).toLowerCase();
                const bStr = String(bVal).toLowerCase();
                return order === 'asc'
                    ? aStr.localeCompare(bStr)
                    : bStr.localeCompare(aStr);
            });
        }

        return result;
    }, [
        data,
        columns,
        globalFilter,
        statusFilter,
        statusFilterKey,
        orderBy,
        order,
    ]);

    // ===== PAGINATION =====
    const paginatedData = useMemo(() => {
        const start = page * rowsPerPage;
        return filteredData.slice(start, start + rowsPerPage);
    }, [filteredData, page, rowsPerPage]);

    const totalCount = filteredData.length;
    const emptyRows =
        page > 0 ? Math.max(0, (1 + page) * rowsPerPage - totalCount) : 0;

    const handleChangePage = useCallback((_: unknown, newPage: number) => {
        setPage(newPage);
    }, []);

    const handleChangeRowsPerPage = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
        },
        [],
    );

    const handleSort = useCallback(
        (columnId: string | keyof T) => {
            const isAsc = orderBy === columnId && order === 'asc';
            setOrder(isAsc ? 'desc' : 'asc');
            setOrderBy(columnId);
        },
        [order, orderBy],
    );

    const handleGlobalFilterChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            setGlobalFilter(e.target.value);
            setPage(0);
        },
        [],
    );

    const handleStatusFilterChange = useCallback(
        (e: SelectChangeEvent<string | number>) => {
            setStatusFilter(e.target.value);
            setPage(0);
        },
        [],
    );

    // ===== ACTION HANDLERS =====
    const handleActionClick = useCallback((action: Action<T>, row: T) => {
        // If the action returns a React node, we can open a modal
        // This is a simple pattern - you can customize as needed
        action.onClick(row);
    }, []);

    const renderActionButton = useCallback(
        (action: Action<T>, row: T) => {
            if (action.show && !action.show(row)) return null;

            return (
                <Button
                    key={action.label}
                    size="small"
                    variant={action.variant || 'text'}
                    color={action.color || 'primary'}
                    startIcon={action.icon}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleActionClick(action, row);
                    }}
                    sx={{ minWidth: 'auto', textTransform: 'none' }}
                >
                    {action.label}
                </Button>
            );
        },
        [handleActionClick],
    );

    // ===== RENDER CELL =====
    const renderCell = useCallback((row: T, column: Column<T>) => {
        const value = row[column.id as keyof T];

        if (column.format) {
            return column.format(value, row);
        }

        // Status chip rendering
        if (column.filterType === 'status' && column.statusColors) {
            const color = column.statusColors[String(value)] || 'default';
            return <Chip label={value || '-'} size="small" color={color} />;
        }

        if (value == null) return '-';
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        return String(value);
    }, []);

    // ==========================================================================
    // RENDER
    // ==========================================================================

    return (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
            {/* Header */}
            <FilterBar>
                {title && (
                    <TitleTypography variant="h6">{title}</TitleTypography>
                )}

                {/* Global Search */}
                <TextField
                    placeholder={filterPlaceholder}
                    size="small"
                    value={globalFilter}
                    onChange={handleGlobalFilterChange}
                    sx={{ minWidth: 200, flex: 1 }}
                    InputProps={{
                        startAdornment: (
                            <Box
                                component="span"
                                sx={{ mr: 1, color: 'text.secondary' }}
                            >
                                🔍
                            </Box>
                        ),
                    }}
                />

                {/* Status Filter */}
                {statusFilterKey && statusOptions.length > 0 && (
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Status</InputLabel>
                        <Select
                            value={statusFilter}
                            onChange={handleStatusFilterChange}
                            label="Status"
                        >
                            <MenuItem value="">All</MenuItem>
                            {statusOptions.map((opt) => (
                                <MenuItem
                                    key={String(opt.value)}
                                    value={opt.value}
                                >
                                    {opt.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                )}

                {/* Actions passed from parent can also be placed here as global actions */}
                <ActionsContainer>
                    {/* You can add global action buttons here if needed */}
                </ActionsContainer>
            </FilterBar>

            {/* Table */}
            <StyledTableContainer>
                <Table stickyHeader size="medium">
                    <TableHead>
                        <TableRow>
                            {columns.map((column) => (
                                <TableCell
                                    key={String(column.id)}
                                    align={column.align || 'left'}
                                    style={{ minWidth: column.minWidth || 100 }}
                                    sortDirection={
                                        orderBy === column.id ? order : false
                                    }
                                >
                                    {column.sortable !== false ? (
                                        <TableSortLabel
                                            active={orderBy === column.id}
                                            direction={
                                                orderBy === column.id
                                                    ? order
                                                    : 'asc'
                                            }
                                            onClick={() =>
                                                handleSort(column.id)
                                            }
                                        >
                                            {column.label}
                                        </TableSortLabel>
                                    ) : (
                                        column.label
                                    )}
                                </TableCell>
                            ))}
                            {actions.length > 0 && (
                                <TableCell
                                    align="center"
                                    style={{ minWidth: 120 }}
                                >
                                    Actions
                                </TableCell>
                            )}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell
                                    colSpan={
                                        columns.length +
                                        (actions.length > 0 ? 1 : 0)
                                    }
                                    align="center"
                                    sx={{ py: 8 }}
                                >
                                    <Typography color="text.secondary">
                                        Loading...
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : paginatedData.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={
                                        columns.length +
                                        (actions.length > 0 ? 1 : 0)
                                    }
                                    align="center"
                                    sx={{ py: 8 }}
                                >
                                    <Typography color="text.secondary">
                                        {emptyMessage}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedData.map((row, index) => (
                                <TableRow
                                    key={index}
                                    hover
                                    onClick={
                                        onRowClick
                                            ? () => onRowClick(row)
                                            : undefined
                                    }
                                    sx={{
                                        cursor: onRowClick
                                            ? 'pointer'
                                            : 'default',
                                    }}
                                >
                                    {columns.map((column) => (
                                        <TableCell
                                            key={String(column.id)}
                                            align={column.align || 'left'}
                                        >
                                            {renderCell(row, column)}
                                        </TableCell>
                                    ))}
                                    {actions.length > 0 && (
                                        <TableCell align="center">
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    justifyContent: 'center',
                                                    gap: 0.5,
                                                    flexWrap: 'wrap',
                                                }}
                                            >
                                                {actions.map((action) =>
                                                    renderActionButton(
                                                        action,
                                                        row,
                                                    ),
                                                )}
                                            </Box>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        )}
                        {emptyRows > 0 && (
                            <TableRow style={{ height: 53 * emptyRows }}>
                                <TableCell
                                    colSpan={
                                        columns.length +
                                        (actions.length > 0 ? 1 : 0)
                                    }
                                />
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </StyledTableContainer>

            {/* Pagination */}
            <TablePagination
                rowsPerPageOptions={rowsPerPageOptions}
                component="div"
                count={totalCount}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="Rows per page:"
                showFirstButton
                showLastButton
            />

            {/* Modal for actions (optional) */}
            <Dialog
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Action</DialogTitle>
                <DialogContent dividers>{modalContent}</DialogContent>
                <DialogActions>
                    <Button onClick={() => setModalOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
}

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

// Example data type
interface User {
    id: number;
    name: string;
    email: string;
    role: 'Admin' | 'User' | 'Moderator';
    status: 'active' | 'inactive' | 'pending';
    lastActive: string;
}

// Example columns definition
const exampleColumns: Column<User>[] = [
    { id: 'id', label: 'ID', minWidth: 60, sortable: true },
    { id: 'name', label: 'Name', minWidth: 150, sortable: true },
    { id: 'email', label: 'Email', minWidth: 200 },
    {
        id: 'role',
        label: 'Role',
        minWidth: 120,
        filterType: 'select',
        filterOptions: [
            { value: 'Admin', label: 'Admin' },
            { value: 'User', label: 'User' },
            { value: 'Moderator', label: 'Moderator' },
        ],
    },
    {
        id: 'status',
        label: 'Status',
        minWidth: 120,
        filterType: 'status',
        statusColors: {
            active: 'success',
            inactive: 'error',
            pending: 'warning',
        },
    },
    {
        id: 'lastActive',
        label: 'Last Active',
        minWidth: 150,
        format: (value) => new Date(value).toLocaleDateString(),
    },
];

// Example actions
const exampleActions: Action<User>[] = [
    {
        label: 'Edit',
        color: 'primary',
        variant: 'outlined',
        onClick: (row) => {
            console.log('Edit:', row);
            // Open modal or navigate
        },
    },
    {
        label: 'Delete',
        color: 'error',
        variant: 'text',
        onClick: (row) => {
            console.log('Delete:', row);
            // Show confirmation dialog
        },
        show: (row) => row.status !== 'active', // Only show for non-active users
    },
    {
        label: 'View',
        color: 'info',
        variant: 'text',
        onClick: (row) => {
            console.log('View:', row);
            // Show details in modal
        },
    },
];

// Example usage in a parent component
export function ExampleUsage() {
    const [users] = useState<User[]>([
        {
            id: 1,
            name: 'John Doe',
            email: 'john@example.com',
            role: 'Admin',
            status: 'active',
            lastActive: '2024-01-15T10:30:00',
        },
        {
            id: 2,
            name: 'Jane Smith',
            email: 'jane@example.com',
            role: 'User',
            status: 'inactive',
            lastActive: '2024-01-10T14:20:00',
        },
        {
            id: 3,
            name: 'Bob Johnson',
            email: 'bob@example.com',
            role: 'Moderator',
            status: 'pending',
            lastActive: '2024-01-12T09:15:00',
        },
        {
            id: 4,
            name: 'Alice Brown',
            email: 'alice@example.com',
            role: 'User',
            status: 'active',
            lastActive: '2024-01-14T16:45:00',
        },
        {
            id: 5,
            name: 'Charlie Wilson',
            email: 'charlie@example.com',
            role: 'User',
            status: 'active',
            lastActive: '2024-01-13T11:00:00',
        },
    ]);

    return (
        <ReusableTable
            columns={exampleColumns}
            data={users}
            actions={exampleActions}
            title="User Management"
            statusFilterKey="status"
            statusOptions={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'pending', label: 'Pending' },
            ]}
            onRowClick={(row) => console.log('Row clicked:', row)}
            rowsPerPageOptions={[5, 10, 25]}
            defaultRowsPerPage={5}
            defaultOrderBy="name"
            defaultOrder="asc"
        />
    );
}

export default ReusableTable;
