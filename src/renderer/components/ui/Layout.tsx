import React, { ReactNode } from 'react';
import { spacing, breakpoints, getResponsiveValue } from '../../design/tokens';

// =============================================================================
// STACK COMPONENT (Vertical Layout)
// =============================================================================

export interface StackProps {
  children: ReactNode;
  gap?: keyof typeof spacing;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: boolean;
  direction?: 'column' | 'column-reverse';
  className?: string;
  style?: React.CSSProperties;
}

export const Stack: React.FC<StackProps> = ({
  children,
  gap = 'md',
  align = 'stretch',
  justify = 'start',
  wrap = false,
  direction = 'column',
  className,
  style,
}) => {
  const getAlignItems = () => {
    switch (align) {
      case 'center': return 'center';
      case 'end': return 'flex-end';
      case 'stretch': return 'stretch';
      default: return 'flex-start';
    }
  };

  const getJustifyContent = () => {
    switch (justify) {
      case 'center': return 'center';
      case 'end': return 'flex-end';
      case 'between': return 'space-between';
      case 'around': return 'space-around';
      case 'evenly': return 'space-evenly';
      default: return 'flex-start';
    }
  };

  const stackStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: direction,
    alignItems: getAlignItems(),
    justifyContent: getJustifyContent(),
    gap: spacing[gap],
    flexWrap: wrap ? 'wrap' : 'nowrap',
    ...style,
  };

  return (
    <div className={className} style={stackStyles}>
      {children}
    </div>
  );
};

// =============================================================================
// HSTACK COMPONENT (Horizontal Layout)
// =============================================================================

export interface HStackProps extends Omit<StackProps, 'direction'> {
  direction?: 'row' | 'row-reverse';
}

export const HStack: React.FC<HStackProps> = ({
  direction = 'row',
  ...props
}) => {
  return <Stack {...props} direction={direction as any} />;
};

// =============================================================================
// GRID COMPONENT
// =============================================================================

export interface GridProps {
  children: ReactNode;
  columns?: number | Record<keyof typeof breakpoints | 'base', number>;
  gap?: keyof typeof spacing;
  rowGap?: keyof typeof spacing;
  columnGap?: keyof typeof spacing;
  autoFit?: boolean;
  minColumnWidth?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const Grid: React.FC<GridProps> = ({
  children,
  columns = 1,
  gap,
  rowGap,
  columnGap,
  autoFit = false,
  minColumnWidth = 250,
  className,
  style,
}) => {
  const getGridTemplateColumns = () => {
    if (autoFit) {
      return `repeat(auto-fit, minmax(${minColumnWidth}px, 1fr))`;
    }

    if (typeof columns === 'number') {
      return `repeat(${columns}, 1fr)`;
    }

    // Responsive columns - for now, use the largest value
    // In a real app, you'd use CSS custom properties or a CSS-in-JS solution
    const breakpointKeys = ['base', 'sm', 'md', 'lg', 'xl', '2xl'] as const;
    let columnCount = 1;
    
    for (const key of breakpointKeys) {
      if (columns[key] !== undefined) {
        columnCount = columns[key]!;
      }
    }
    
    return `repeat(${columnCount}, 1fr)`;
  };

  const gridStyles: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: getGridTemplateColumns(),
    gap: gap ? spacing[gap] : undefined,
    rowGap: rowGap ? spacing[rowGap] : undefined,
    columnGap: columnGap ? spacing[columnGap] : undefined,
    ...style,
  };

  return (
    <div className={className} style={gridStyles}>
      {children}
    </div>
  );
};

// =============================================================================
// CONTAINER COMPONENT
// =============================================================================

export interface ContainerProps {
  children: ReactNode;
  maxWidth?: keyof typeof breakpoints | number | 'none';
  padding?: keyof typeof spacing;
  centerContent?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const Container: React.FC<ContainerProps> = ({
  children,
  maxWidth = 'lg',
  padding = 'lg',
  centerContent = true,
  className,
  style,
}) => {
  const getMaxWidth = () => {
    if (maxWidth === 'none') return 'none';
    if (typeof maxWidth === 'number') return `${maxWidth}px`;
    return `${breakpoints[maxWidth]}px`;
  };

  const containerStyles: React.CSSProperties = {
    width: '100%',
    maxWidth: getMaxWidth(),
    margin: centerContent ? '0 auto' : undefined,
    padding: `0 ${spacing[padding]}px`,
    ...style,
  };

  return (
    <div className={className} style={containerStyles}>
      {children}
    </div>
  );
};

// =============================================================================
// FLEX COMPONENT (General Purpose Flex Container)
// =============================================================================

export interface FlexProps {
  children: ReactNode;
  direction?: 'row' | 'row-reverse' | 'column' | 'column-reverse';
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  gap?: keyof typeof spacing;
  grow?: number;
  shrink?: number;
  basis?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export const Flex: React.FC<FlexProps> = ({
  children,
  direction = 'row',
  align = 'start',
  justify = 'start',
  wrap = 'nowrap',
  gap,
  grow,
  shrink,
  basis,
  className,
  style,
}) => {
  const getAlignItems = () => {
    switch (align) {
      case 'center': return 'center';
      case 'end': return 'flex-end';
      case 'stretch': return 'stretch';
      case 'baseline': return 'baseline';
      default: return 'flex-start';
    }
  };

  const getJustifyContent = () => {
    switch (justify) {
      case 'center': return 'center';
      case 'end': return 'flex-end';
      case 'between': return 'space-between';
      case 'around': return 'space-around';
      case 'evenly': return 'space-evenly';
      default: return 'flex-start';
    }
  };

  const flexStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: direction,
    alignItems: getAlignItems(),
    justifyContent: getJustifyContent(),
    flexWrap: wrap,
    gap: gap ? spacing[gap] : undefined,
    flexGrow: grow,
    flexShrink: shrink,
    flexBasis: typeof basis === 'number' ? `${basis}px` : basis,
    ...style,
  };

  return (
    <div className={className} style={flexStyles}>
      {children}
    </div>
  );
};

// =============================================================================
// SPACER COMPONENT
// =============================================================================

export interface SpacerProps {
  size?: keyof typeof spacing;
  direction?: 'horizontal' | 'vertical';
  className?: string;
  style?: React.CSSProperties;
}

export const Spacer: React.FC<SpacerProps> = ({
  size = 'md',
  direction = 'vertical',
  className,
  style,
}) => {
  const spacerStyles: React.CSSProperties = {
    flex: 'none',
    width: direction === 'horizontal' ? spacing[size] : 0,
    height: direction === 'vertical' ? spacing[size] : 0,
    ...style,
  };

  return <div className={className} style={spacerStyles} />;
};

// =============================================================================
// DIVIDER COMPONENT
// =============================================================================

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  variant?: 'solid' | 'dashed' | 'dotted';
  thickness?: number;
  length?: string | number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const Divider: React.FC<DividerProps> = ({
  orientation = 'horizontal',
  variant = 'solid',
  thickness = 1,
  length = '100%',
  color = '#e5e7eb', // Default to light gray
  className,
  style,
}) => {
  const isHorizontal = orientation === 'horizontal';

  const dividerStyles: React.CSSProperties = {
    border: 'none',
    width: isHorizontal ? (typeof length === 'number' ? `${length}px` : length) : `${thickness}px`,
    height: isHorizontal ? `${thickness}px` : (typeof length === 'number' ? `${length}px` : length),
    borderStyle: variant,
    borderWidth: variant !== 'solid' ? `${thickness}px` : 0,
    borderColor: variant !== 'solid' ? color : 'transparent',
    backgroundColor: variant === 'solid' ? color : 'transparent',
    ...style,
  };

  return <hr className={className} style={dividerStyles} />;
};

// =============================================================================
// ASPECT RATIO COMPONENT
// =============================================================================

export interface AspectRatioProps {
  children: ReactNode;
  ratio?: number; // width / height (e.g., 16/9 = 1.777...)
  maxWidth?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export const AspectRatio: React.FC<AspectRatioProps> = ({
  children,
  ratio = 16 / 9,
  maxWidth,
  className,
  style,
}) => {
  const containerStyles: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth,
    ...style,
  };

  const paddingBottomPercentage = (1 / ratio) * 100;

  const innerStyles: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    paddingBottom: `${paddingBottomPercentage}%`,
  };

  const contentStyles: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  };

  return (
    <div className={className} style={containerStyles}>
      <div style={innerStyles}>
        <div style={contentStyles}>{children}</div>
      </div>
    </div>
  );
};

// =============================================================================
// CENTER COMPONENT
// =============================================================================

export interface CenterProps {
  children: ReactNode;
  inline?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const Center: React.FC<CenterProps> = ({
  children,
  inline = false,
  className,
  style,
}) => {
  const centerStyles: React.CSSProperties = {
    display: inline ? 'inline-flex' : 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...style,
  };

  return (
    <div className={className} style={centerStyles}>
      {children}
    </div>
  );
};

// =============================================================================
// RESPONSIVE UTILITIES
// =============================================================================

export interface ResponsiveProps {
  children: ReactNode;
  show?: Partial<Record<keyof typeof breakpoints | 'base', boolean>>;
  hide?: Partial<Record<keyof typeof breakpoints | 'base', boolean>>;
}

export const Responsive: React.FC<ResponsiveProps> = ({
  children,
  show,
  hide,
}) => {
  // This is a simplified implementation
  // In a real app, you'd use CSS media queries or a proper responsive system
  
  const [screenWidth, setScreenWidth] = React.useState(window.innerWidth);

  React.useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (show) {
    const shouldShow = getResponsiveValue(show, screenWidth);
    if (!shouldShow) return null;
  }

  if (hide) {
    const shouldHide = getResponsiveValue(hide, screenWidth);
    if (shouldHide) return null;
  }

  return <>{children}</>;
};