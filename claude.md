# Claude Project Instructions

## Version Control and Backup Protocol

Whenever there is a change in the code:

1. **Create a version history log**
   - Document what was changed
   - Include the date and time of the change
   - Note the reason for the change
   - List affected files

2. **Backup to Windows directory**
   - Copy all project files to `D:\projects\estimate-reliance`
   - Ensure the backup is complete before continuing
   - Preserve the directory structure

## Project Overview

This is a React + Vite web application for estimate reliance calculations.

### Tech Stack
- React 19.2.0
- Vite 6.2.0
- TypeScript 5.8.2
- Google GenAI 1.30.0
- Lucide React (icons)

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Development Notes
- Due to UNC path limitations, it's recommended to run this project either:
  - From inside WSL directly
  - From a Windows path (like the backup location at `D:\projects\estimate-reliance`)
