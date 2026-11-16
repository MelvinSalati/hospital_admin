import type { SVGAttributes } from 'react';
import logo from '../../assets/img/logo.jpg'
export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <><img src={logo}  alt="logo"/></>
    );
}
