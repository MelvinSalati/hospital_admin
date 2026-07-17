// antenatalTabs.tsx
import { Baby, AlertTriangle, Stethoscope, ClipboardList } from 'lucide-react';

const antenatalTabs = [
    { key: 'pregnancy', title: 'Pregnancy', icon: <Baby size={16} /> },
    {
        key: 'risk',
        title: 'Risk Assessment',
        icon: <ClipboardList size={16} />,
    },
    {
        key: 'examination',
        title: 'Physical Examination',
        icon: <Stethoscope size={16} />,
    },
    { key: 'danger', title: 'Danger Signs', icon: <AlertTriangle size={16} /> },
];

export default antenatalTabs;
