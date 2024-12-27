import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom'
import { AppState } from '../../store';

export const PrivateRoutes = () => {
    const { authenticated } = useSelector((state: AppState) => state.account);
    return (
        authenticated ? <Outlet/> : <Navigate to='/login'/>
    )
}