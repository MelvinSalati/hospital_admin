// components/register/tabs/DemographicsTab.tsx

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DemographicsTabProps {
  data: any;
  setData: (key: string, value: any) => void;
  errors: Record<string, string>;
}

export default function DemographicsTab({ data, setData, errors }: DemographicsTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="first_name" className="text-sm font-medium text-gray-700">
            First Name *
          </Label>
          <Input
            id="first_name"
            type="text"
            value={data.first_name}
            onChange={(e) => setData('first_name', e.target.value)}
            className="mt-1"
            placeholder="Enter first name"
          />
          {errors.first_name && (
            <p className="mt-1 text-sm text-red-600">{errors.first_name}</p>
          )}
        </div>

        <div>
          <Label htmlFor="surname" className="text-sm font-medium text-gray-700">
            Surname *
          </Label>
          <Input
            id="surname"
            type="text"
            value={data.surname}
            onChange={(e) => setData('surname', e.target.value)}
            className="mt-1"
            placeholder="Enter surname"
          />
          {errors.surname && (
            <p className="mt-1 text-sm text-red-600">{errors.surname}</p>
          )}
        </div>

        <div>
          <Label htmlFor="date_of_birth" className="text-sm font-medium text-gray-700">
            Date of Birth *
          </Label>
          <Input
            id="date_of_birth"
            type="date"
            value={data.date_of_birth}
            onChange={(e) => setData('date_of_birth', e.target.value)}
            className="mt-1"
          />
          {errors.date_of_birth && (
            <p className="mt-1 text-sm text-red-600">{errors.date_of_birth}</p>
          )}
        </div>

        <div>
          <Label htmlFor="gender" className="text-sm font-medium text-gray-700">
            Gender *
          </Label>
          <Select
            value={data.gender}
            onValueChange={(value) => setData('gender', value)}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          {errors.gender && (
            <p className="mt-1 text-sm text-red-600">{errors.gender}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="address" className="text-sm font-medium text-gray-700">
            Address
          </Label>
          <Textarea
            id="address"
            value={data.address}
            onChange={(e) => setData('address', e.target.value)}
            rows={3}
            className="mt-1"
            placeholder="Enter full address"
          />
          {errors.address && (
            <p className="mt-1 text-sm text-red-600">{errors.address}</p>
          )}
        </div>
      </div>
    </div>
  );
}