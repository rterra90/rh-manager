# Design Guidelines: HR Management System

## Design Approach

**Selected Approach:** Design System - Modern Productivity Tools (Linear/Notion-inspired)

**Justification:** This HR application is utility-focused, information-dense, and requires stability. Drawing from Linear's clean efficiency and Notion's organizational clarity creates a professional, trustworthy interface perfect for corporate HR workflows.

**Core Principles:**
- Clarity over decoration
- Efficient data entry and review
- Scannable information architecture
- Professional, trustworthy aesthetic

## Typography System

**Font Families:**
- Primary: Inter (Google Fonts) - UI elements, forms, tables
- Headings: Inter SemiBold/Bold

**Type Scale:**
- Page Titles: text-3xl font-bold
- Section Headers: text-xl font-semibold
- Card Headers: text-lg font-semibold
- Body Text: text-base
- Labels/Meta: text-sm
- Captions: text-xs text-gray-600

## Layout System

**Spacing Primitives:** Use Tailwind units of 2, 4, 6, and 8 consistently
- Component padding: p-6
- Section spacing: gap-8
- Card margins: space-y-6
- Form field gaps: gap-4

**Container Strategy:**
- Dashboard layout: max-w-7xl mx-auto px-6
- Forms/Detail views: max-w-4xl mx-auto
- Sidebar navigation: Fixed w-64

## Component Library

**Navigation:**
- Left sidebar (w-64) with company logo at top, main navigation items with icons, logout at bottom
- Top bar with page title, breadcrumbs, and action buttons aligned right

**Dashboard:**
- Stats cards in 3-column grid showing: Total Employees, Pending Vacation Requests, Hours Bank Alerts
- Employee table with sortable columns, search bar, and "Add Employee" primary button

**Employee Management:**
- List view: Table with columns for Name, Matrícula, Position, Hours Balance, Quick Actions
- Detail view: Two-column layout - left (employee info), right (tabbed sections for Hours Bank, Vacation, Leave, Notes)
- Forms: Single-column, left-aligned labels above inputs, grouped by logical sections with subtle dividers

**Data Entry Components:**
- Text inputs: Full-width with clear labels, placeholder text for format guidance
- Selects/Dropdowns: For position/role selection
- Date pickers: For vacation/leave period selection
- Textarea: For observation notes (min-height for comfortable editing)
- Month selector: For hours bank entries

**Tables:**
- Striped rows for readability
- Hover states on rows
- Action buttons (edit/delete) in last column, icon-only with tooltips
- Responsive: Stack on mobile with cards instead of table

**Cards:**
- Subtle border, no shadow
- Consistent padding (p-6)
- Header with title and optional action button
- Clean content area with proper spacing

**Buttons:**
- Primary: Solid background for main actions (Add Employee, Save)
- Secondary: Border-only for cancel/back actions
- Destructive: Red accent for delete actions
- Icon buttons: For table actions, equal width/height

**Forms:**
- Group related fields with section headers
- Required field indicators (asterisk)
- Validation messages below inputs in red
- Save/Cancel buttons at bottom-right

**Tabs:**
- For employee detail sections (Hours Bank, Vacation, Leave, Notes)
- Underline style for active state
- Clean spacing between tabs

**Modals:**
- Centered overlay for confirmations (delete employee)
- Slide-in panels from right for quick-add/edit forms
- Maximum width constraints for readability

## Page Layouts

**Dashboard:** Top bar + sidebar + 3-column stats grid + employee table below

**Employee Detail:** Top bar + sidebar + breadcrumb + two-column layout (info + tabbed content)

**Add/Edit Employee:** Top bar + sidebar + centered form (max-w-2xl) with clear section breaks

## Animations

Minimal, purposeful only:
- Smooth page transitions (no jarring loads)
- Subtle hover states on interactive elements
- Modal/panel entrance animations (slide/fade)

## Accessibility

- Semantic HTML throughout
- ARIA labels for icon-only buttons
- Keyboard navigation support
- Focus indicators on all interactive elements
- Consistent tab order in forms