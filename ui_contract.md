# UI/UX Contract: Tentative Schedule & Visitor Management System

## Overview
This document defines the core user interface and user experience (UI/UX) principles, design system, and key interactions for the **Tentative Schedule & Visitor Management System** for PT KAI DAOP 6.

## 1. Design System & Aesthetics

### Color Palette (PT KAI Corporate Colors)
- **Primary Color:** KAI Blue (`#0F1551` or equivalent dark blue / Tailwind: `indigo-950` or custom) - Used for navbar, sidebars, primary actions.
- **Secondary/Accent Color:** KAI Orange (`#ED7200` or equivalent bright orange / Tailwind: `orange-500` or custom) - Used for highlighting, notifications, and important primary buttons.
- **Backgrounds:** Light grayish-blue (`#F8FAFC` / Tailwind: `slate-50`) for the application background to create depth. White for cards and content areas.
- **Text/Typography:** `Inter` font. Dark Slate (`#1E293B`) for primary text, lighter Slate (`#64748B`) for secondary text.
  - *Enterprise Feel*: Clean whitespace, avoiding pure black.

### Component Design
- **Buttons**: Rounded-md (`rounded-md`), subtle shadow on hover, smooth transition.
  - Primary: Orange background with white text.
  - Secondary/Ghost: Transparent with blue text/borders.
- **Cards & Containers**: White background, soft border (`border-slate-200`), and a default drop-shadow (`shadow-sm` or `shadow`).
- **Forms & Inputs**: Minimalist border inputs (`border-gray-300`), focusing on readability. Active states should outline in Primary KAI Blue.
- **Animations/Transitions**: Fast and subtle transitions (`duration-200` to `duration-300`) for hovers, opening modals, and switching tabs.

## 2. Layout & Navigation Structure

### Core Layout (Super Admin / Admin / User)
- **Sidebar**: Collapsible vertical menu for navigation (Dashboard, Users, Units, Settings). Dark KAI Blue background with glowing orange highlights on active links.
- **Top Bar**: Shows Breadcrumbs on the left, Profile dropdown and Notifications (alerts for pending approvals) on the right.

### The Main Dashboard (Calendar View)
The primary interface upon logging in will be a large, interactive calendar.
- **Tab System**:
  - **"Global Schedule"**: A view outlining all *APPROVED* schedules within the organization. Good for seeing availability.
  - **"My Schedule"**: Specific filtered view showing schedules owned by the logged-in user OR schedules where the user is the `target_user_id` (Tamu wanting to meet them).

### Guest Interface
- **Public Landing Page**: Clean, brand-focused landing page where guests can submit a meeting request.
  - Requires: Name, Email, Phone, Purpose, Date/Time, and Target User (Dropdown or Search).
  - No sidebar, simplified top navigation with KAI logo.

## 3. Libraries & Integrations
- **Next.js App Router**: Provides fast transitions and optimized loading. Layout layers will be utilized for Sidebar/Top Bar.
- **Tailwind CSS**: Will use custom variables in configuration to match KAI branding Hex colors.
- **FullCalendar React**: Will be styled seamlessly into the Tailwind theme to look native. Modals will pop up when clicking an existing event (to view details) or an empty slot (to request a schedule).
  - *Event Colors*: Blue for internal schedules, Orange for guest schedules. Grey/striped for Pending.

## 4. Key Interactions
- **Scheduling**: Clicking a date/time block opens a slideover or modal to quickly create a schedule.
- **Approval Workflow (Admin)**: A dedicated "Pending Requests" table/widget with quick action buttons (Approve, Decline) to prevent navigating away from the dashboard.
- **Status Indicators**: Use standard badging schemas (Green = Approved, Yellow = Pending, Red = Rejected).
