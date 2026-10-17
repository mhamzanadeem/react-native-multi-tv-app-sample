import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';

interface MenuContextType {
  isOpen: boolean;
  openRequestId: number;
  requestOpen: () => void;
  toggleMenu: (isOpen: boolean) => void;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export const MenuProvider: React.FC<{ children: React.ReactNode; initiallyOpen?: boolean }> = ({
  children,
  initiallyOpen = true,
}) => {
  const [isOpen, setIsOpen] = useState(initiallyOpen);

  const [openRequestId, setOpenRequestId] = useState(0);
  const requestOpen = useCallback(() => setOpenRequestId((id) => id + 1), []);
  const value = useMemo(
    () => ({
      isOpen,
      openRequestId,
      requestOpen,
      toggleMenu: setIsOpen,
    }),
    [isOpen, openRequestId, requestOpen],
  );

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
};

export const useMenuContext = (): MenuContextType => {
  const context = useContext(MenuContext);
  if (context === undefined) {
    throw new Error('useMenuContext must be used within a MenuProvider');
  }
  return context;
};
