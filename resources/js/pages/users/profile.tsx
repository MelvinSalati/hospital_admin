import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { useState, useRef } from 'react';
import { 
    User, Key, Mail, Upload, Save, Phone, AtSign, 
    X, Plus, Trash2, Edit2, Check, AlertCircle 
} from 'lucide-react';

interface Contact {
    id: string;
    type: 'email' | 'phone';
    value: string;
    label: string;
    isPrimary?: boolean;
}

export default function Account() {
    const tabs = [
        { id: 1, title: 'Profile Management', name: 'account', icon: User },
        { id: 2, title: 'Password Management', name: 'password', icon: Key },
        { id: 3, title: 'Contact Management', name: 'contacts', icon: Mail },
    ];

    const [activeTab, setActiveTab] = useState('account');
    const [profilePicture, setProfilePicture] = useState<string | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [formData, setFormData] = useState({
        username: '',
        firstName: '',
        surname: '',
        password: '',
        passwordConfirm: '',
    });

    const [contacts, setContacts] = useState<Contact[]>([
        { id: '1', type: 'email', value: 'john.doe@example.com', label: 'Personal Email', isPrimary: true },
        { id: '2', type: 'phone', value: '+1 234 567 8900', label: 'Mobile', isPrimary: true },
    ]);

    const [editingContact, setEditingContact] = useState<string | null>(null);
    const [newContact, setNewContact] = useState({ type: 'email', value: '', label: '' });
    const [showAddContact, setShowAddContact] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleProfilePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        setUploadError(null);

        if (file) {
            // Validate file type
            const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                setUploadError('Please upload a valid image file (JPEG, PNG, or WebP)');
                return;
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                setUploadError('File size must be less than 5MB');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setProfilePicture(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeProfilePicture = () => {
        setProfilePicture(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleAddContact = () => {
        if (newContact.value && newContact.label) {
            const newId = Date.now().toString();
            setContacts([
                ...contacts,
                {
                    id: newId,
                    type: newContact.type as 'email' | 'phone',
                    value: newContact.value,
                    label: newContact.label,
                    isPrimary: false,
                }
            ]);
            setNewContact({ type: 'email', value: '', label: '' });
            setShowAddContact(false);
        }
    };

    const handleUpdateContact = (id: string, field: keyof Contact, value: string) => {
        setContacts(contacts.map(contact => 
            contact.id === id ? { ...contact, [field]: value } : contact
        ));
    };

    const handleDeleteContact = (id: string) => {
        setContacts(contacts.filter(contact => contact.id !== id));
    };

    const handleSetPrimaryContact = (id: string, type: 'email' | 'phone') => {
        setContacts(contacts.map(contact => {
            if (contact.type === type) {
                return { ...contact, isPrimary: contact.id === id };
            }
            return contact;
        }));
    };

    const handleSubmit = (e: React.FormEvent, formType: string) => {
        e.preventDefault();
        switch (formType) {
            case 'account':
                console.log('Profile updated:', { ...formData, profilePicture });
                break;
            case 'password':
                if (formData.password !== formData.passwordConfirm) {
                    alert('Passwords do not match!');
                    return;
                }
                console.log('Password updated:', formData.password);
                break;
            case 'contacts':
                console.log('Contacts updated:', contacts);
                break;
        }
        // Show success message
        alert(`${formType.charAt(0).toUpperCase() + formType.slice(1)} updated successfully!`);
    };

    const renderTabs = () => {
        switch (activeTab) {
            case 'account':
                return (
                    <form onSubmit={(e) => handleSubmit(e, 'account')} className="space-y-6">
                        {/* Profile Picture Section */}
                        <div className="flex items-start gap-8 p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                            <div className="relative group">
                                <div className="relative">
                                    {profilePicture ? (
                                        <img
                                            src={profilePicture}
                                            alt="Profile"
                                            className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-lg"
                                        />
                                    ) : (
                                        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center shadow-inner">
                                            <User className="w-12 h-12 text-gray-600" />
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute bottom-0 right-0 bg-black text-white p-2 rounded-full shadow-lg hover:bg-gray-800 transition-all"
                                    >
                                        <Upload className="w-4 h-4" />
                                    </button>
                                    {profilePicture && (
                                        <button
                                            type="button"
                                            onClick={removeProfilePicture}
                                            className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600 transition-all"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={handleProfilePictureUpload}
                                    className="hidden"
                                />
                            </div>
                            
                            <div className="flex-1 space-y-3">
                                <div>
                                    <h3 className="font-semibold text-gray-900">Profile Picture</h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Upload a profile picture (JPEG, PNG, or WebP, max 5MB)
                                    </p>
                                    {uploadError && (
                                        <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                                            <AlertCircle className="w-4 h-4" />
                                            {uploadError}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Personal Information */}
                        <div className="space-y-4 p-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Username
                                </label>
                                <input
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                                    placeholder="Enter username"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        First Name
                                    </label>
                                    <input
                                        type="text"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                                        placeholder="First name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Surname
                                    </label>
                                    <input
                                        type="text"
                                        name="surname"
                                        value={formData.surname}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                                        placeholder="Surname"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end px-6 pb-6">
                            <Button type="submit" className="gap-2 bg-black hover:bg-gray-800">
                                <Save className="w-4 h-4" />
                                Save Changes
                            </Button>
                        </div>
                    </form>
                );

            case 'password':
                return (
                    <form onSubmit={(e) => handleSubmit(e, 'password')} className="space-y-6 p-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    New Password
                                </label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                                    placeholder="Enter new password"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Confirm Password
                                </label>
                                <input
                                    type="password"
                                    name="passwordConfirm"
                                    value={formData.passwordConfirm}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                                    placeholder="Confirm new password"
                                />
                            </div>
                        </div>

                        <div className="flex justify-start">
                            <Button type="submit" className="gap-2 bg-black hover:bg-gray-800">
                                <Save className="w-4 h-4" />
                                Update Password
                            </Button>
                        </div>
                    </form>
                );

            case 'contacts':
                return (
                    <form onSubmit={(e) => handleSubmit(e, 'contacts')} className="space-y-6 p-6">
                        {/* Contacts List */}
                        <div className="space-y-4">
                            {contacts.map((contact) => (
                                <div
                                    key={contact.id}
                                    className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-all"
                                >
                                    <div className="flex-shrink-0">
                                        {contact.type === 'email' ? (
                                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                <AtSign className="w-5 h-5 text-blue-600" />
                                            </div>
                                        ) : (
                                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                                <Phone className="w-5 h-5 text-green-600" />
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="flex-1">
                                        {editingContact === contact.id ? (
                                            <div className="space-y-2">
                                                <input
                                                    type="text"
                                                    value={contact.label}
                                                    onChange={(e) => handleUpdateContact(contact.id, 'label', e.target.value)}
                                                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                                                    placeholder="Label"
                                                />
                                                <input
                                                    type={contact.type === 'email' ? 'email' : 'tel'}
                                                    value={contact.value}
                                                    onChange={(e) => handleUpdateContact(contact.id, 'value', e.target.value)}
                                                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                                                    placeholder={contact.type === 'email' ? 'Email' : 'Phone number'}
                                                />
                                            </div>
                                        ) : (
                                            <>
                                                <div className="font-medium text-gray-900">{contact.label}</div>
                                                <div className="text-sm text-gray-600">{contact.value}</div>
                                            </>
                                        )}
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        {contact.isPrimary && (
                                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                                                Primary
                                            </span>
                                        )}
                                        {!contact.isPrimary && contact.type === 'email' && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleSetPrimaryContact(contact.id, 'email')}
                                                className="text-xs"
                                            >
                                                Set as Primary
                                            </Button>
                                        )}
                                        {!contact.isPrimary && contact.type === 'phone' && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleSetPrimaryContact(contact.id, 'phone')}
                                                className="text-xs"
                                            >
                                                Set as Primary
                                            </Button>
                                        )}
                                        
                                        {editingContact === contact.id ? (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setEditingContact(null)}
                                                className="text-green-600"
                                            >
                                                <Check className="w-4 h-4" />
                                            </Button>
                                        ) : (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setEditingContact(contact.id)}
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                        
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteContact(contact.id)}
                                            className="text-red-600 hover:text-red-700"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Add New Contact */}
                        {showAddContact ? (
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="space-y-3">
                                    <select
                                        value={newContact.type}
                                        onChange={(e) => setNewContact({ ...newContact, type: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    >
                                        <option value="email">Email Address</option>
                                        <option value="phone">Phone Number</option>
                                    </select>
                                    <input
                                        type="text"
                                        placeholder="Label (e.g., Work, Personal)"
                                        value={newContact.label}
                                        onChange={(e) => setNewContact({ ...newContact, label: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    />
                                    <input
                                        type={newContact.type === 'email' ? 'email' : 'tel'}
                                        placeholder={newContact.type === 'email' ? 'Email address' : 'Phone number'}
                                        value={newContact.value}
                                        onChange={(e) => setNewContact({ ...newContact, value: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    />
                                    <div className="flex gap-2">
                                        <Button type="button" onClick={handleAddContact} className="flex-1">
                                            Add Contact
                                        </Button>
                                        <Button type="button" variant="outline" onClick={() => setShowAddContact(false)}>
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowAddContact(true)}
                                className="w-full gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Add New Contact
                            </Button>
                        )}

                        <div className="flex justify-end pt-4">
                            <Button type="submit" className="gap-2 bg-black hover:bg-gray-800">
                                <Save className="w-4 h-4" />
                                Save Contacts
                            </Button>
                        </div>
                    </form>
                );

            default:
                return null;
        }
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Account Management', href: '#' },
                { title: 'Profile', href: '#' },
            ]}
        >
            <div className="max-w-5xl ">
                {/* Header */}
                <div className="p-2 border-b">
                    <h1 className="text-2xl font-bold">Personal Information</h1>
                    <p className="text-gray-300 mt-1">Manage your account settings and preferences</p>
                </div>

                {/* Main Content */}
                <div className="flex bg-white rounded-b-xl shadow-lg overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
                        <nav className="space-y-2">
                            {tabs.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <Button
                                        key={item.id}
                                        onClick={() => setActiveTab(item.name)}
                                        variant="ghost"
                                        className={`w-full justify-start gap-3 transition-all ${
                                            activeTab === item.name
                                                ? 'bg-black text-white hover:bg-gray-800'
                                                : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {item.title}
                                    </Button>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-h-[600px]">
                        {renderTabs()}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}