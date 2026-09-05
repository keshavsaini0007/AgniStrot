import { Outlet } from 'react-router-dom';

export const PublicLayout = () => {
  return (
    <div className="min-h-screen bg-[#0B0D0E]">
      <Outlet />
    </div>
  );
};