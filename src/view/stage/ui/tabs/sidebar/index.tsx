import '@resources/style/react/ui/sidebar.scss';
import cx from 'classnames';
import React, { useState } from 'react';

const SidebarImpl: React.FC = ({ children }) => {
  const [expandedChildren, setExpandedChildren] = useState<boolean[]>(
    new Array(React.Children.count(children)).fill(true)
  );

  const newChildren = React.Children.map(children, (child, index) => {
    if (!React.isValidElement(child)) return child;

    const { onOpen, onClose } = child.props as SidebarSectionProps;

    const newChild = React.cloneElement(child, {
      onOpen: () => {
        const newExpandedChildren = [...expandedChildren];
        newExpandedChildren[index] = true;
        setExpandedChildren(newExpandedChildren);
        onOpen?.();
      },
      onClose: () => {
        const newExpandedChildren = [...expandedChildren];
        newExpandedChildren[index] = false;
        setExpandedChildren(newExpandedChildren);
        onClose?.();
      },
      isOpen: expandedChildren[index],
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
