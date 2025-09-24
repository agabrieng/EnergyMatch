# Plataforma de Energia Livre - SaaS

## Overview

This is a Brazilian energy marketplace SaaS platform that connects energy consumers with energy trading companies (comercializadoras). The platform enables users to submit purchase intents for energy services, allows comercializadoras to submit proposals, and provides administrative oversight. The application is built as a full-stack TypeScript application with a React frontend and Express backend, featuring role-based access control for three user types: regular users, comercializadoras, and administrators.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite for development and building
- **UI Library**: Shadcn/ui components built on Radix UI primitives with Tailwind CSS for styling
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Authentication**: Context-based authentication system with session management
- **Theme**: Light theme with CSS variables for consistent design tokens

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Authentication**: Passport.js with local strategy and express-session
- **Password Security**: bcrypt for password hashing
- **API Design**: RESTful API with JSON responses
- **Middleware**: Custom logging, error handling, and session management

### Database and ORM
- **Database**: PostgreSQL (configured for Neon serverless)
- **ORM**: Drizzle ORM with type-safe schema definitions
- **Schema**: Role-based user system with separate tables for users, comercializadoras, purchase intents, and proposals
- **Migrations**: Drizzle Kit for database schema management

### Role-Based Access Control
- **User Roles**: Three distinct roles (user, comercializadora, admin) with different permissions and UI flows
- **Route Protection**: Role-based redirects and access control throughout the application
- **UI Adaptation**: Dynamic sidebar and page content based on user role

### Development and Build Process
- **Development**: Vite dev server with HMR and TypeScript checking
- **Production Build**: Vite for frontend bundling, esbuild for backend compilation
- **Code Quality**: TypeScript strict mode with path aliases for clean imports
- **Development Tools**: Replit-specific plugins for enhanced development experience

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Drizzle ORM**: Type-safe database operations and schema management

### UI and Styling
- **Radix UI**: Headless component primitives for accessibility and behavior
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Lucide Icons**: Icon library for consistent iconography
- **React Icons**: Additional icon set including brand icons (Google)

### Authentication and Security
- **Passport.js**: Authentication middleware with local strategy support
- **bcrypt**: Password hashing for secure credential storage
- **express-session**: Session management for user authentication state

### Development Tools
- **Vite**: Fast development server and build tool
- **TypeScript**: Static type checking and enhanced developer experience
- **PostCSS**: CSS processing with Tailwind CSS integration
- **Replit Plugins**: Development environment enhancements for Replit platform

### Frontend Libraries
- **TanStack Query**: Server state management and caching
- **React Hook Form**: Form handling with validation
- **Hookform Resolvers**: Form validation integration
- **Wouter**: Lightweight routing solution
- **date-fns**: Date manipulation and formatting utilities