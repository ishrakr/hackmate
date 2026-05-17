## Inspiration
The process of finding a team at a hackathon is often an unoptimized, high-latency operation. Hackers frequently waste critical development cycles searching for complementary skill sets across disjointed communication channels and chaotic spreadsheets. Hackmate was engineered to solve this routing problem. We sought to build a centralized platform that streamlines team formation, event logistics, and real-time communications for both participants and organizers. 

## What it does
Hackmate overhauls the hackathon lifecycle by providing a single, highly concurrent platform engineered for performance and scalability.

**For Hackers:**
*   **Algorithmic Team Matching:** The platform implements a swipe-based interface connecting solo developers with incomplete teams. Profiles aggregate GitHub, LinkedIn, and Devpost metrics alongside self-reported technical competencies.
*   **Real-Time Communication Protocol:** The application features public lobbies, isolated team channels, and direct support routing. We integrated a Large Language Model to process natural language queries against the event-specific data feed for instant, automated FAQ resolution.
*   **Spatial Logistics Hub:** The platform utilizes OpenStreetMap data to render interactive, zoomable venue layouts detailing parking, room assignments, and restricted zones.
*   **Accessibility and Personalization:** The interface features a dark mode toggle and utilizes colorblind-friendly palettes, ensuring strict compliance with modern web accessibility standards.

**For Organizers:**
*   **Administrative Control Plane:** A secure dashboard built with Bootstrap provides event organizers with granular control over the event. Features include live attendance tracking, dynamic schedule modification, user session logging, and IP address auditing.
*   **Event Flow Management:** Organizers can push real-time WebSocket announcements globally and track team formations instantaneously via a secure QR code verification system.

## How we built it
We architected Hackmate as a seamless mobile web application to eliminate the friction of native app store distribution.

*   **Client Architecture:** The frontend is a Single-Page Application built with ReactJS. We prioritized a modular component structure utilizing React Hooks to manage the complex local state required for active swipe sessions and chat feeds. We incorporated custom graphic design elements to ensure the user interface felt intuitive, utilizing scalable vector assets to maintain high visual fidelity across all mobile browser viewports. 
*   **Backend and Database:** We utilized Supabase to leverage its robust PostgreSQL engine for our core data persistence. The backend architecture heavily relies on Row Level Security policies to enforce strict user data isolation and manage role-based access control between standard hackers and administrators.
*   **Infrastructure:** The entire application environment is containerized using Docker. This ensures strict environment parity between local development and production deployments.
*   **Authentication:** We implemented secure Single Sign-On utilizing OAuth 2.0 protocols via GitHub and Discord to streamline onboarding while cryptographically verifying developer identities.

## Challenges we ran into
Designing the relational database schema to support instantaneous swipe matching presented a significant technical hurdle. We had to optimize complex SQL joins to filter out previously viewed profiles and ensure the matching queue remained highly performant under concurrent load. 

Additionally, maintaining stable WebSocket connections for the live chat and team joining features required rigorous state synchronization logic within the React client. We had to implement strict race-condition handling to ensure that team invites and global announcements updated asynchronously without generating frontend rendering errors.

## Accomplishments that we're proud of
We successfully architected a highly responsive user interface where the swipe mechanics execute with near-zero perceived latency. The real-time synchronization of the database operates flawlessly, updating team statuses and messaging feeds simultaneously across hundreds of simulated active client instances. 

We are also extremely proud of the comprehensive administrative dashboard. Providing organizers with a centralized command center that includes robust session logging and security auditing elevates Hackmate from a standard hackathon project to an enterprise-grade utility.

## What we learned
We significantly advanced our proficiency in backend software engineering, specifically in structuring relational databases and writing optimized PostgreSQL queries for large datasets. We gained highly practical experience managing Docker containers to orchestrate seamless interactions between a React frontend and a real-time database backend. Furthermore, we refined our ability to manage complex state transitions within a React application under high-frequency data updates.

## What's next for Hackmate
We plan to expand Hackmate into a fully comprehensive event operating system.
*   **Spatial Computing:** We intend to integrate a markerless Augmented Reality scavenger hunt using advanced WebGL and SLAM libraries to run natively in mobile browsers without requiring standard WebXR APIs.
*   **Advanced Audio Integration:** We are exploring the implementation of the ElevenLabs API to generate highly realistic, dynamically generated audio announcements and screen-reader accessibility features.
*   **Judging Operations:** We will build a secure file handling system for participants to upload project demos directly to the platform, coupled with a streamlined ranking interface for event judges. 
*   **Sponsor Infrastructure:** We aim to develop a secure cryptographic distribution system allowing corporate sponsors to instantly allocate API credits and cloud infrastructure keys to registered participants.

## Technologies Used
**Frontend:**
*   ReactJS
*   Bootstrap (Admin Portal UI)

**Backend & Infrastructure:**
*   Supabase
*   PostgreSQL
*   Docker

**Authentication:**
*   OAuth 2.0 (GitHub, Discord)

**AI Integration:**
*   Large Language Model APIs (Automated FAQ and Data Routing)

**Mapping & Spatial:**
*   OpenStreetMap
*   Three.js (AR Integration Pipeline)
*   8th Wall Web AR Engine (SLAM and Markerless Tracking)

## Team
*   Ishrak Rahman
*   Abdullah Asraf Abir
*   Huzaifa Quaid Johar