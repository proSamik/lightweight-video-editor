import React, { useEffect, useRef, forwardRef, ReactNode } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  spacing, 
  modal, 
  typography, 
  borderRadius, 
  zIndex,
  createTransition,
  createShadow 
} from '../../design/tokens';
import { IconButton } from './Button';

// =============================================================================
// MODAL OVERLAY COMPONENT
// =============================================================================

interface ModalOverlayProps {
  isOpen: boolean;
  onClose?: () => void;
  closeOnOverlayClick?: boolean;
  children: ReactNode;
}

const ModalOverlay: React.FC<ModalOverlayProps> = ({
  isOpen,
  onClose,
  closeOnOverlayClick = true,
  children,
}) => {
  const { theme } = useTheme();

  const overlayStyles: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.modal.overlay,
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    zIndex: zIndex.modal,
    opacity: isOpen ? 1 : 0,
    visibility: isOpen ? 'visible' : 'hidden',
    transition: createTransition('all', 'normal'),
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose?.();
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div style={overlayStyles} onClick={handleOverlayClick}>
      {children}
    </div>
  );
};

// =============================================================================
// MODAL CONTENT COMPONENT
// =============================================================================

interface ModalContentProps {
  maxWidth?: number | string;
  maxHeight?: number | string;
  children: ReactNode;
  className?: string;
}

const ModalContent = forwardRef<HTMLDivElement, ModalContentProps>(
  ({ maxWidth = modal.content.maxWidth, maxHeight = '90vh', children, className }, ref) => {
    const { theme } = useTheme();

    const contentStyles: React.CSSProperties = {
      backgroundColor: theme.colors.modal.background,
      border: `1px solid ${theme.colors.modal.border}`,
      borderRadius: modal.content.borderRadius,
      boxShadow: createShadow('xl', theme.mode === 'dark'),
      maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth,
      maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight,
      width: '100%',
      minWidth: modal.content.minWidth,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      transform: 'scale(1)',
      transition: createTransition('transform', 'fast'),
    };

    return (
      <div ref={ref} style={contentStyles} className={className}>
        {children}
      </div>
    );
  }
);

ModalContent.displayName = 'ModalContent';

// =============================================================================
// MODAL HEADER COMPONENT
// =============================================================================

interface ModalHeaderProps {
  title?: string;
  onClose?: () => void;
  showCloseButton?: boolean;
  children?: ReactNode;
}

const ModalHeader: React.FC<ModalHeaderProps> = ({
  title,
  onClose,
  showCloseButton = true,
  children,
}) => {
  const { theme } = useTheme();

  const headerStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: modal.header.padding,
    borderBottom: `1px solid ${theme.colors.border}`,
    backgroundColor: theme.colors.surface,
    borderRadius: `${modal.header.borderRadius} ${modal.header.borderRadius} 0 0`,
    minHeight: 60,
  };

  const titleStyles: React.CSSProperties = {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: theme.colors.text,
    margin: 0,
    lineHeight: typography.lineHeight.tight,
  };

  const closeIconStyles = {
    width: 20,
    height: 20,
    stroke: theme.colors.textSecondary,
    strokeWidth: 2,
  };

  const CloseIcon = () => (
    <svg style={closeIconStyles} viewBox="0 0 24 24" fill="none">
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  return (
    <div style={headerStyles}>
      <div style={{ flex: 1 }}>
        {title ? <h2 style={titleStyles}>{title}</h2> : children}
      </div>
      
      {showCloseButton && onClose && (
        <IconButton
          icon={<CloseIcon />}
          variant="ghost"
          size="sm"
          onClick={onClose}
          aria-label="Close modal"
        />
      )}
    </div>
  );
};

// =============================================================================
// MODAL BODY COMPONENT
// =============================================================================

interface ModalBodyProps {
  children: ReactNode;
  padding?: keyof typeof spacing;
  maxHeight?: number | string;
}

const ModalBody: React.FC<ModalBodyProps> = ({
  children,
  padding = '3xl',
  maxHeight,
}) => {
  const bodyStyles: React.CSSProperties = {
    padding: spacing[padding],
    flex: 1,
    overflow: 'auto',
    maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight,
  };

  return <div style={bodyStyles}>{children}</div>;
};

// =============================================================================
// MODAL FOOTER COMPONENT
// =============================================================================

interface ModalFooterProps {
  children: ReactNode;
  align?: 'left' | 'center' | 'right' | 'between';
  padding?: keyof typeof spacing;
}

const ModalFooter: React.FC<ModalFooterProps> = ({
  children,
  align = 'right',
  padding = '2xl',
}) => {
  const { theme } = useTheme();

  const getJustifyContent = () => {
    switch (align) {
      case 'left': return 'flex-start';
      case 'center': return 'center';
      case 'between': return 'space-between';
      default: return 'flex-end';
    }
  };

  const footerStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: getJustifyContent(),
    gap: spacing.md,
    padding: spacing[padding],
    borderTop: `1px solid ${theme.colors.border}`,
    backgroundColor: theme.colors.surface,
    borderRadius: `0 0 ${modal.content.borderRadius}px ${modal.content.borderRadius}px`,
  };

  return <div style={footerStyles}>{children}</div>;
};

// =============================================================================
// MAIN MODAL COMPONENT
// =============================================================================

export interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  title?: string;
  maxWidth?: number | string;
  maxHeight?: number | string;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  maxWidth,
  maxHeight,
  closeOnOverlayClick = true,
  showCloseButton = true,
  children,
  header,
  footer,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  // Focus management
  useEffect(() => {
    if (isOpen && contentRef.current) {
      contentRef.current.focus();
    }
  }, [isOpen]);

  return (
    <ModalOverlay
      isOpen={isOpen}
      onClose={onClose}
      closeOnOverlayClick={closeOnOverlayClick}
    >
      <div
        tabIndex={-1}
        style={{ outline: 'none' }}
        ref={contentRef}
      >
        <ModalContent
          maxWidth={maxWidth}
          maxHeight={maxHeight}
        >
        {(title || header) && (
          <ModalHeader
            title={title}
            onClose={onClose}
            showCloseButton={showCloseButton}
          >
            {header}
          </ModalHeader>
        )}
        
        <ModalBody>{children}</ModalBody>
        
        {footer && <ModalFooter>{footer}</ModalFooter>}
        </ModalContent>
      </div>
    </ModalOverlay>
  );
};

// =============================================================================
// DIALOG VARIANTS
// =============================================================================

export interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  variant?: 'info' | 'warning' | 'error' | 'success';
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  variant = 'info',
}) => {
  const { theme } = useTheme();

  const getVariantColor = () => {
    switch (variant) {
      case 'warning': return theme.colors.warning;
      case 'error': return theme.colors.error;
      case 'success': return theme.colors.success;
      default: return theme.colors.info;
    }
  };

  const getVariantIcon = () => {
    const iconStyles = {
      width: 24,
      height: 24,
      stroke: getVariantColor(),
      strokeWidth: 2,
    };

    switch (variant) {
      case 'warning':
        return (
          <svg style={iconStyles} viewBox="0 0 24 24" fill="none">
            <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        );
      case 'error':
        return (
          <svg style={iconStyles} viewBox="0 0 24 24" fill="none">
            <path d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        );
      case 'success':
        return (
          <svg style={iconStyles} viewBox="0 0 24 24" fill="none">
            <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg style={iconStyles} viewBox="0 0 24 24" fill="none">
            <path d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
        );
    }
  };

  const contentStyles: React.CSSProperties = {
    display: 'flex',
    gap: spacing.lg,
    alignItems: 'flex-start',
  };

  const textContentStyles: React.CSSProperties = {
    flex: 1,
  };

  const titleStyles: React.CSSProperties = {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: spacing.sm,
    lineHeight: typography.lineHeight.tight,
  };

  const descriptionStyles: React.CSSProperties = {
    fontSize: typography.fontSize.base,
    color: theme.colors.textSecondary,
    lineHeight: typography.lineHeight.normal,
    marginBottom: 0,
  };

  const handleConfirm = () => {
    onConfirm?.();
    onClose();
  };

  const footer = (
    <>
      <button
        onClick={onClose}
        style={{
          padding: `${spacing.sm}px ${spacing.lg}px`,
          backgroundColor: 'transparent',
          border: `1px solid ${theme.colors.border}`,
          borderRadius: borderRadius.md,
          color: theme.colors.text,
          cursor: 'pointer',
          fontSize: typography.fontSize.base,
          fontFamily: 'inherit',
        }}
      >
        {cancelText}
      </button>
      <button
        onClick={handleConfirm}
        style={{
          padding: `${spacing.sm}px ${spacing.lg}px`,
          backgroundColor: getVariantColor(),
          border: `1px solid ${getVariantColor()}`,
          borderRadius: borderRadius.md,
          color: theme.colors.primaryForeground,
          cursor: 'pointer',
          fontSize: typography.fontSize.base,
          fontFamily: 'inherit',
        }}
      >
        {confirmText}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth={400}
      footer={footer}
    >
      <div style={contentStyles}>
        {getVariantIcon()}
        <div style={textContentStyles}>
          <h3 style={titleStyles}>{title}</h3>
          <p style={descriptionStyles}>{description}</p>
        </div>
      </div>
    </Modal>
  );
};

// Export sub-components for advanced usage
export { ModalHeader, ModalBody, ModalFooter, ModalContent, ModalOverlay };