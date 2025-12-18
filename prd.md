







Project Scope of Work: Cort Enterprise Mobility Platform (Phase 1 MVP)
Project Name: Cort Enterprise Mobility Platform
Version: 2.1 (Consolidated MVP Scope)
Date: December 16, 2025
Document Owner: CTO, Cort







Project Scope of Work: Cort Enterprise Mobility Platform (Phase 1 MVP)
Project Name: Cort Enterprise Mobility Platform
Version: 3.0 (Final Execution Scope)
Date: December 17, 2025
Document Owner: CTO, Cort

1. Project Overview
Development of a B2B transportation management system with four interfaces. The system digitizes "Fixed Route Shuttles" and "On-Demand Chauffeur" services.
Key Differentiators:
Managed Service Model: Cort Super Admin handles all complexity (Data Entry, Route Assignment) for the client.
Hybrid Fleet: Supports both "Gig Economy" Chauffeurs (Public Signup) and "Fixed" Shuttle Drivers (Private Assignment).
Dynamic Financial Engine: Automates complex B2B invoicing based on fuel price fluctuations and contract-specific variables.

2. User Roles & Access Control
Role
Platform
Description
Super Admin (Cort)
Web Portal
The God Mode. Approves drivers, whitelists vehicles for clients, uploads employee rosters, assigns routes, configures pricing contracts.
Company Admin (Client)
Web Portal
The Manager. Books chauffeurs (restricted to whitelisted cars), manages employee status (Active/Inactive), views financial reports.
Chauffeur Driver
Mobile App
Public User. Signs up via App (Bring Your Own Vehicle), waits for approval.
Shuttle Driver
Mobile App
Private User. Account created manually by Super Admin.
Employee
Mobile App
The Passenger. Read-only access. Scans QR to board shuttles or verify chauffeur rides.


3. Functional Modules
Module A: Super Admin Portal (Web)
The Control Tower – Operations & Configuration
A.1 Driver Onboarding & Management
Shuttle Drivers (Private): Admin manually creates username/password and hands credentials to the driver.
Chauffeur Drivers (Public Queue):
Admin views "Pending Signups."
Reviews License, CNIC, and Car Photos.
Action: Approve (Activates account) or Reject.
A.2 Client Configuration (Vehicle Whitelisting)
Purpose: Define which cars a specific company is allowed to book.
Action: In Company Profile, Admin checks boxes for "Allowed Vehicles".
Example: For "Engro", Check [x] Corolla, [x] Fortuner. Uncheck [ ] Mehran.
Result: Engro Company Admin will only see Corolla and Fortuner in their booking dropdown.
A.3 Bulk Operations (The Onboarding Engine)
CSV Importer: Upload "Master Roster CSV" provided by Client.
Fields: Name, Phone, Email, Employee_ID, Route_ID,Address.
Auto-Assignment: System creates user accounts and immediately links them to the Route ID specified in the CSV.
Credential Export: Admin downloads a "User Credentials Sheet" to email to the Client HR.
A.4 Financial Configuration (Contracts)
Global Fuel Price: Input current Petrol/Diesel price (e.g., 280 PKR).
Fuel Consumption Master: Define km/L for every car type (e.g., Corolla = 10km/L).
Vendor Contracts (Chauffeur):
Contract %: The agreed revision percentage (e.g., 0.1).
Base Fuel Price: The price at which the contract was signed.
Auto-Revision: If Global Fuel Price changes, system auto-updates rates based on Contract %.

Module B: Company Admin Portal (Web)
Client Management & Booking Hub
B.1 Employee Management (Maintenance Mode)
View List: Read-only view of the roster uploaded by Cort.
Actions:
Edit: Update phone/email.
Deactivate: Revoke app access for employees who leave the company.
Restriction: Cannot create routes or assign bulk users.
B.2 Chauffeur Booking Engine
Vehicle Filter: The "Car Type" dropdown is filtered based on the Whitelist set in A.2.
Booking Logic:
Passenger: Select from Employee List.
Usage Package:
Spot: 5-Hours / 10-Hours / 24-Hours.
Monthly: Monthly (10-Hours Daily) / Monthly (24-Hours Daily).
Trip Type: In-City / Out-Station.
Time: Now (Immediate Dispatch) or Scheduled.
Matching: System broadcasts request only to available drivers with the specific car model.

Module C: Driver App (Mobile)
Service Execution Logic
C.1 Chauffeur Mode (Ride Hailing Flow)
Job Card: Passenger Name, Pickup, Drop-off, Package Type.
Workflow: Start Trip→Arrived → Passenger Onboarded →Passenger Offboarded →End Trip.
Expenses:
Toll Tax: Manual input field at end of trip.
Parking: Manual input field.
C.2 Shuttle Mode (The "Smart Loop" Logic)
Scenario 1: Morning (Pickup)
Route: Start →Stop 1 →Stop 2 →Office.
Validation: Passenger scans QR on entry. Manifest updates.
Scenario 2: Evening (Return Drop-off)
Route Logic: Reverse Order (Last Morning Pickup = First Evening Drop-off).
The "Start Ride" Interlock (Critical):
Bus is at Office. "Start Ride" button is Disabled (Grey).
Boarding: Employees scan QR to board.
Validation: Driver checks Manifest.
If everyone scanned: Button turns Green.
If someone is missing: Driver must tap their name and mark "Absent/Skipped".
Unlock: Once all names are resolved, Driver can tap "Start Ride."
Drop-off Timestamp:
Driver arrives at Stop 1.
App prompts: "Dropping Ali & Hashir?"
Driver taps "Confirm Drop". System logs the Drop-off Timestamp.

Module D: Employee App (Mobile)
Unified Passenger Experience
D.1 Dashboard
My Shuttle: Shows the fixed route assigned by Super Admin.
My Chauffeur: Shows active bookings made by Company Admin.
D.2 Scan-to-Board
Morning: Scans to validate pickup at home/stop.
Evening: Scans to validate boarding at office (required to unlock Driver's app).

Module E: Financial & Invoicing Engine
Strictly Aligned with Uploaded Invoices
Invoice: (Active Vehicles X Monthly Rate).
E.1 Shuttle Invoicing (Per Invoice 1150)
Billing Model: Pay-Per-Trip (or Pay-Per-Day).
Logic: (Count of Completed Trips) * (Fixed Route Cost).
Deductions: Logic to detect if a trip was missed (System Logs).
Output: "Particulars: Karachi to DFML - Bus | Qty: 2 | Rate: 30,000 | Total: 60,000".
E.2 Chauffeur Invoicing (Per Invoice 1151)
The system calculates the final Trip Cost by summing Fixed Services + Variable Expenses.
1. Service Charges (Fixed):
Base Package: Cost based on Car Type & Package (e.g., 4,300 PKR).
Outstation Fee: Added if Trip Type = "Out-Station".
Overtime (The Hybrid Rule):
Spot Booking: (Trip Hours - Package Hours) * OT Rate.
Monthly Booking: System tracks daily usage. Sum(Daily Hours - Daily Limit) * OT Rate calculated at month-end.
2. Expenses (Variable/Reimbursable):
Fuel Cost:
Formula: (GPS Distance / Car Mileage) * Global Fuel Price.
Note: Car Mileage is defined in Vehicle Master (e.g., 10km/L).
Toll/Parking: As entered by Driver.
Accommodation: If Trip Duration > 24 Hours, add Accommodation Fee.
3. Auto-Revision (Contract Logic):
Trigger: Super Admin updates Global Fuel Price.
Calculation: New Rate = Old Rate + (Change % * Contract %).

4. Notification & Safety Suite
4.1 Safety Features
SOS Panic Button: Long-press (3s). Alerts Super Admin + Company Admin.
Route Deviation: Alert if Shuttle moves >1000m off assigned path.
4.2 Notification Matrix
Employee: "Bus Arriving in 5 mins", "Chauffeur Arrived".
Admin: "SOS Alert", "Trip Started", "Trip Ended".
All notifications go to superadmin by default

5. Technical Architecture
Database: PostgreSQL + PostGIS (Required for geospatial route & stop logic).
Real-Time: WebSockets (Socket.io) for live map tracking.
Backend: Node.js or Python (Django/FastAPI).

6. Deployment Strategy
Data Collection: Client provides Employee CSV + Vehicle Requirements.
Setup: Cort Admin uploads CSV, whitelists vehicles, assigns routes.
Handover: Cort generates credentials and hands over to Client HR.


