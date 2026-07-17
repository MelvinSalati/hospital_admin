// components/register/tabs/ContactTab.tsx

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, Mail } from 'lucide-react';

interface ContactTabProps {
  data: any;
  setData: (key: string, value: any) => void;
  errors: Record<string, string>;
}

export default function ContactTab({ data, setData, errors }: ContactTabProps) {
  const validatePhone = (phone: string) => {
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,4}[-\s.]?[0-9]{1,9}$/;
    return phoneRegex.test(phone);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setData('mobile_phone_number', value);
    if (value && !validatePhone(value)) {
      // Set custom error if needed
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="mobile_phone_number" className="text-sm font-medium text-gray-700">
            Mobile Phone Number *
          </Label>
          <div className="relative mt-1">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="mobile_phone_number"
              type="tel"
              value={data.mobile_phone_number}
              onChange={handlePhoneChange}
              className="pl-10"
              placeholder="+1 234 567 8900"
            />
          </div>
          {errors.mobile_phone_number && (
            <p className="mt-1 text-sm text-red-600">{errors.mobile_phone_number}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Include country code (e.g., +1 for US)
          </p>
        </div>

        <div>
          <Label htmlFor="email" className="text-sm font-medium text-gray-700">
            Email Address *
          </Label>
          <div className="relative mt-1">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="email"
              type="email"
              value={data.email}
              onChange={(e) => setData('email', e.target.value)}
              className="pl-10"
              placeholder="john.doe@example.com"
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Your email and phone number will be used for account verification and important notifications.
        </p>
      </div>
    </div>
  );
}