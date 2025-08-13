/**
 * UI Component Library - Export Index
 * Clean, modern components following shadcn/ui principles
 */

// =============================================================================
// DESIGN TOKENS
// =============================================================================
export * from '../../design/tokens';

// =============================================================================
// BUTTON COMPONENTS
// =============================================================================
export { Button, IconButton } from './Button';
export type { ButtonProps, IconButtonProps, ButtonVariant, ButtonSize } from './Button';

// =============================================================================
// CARD COMPONENTS
// =============================================================================
export { Card } from './Card';
export type { CardProps } from './Card';

// =============================================================================
// INPUT COMPONENTS
// =============================================================================
export { Input, Textarea, Select } from './Input';
export type { 
  InputProps, 
  TextareaProps, 
  SelectProps, 
  InputSize, 
  InputVariant 
} from './Input';

// =============================================================================
// FORM COMPONENTS
// =============================================================================
export {
  Form,
  FormGroup,
  FormSection,
  FormGrid,
  FormRow,
  FormActions,
  FieldSet,
  Checkbox,
  Radio,
} from './Form';
export type {
  FormProps,
  FormGroupProps,
  FormSectionProps,
  FormGridProps,
  FormRowProps,
  FormActionsProps,
  FieldSetProps,
  CheckboxProps,
  RadioProps,
} from './Form';

// =============================================================================
// MODAL COMPONENTS
// =============================================================================
export {
  Modal,
  AlertDialog,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalContent,
  ModalOverlay,
} from './Modal';
export type {
  ModalProps,
  AlertDialogProps,
} from './Modal';

// =============================================================================
// LAYOUT COMPONENTS
// =============================================================================
export {
  Stack,
  HStack,
  Grid,
  Container,
  Flex,
  Spacer,
  Divider,
  AspectRatio,
  Center,
  Responsive,
} from './Layout';
export type {
  StackProps,
  HStackProps,
  GridProps,
  ContainerProps,
  FlexProps,
  SpacerProps,
  DividerProps,
  AspectRatioProps,
  CenterProps,
  ResponsiveProps,
} from './Layout';

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================
export {
  getSpacing,
  createTransition,
  createShadow,
  getResponsiveValue,
} from '../../design/tokens';

// =============================================================================
// TYPE EXPORTS
// =============================================================================
export type {
  SpacingKey,
  TypographySize,
  BorderRadiusKey,
  ShadowKey,
  ZIndexKey,
  TransitionDuration,
  TransitionEasing,
} from '../../design/tokens';