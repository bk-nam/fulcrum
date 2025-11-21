import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="p-8">
        {children}
      </div>
    </div>
  );
};

export default Layout;
