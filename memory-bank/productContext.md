# Product Context

This project is a Chrome extension integrated with a backend that utilizes a large language model (LLM) for processing Excel files and mapping data to web forms. The goal is to streamline data extraction from Excel files and provide automatic form filling through a robust API and Chrome extension architecture.

2025-04-25 12:53:41 - Memory bank content initialized based on productBrief.md.

*

## Project Goal
- Develop a proof-of-concept (POC) Chrome extension that auto-fills web forms by processing Excel files and leveraging LLM capabilities in the backend.

## Key Features
- Drag-and-drop file upload in the extension popup.
- Content script to identify and fill form fields.
- Background service worker to manage communications and API calls.
- Backend API server built with Fastify integrated with LLM (Vercel AI SDK) for data processing.
- Robust error handling and performance monitoring.

## Overall Architecture
- A Chrome extension comprised of Popup, Content Script, and Background Service Worker.
- A backend service that processes Excel files using LLM technology.
- A file handling pipeline that reads, processes, and maps data to auto-fill web forms.