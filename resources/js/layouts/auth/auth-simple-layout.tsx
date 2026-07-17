import { Link } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';
import Img from '../../../assets/img/IMG-20260318-WA0017.jpg'
import bg from './19373.jpg'
export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
       <div
    style={{ backgroundImage: `url(${bg})` }}
    className="flex min-h-svh flex-col items-center justify-center bg-cover bg-center p-6 md:p-1"
>
            <div className="w-full max-w-4xl shadow-2xl rounded-2xl">
                {/* Middle Section - Form and Image side by side with border */}
                  {/* Top Section - Title */}
                {title && (
                    <div className="bg-white text-center font-bold text-2xl border-b rounded-t-2xl text-gary-600 p-4">
                        {title}
                    </div>
                )}
                <div className="flex flex-col md:flex-row items-center bg-white rounded-b-2xl opacity-98">
                    {/* Right Side - Hospital Image */}
                    <div className="flex-1 w-full pl-0 md:pl-8">
                        <div className="">
                            {/* Hospital Logo Image */}
                           <center>
                             <div className="">
                                <img
                                    src={Img}
                                    alt="Altaf Memorial Hospital"
                                    className="h-28 w-auto object-contain"
                                />
                            </div>
                               {/* Hospital Name */}
                            <div className="mt-4 text-center ">
                                <h2 className="text-xl font-semibold text-gray-800">
                                    Altaf Memorial Hospital
                                </h2>
                            </div>
                           </center>



                            {/* Motto/Saving Humanity */}
                            <div className="mt-2 text-center md:text-center">
                                <p className="text-[#2596be] font-medium">
                                    Healing hearts,Saving Humanity
                                </p>
                            </div>
                        </div>
                    </div>
                        {/* Left Side - Form with border */}
                    <div className="flex-1 w-full pr-0 md:pr-8 border-r-0 md:border-r border-l px-10">
                        <div className="py-4">
                            {children}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
