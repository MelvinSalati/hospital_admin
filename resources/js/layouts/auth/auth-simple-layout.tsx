import { Link } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';
import Img from '../../../assets/img/logo.jpg';
import bg from './pill.jpg';
import wallpaper from './pills.jpg';
export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <>
            {/* <div className="flex gap-4 bg-gradient-to-r from-white via-blue-50 to-blue-100 p-2 slide-in-from-left-0">
                <div>
                    <img
                        src="https://thumb.wikimedia.org/wikipedia/commons/thumb/2/28/Coat_of_arms_of_Zambia.svg/960px-Coat_of_arms_of_Zambia.svg.png?utm_source=en.wikipedia.org&utm_campaign=imageinfo&utm_content=thumbnail"
                        width="50px"
                        alt="Zambia Coat of Arms"
                    />
                </div>

                <div>
                    <div className="font-semibold text-slate-800">
                        Altaf Memorial Hospital
                    </div>
                    <h3 className="font-medium text-blue-500">
                        Electronic Health Record (EHR)
                    </h3>
                </div>
            </div> */}
            {/* <div className="bg-gradient-r flex gap-4 to-15% p-2 slide-in-from-left-0">
                <div>
                    <img
                        src="https://thumb.wikimedia.org/wikipedia/commons/thumb/2/28/Coat_of_arms_of_Zambia.svg/960px-Coat_of_arms_of_Zambia.svg.png?utm_source=en.wikipedia.org&utm_campaign=imageinfo&utm_content=thumbnail"
                        width="50px"
                    />
                </div>
                <div>
                    ALtaf Memorial Hospital
                    <h3 className="text-blue-400">
                        Electronic Health Record (EHR)
                    </h3>
                </div>
            </div> */}
            <div
                // style={{ background: '#2EC4E2' }}
                style={{ backgroundImage: `url(${bg})` }}
                className="bg-cove flex min-h-svh flex-col items-center justify-center bg-transparent bg-center md:p-1"
            >
                <div className="w-full max-w-4xl rounded-2xl shadow-2xl">
                    {/* Middle Section - Form and Image side by side with border */}
                    {/* Top Section - Title */}
                    {title && (
                        <div className="text-gary-600 rounded-t-2xl border-b bg-white p-4 text-center text-2xl font-bold">
                            {title}
                        </div>
                    )}
                    <div className="flex flex-col items-center rounded-b-2xl bg-white opacity-98 md:flex-row">
                        {/* Right Side - Hospital Image */}
                        <div className="w-full flex-1 pl-0 md:pl-8">
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
                                    <div className="mt-4 text-center">
                                        <h2 className="text-xl font-semibold text-gray-800">
                                            Altaf Memorial Hospital
                                        </h2>
                                    </div>
                                </center>

                                {/* Motto/Saving Humanity */}
                                <div className="mt-2 text-center md:text-center">
                                    <p className="font-medium text-[#2596be]">
                                        Healing hearts,Saving Humanity
                                    </p>
                                </div>
                            </div>
                        </div>
                        {/* Left Side - Form with border */}
                        <div className="w-full flex-1 border-r-0 border-l px-10 pr-0 md:border-r md:pr-8">
                            <div className="py-4">{children}</div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
