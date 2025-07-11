// UI Blocks System Types (Slack Block Kit Compatible)

export interface UIBlock {
  type: string;
  block_id?: string;
}

// Section Block
export interface SectionBlock extends UIBlock {
  type: 'section';
  text?: TextObject;
  fields?: TextObject[];
  accessory?: BlockElement;
}

// Header Block
export interface HeaderBlock extends UIBlock {
  type: 'header';
  text: PlainTextObject;
}

// Divider Block
export interface DividerBlock extends UIBlock {
  type: 'divider';
}

// Image Block
export interface ImageBlock extends UIBlock {
  type: 'image';
  image_url: string;
  alt_text: string;
  title?: PlainTextObject;
}

// Context Block
export interface ContextBlock extends UIBlock {
  type: 'context';
  elements: (TextObject | ImageElement)[];
}

// Actions Block
export interface ActionsBlock extends UIBlock {
  type: 'actions';
  elements: InteractiveElement[];
}

// Input Block
export interface InputBlock extends UIBlock {
  type: 'input';
  label: PlainTextObject;
  element: InputElement;
  hint?: PlainTextObject;
  optional?: boolean;
}

// File Block
export interface FileBlock extends UIBlock {
  type: 'file';
  file_id: string;
  title: string;
  size?: number;
  mime_type?: string;
  metadata?: Record<string, any>;
}

// Rich Text Block
export interface RichTextBlock extends UIBlock {
  type: 'rich_text';
  elements: RichTextElement[];
}

// Text Objects
export interface TextObject {
  type: 'plain_text' | 'mrkdwn';
  text: string;
  emoji?: boolean;
  verbatim?: boolean;
}

export interface PlainTextObject extends TextObject {
  type: 'plain_text';
  emoji?: boolean;
}

export interface MarkdownTextObject extends TextObject {
  type: 'mrkdwn';
  verbatim?: boolean;
}

// Block Elements
export interface BlockElement {
  type: string;
}

export interface ImageElement extends BlockElement {
  type: 'image';
  image_url: string;
  alt_text: string;
}

// Interactive Elements
export interface InteractiveElement extends BlockElement {
  action_id?: string;
}

export interface ButtonElement extends InteractiveElement {
  type: 'button';
  text: PlainTextObject;
  action_id: string;
  value?: string;
  url?: string;
  style?: 'primary' | 'danger' | 'default';
  confirm?: ConfirmationDialog;
}

export interface StaticSelectElement extends InteractiveElement {
  type: 'static_select';
  placeholder: PlainTextObject;
  action_id: string;
  options?: Option[];
  option_groups?: OptionGroup[];
  initial_option?: Option;
  confirm?: ConfirmationDialog;
}

export interface MultiStaticSelectElement extends InteractiveElement {
  type: 'multi_static_select';
  placeholder: PlainTextObject;
  action_id: string;
  options?: Option[];
  option_groups?: OptionGroup[];
  initial_options?: Option[];
  max_selected_items?: number;
  confirm?: ConfirmationDialog;
}

export interface DatePickerElement extends InteractiveElement {
  type: 'datepicker';
  action_id: string;
  placeholder?: PlainTextObject;
  initial_date?: string;
  confirm?: ConfirmationDialog;
}

export interface TimePickerElement extends InteractiveElement {
  type: 'timepicker';
  action_id: string;
  placeholder?: PlainTextObject;
  initial_time?: string;
  confirm?: ConfirmationDialog;
}

// Input Elements
export interface InputElement extends BlockElement {}

export interface PlainTextInputElement extends InputElement {
  type: 'plain_text_input';
  action_id: string;
  placeholder?: PlainTextObject;
  initial_value?: string;
  multiline?: boolean;
  min_length?: number;
  max_length?: number;
}

// Rich Text Elements
export interface RichTextElement {
  type: string;
}

export interface RichTextSectionElement extends RichTextElement {
  type: 'rich_text_section';
  elements: (RichTextStyleElement | RichTextLinkElement | RichTextEmojiElement)[];
}

export interface RichTextStyleElement extends RichTextElement {
  type: 'text';
  text: string;
  style?: {
    bold?: boolean;
    italic?: boolean;
    strike?: boolean;
    code?: boolean;
  };
}

export interface RichTextLinkElement extends RichTextElement {
  type: 'link';
  url: string;
  text?: string;
  style?: {
    bold?: boolean;
    italic?: boolean;
    strike?: boolean;
    code?: boolean;
  };
}

export interface RichTextEmojiElement extends RichTextElement {
  type: 'emoji';
  name: string;
}

// Supporting Types
export interface Option {
  text: PlainTextObject | MarkdownTextObject;
  value: string;
  description?: PlainTextObject;
  url?: string;
}

export interface OptionGroup {
  label: PlainTextObject;
  options: Option[];
}

export interface ConfirmationDialog {
  title: PlainTextObject;
  text: TextObject;
  confirm: PlainTextObject;
  deny: PlainTextObject;
  style?: 'primary' | 'danger';
}

// Experience-Specific Block Types (Future Extensions)
export interface InsightCardBlock extends UIBlock {
  type: 'insight_card';
  insight_id: string;
  title: string;
  summary?: string;
  kpis?: KPI[];
  actions?: ButtonElement[];
  tags?: string[];
}

export interface InsightPileBlock extends UIBlock {
  type: 'insight_pile';
  insights: InsightSummary[];
  filters?: FilterOption[];
  sort_options?: SortOption[];
}

export interface NavigationRailBlock extends UIBlock {
  type: 'navigation_rail';
  items: NavigationItem[];
  collapsed?: boolean;
}

// Supporting Types for Experience Blocks
export interface KPI {
  label: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'stable';
  format?: 'currency' | 'percentage' | 'number' | 'text';
}

export interface InsightSummary {
  id: string;
  title: string;
  type: string;
  created_at: string;
  tags?: string[];
  kpis?: KPI[];
}

export interface FilterOption {
  id: string;
  label: string;
  type: 'select' | 'date' | 'text';
  options?: Option[];
}

export interface SortOption {
  id: string;
  label: string;
  direction: 'asc' | 'desc';
}

export interface NavigationItem {
  id: string;
  label: string;
  url?: string;
  action_id?: string;
  icon?: string;
  children?: NavigationItem[];
}

// Union Types for Type Safety
export type UIBlockType = 
  | SectionBlock 
  | HeaderBlock 
  | DividerBlock 
  | ImageBlock 
  | ContextBlock 
  | ActionsBlock 
  | InputBlock 
  | FileBlock 
  | RichTextBlock
  | InsightCardBlock 
  | InsightPileBlock 
  | NavigationRailBlock;

export type BlockElementType = 
  | ImageElement 
  | ButtonElement 
  | StaticSelectElement 
  | MultiStaticSelectElement 
  | DatePickerElement 
  | TimePickerElement 
  | PlainTextInputElement;

export type InteractiveElementType = 
  | ButtonElement 
  | StaticSelectElement 
  | MultiStaticSelectElement 
  | DatePickerElement 
  | TimePickerElement;
