import '@resources/style/react/ui/sidebar.scss';
import cx from 'classnames';
import React, { useState } from 'react';

const SidebarImpl: React.FC = ({ children }) => {
  const [expandedChildren, setExpandedChildren] = useState<boolean[]>(
    new Array(React.Children.count(children)).fill(false)
  );

  const newChildren = React.Children.map(children, (child, index) => {
    if (!React.isValidElement(child)) return child;

    const isOpen = expandedChildren[index];
    const onOpen = () => {
      const newExpandedChildren = [...expandedChildren];
      newExpandedChildren[index] = true;
      setExpandedChildren(newExpandedChildren);
    };

    const onClose = () => {
      const newExpandedChildren = [...expandedChildren];
      newExpandedChildren[index] = false;
      setExpandedChildren(newExpandedChildren);
    };

    const newChild = React.cloneElement(child, {
      onOpen,
      onClose,
      isOpen,
    });

    return newChild;
  });

  return (
    <div id='reduct-sidebar'>
      {newChildren}
    </div>
  );
};

interface SidebarSectionProps {
  title: string;
  isOpen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

const Section: React.FC<SidebarSectionProps> = ({
  title, isOpen, onOpen, onClose, children, 
}) => {
  return (
    <>
      <div 
        className={cx('reduct-sidebar-section-title', { 'reduct-sidebar-section-open': isOpen })}
        onClick={() => isOpen ? onClose?.() : onOpen?.()}
      >
        {title}
      </div>
      <div 
        className={cx('reduct-sidebar-section-content', { 'reduct-sidebar-section-open': isOpen })}
      >
        {children}
      </div>
    </>
  );
};

// add Sidebar.Section to Sidebar
export const Sidebar = Object.assign(SidebarImpl, { Section });
