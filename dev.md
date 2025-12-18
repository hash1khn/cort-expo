Module: Super Admin Portal (Cort Operations)
Primary Goal: Complete control over Clients, Assets, Pricing, and Invoicing.
1. Authentication
Admin Login:
Simple Email & Password Login.
Note: No "Sign Up" page. Super Admin credentials are seeded directly in the database.
Forgot Password: SMTP email trigger to reset password.
2. Company (Client) Management
This is the "Parent" entity for everything else.
Create New Company (Onboarding):
Basic Info: Company Name, Address, NTN, Contact Person, Email.
Service Subscription (Toggle Logic):
[ ] Enable Shuttle Service
[ ] Enable Chauffeur Service
Logic: If "Shuttle" is unchecked, hide all Shuttle features for that specific Company Admin.
Vehicle Whitelisting (Chauffeur Only):
Display: List of all active Car Models in the system (Corolla, Civic, HiAce, etc.).
Action: Checkbox selection of which cars this company is allowed to book.
Validation: If Enable Chauffeur is off, disable this section.
Manage Employees (Bulk Roster):
Action: Upload CSV File.
CSV Columns: Full Name, Phone, Email, Employee_ID, Route_ID (Optional).
Logic:
System parses CSV.
Creates User Accounts for every row.
If Route_ID is present, auto-assigns the user to that Route.
Credential Export: Button to download a PDF/Excel of "Usernames & Passwords" to email to the Client.
3. Client Contract Configuration (Pricing)
This controls the billing engine.
Global Fuel Configuration:
Input: Current Fuel Price (e.g., 280.50 PKR).
Action: "Update Price" button.
Trigger: When updated, system checks all Client Contracts for "Auto-Revision" logic.
Create Client Contract (Chauffeur):
Prerequisite: Company must have "Chauffeur Service" enabled.
Base Rates Table: Grid input for each Whitelisted Vehicle.
Columns: Vehicle Type, 5Hr Rate, 10Hr Rate, 24Hr Rate, Monthly (10hr), Monthly (24hr).
Variable Rates:
Overtime Rate (Per Hour)
Outstation Allowance (Per Day)
Driver Accommodation (Per Night)
Fuel Revision Logic:
Input: Base Fuel Price (Price at time of contract signing).
Input: Contract % (The adjustment factor, e.g., 0.2).
Developer Note: Store these values to run the revision formula later.
Create Client Contract (Shuttle):
Prerequisite: Company must have "Shuttle Service" enabled.
Fixed Asset Pricing:
Input: Vehicle_ID (Select from Fleet).
Input: Fixed Monthly Amount (e.g., 150,000 PKR).
Logic: This price is attached to the Vehicle, not the Passenger.
4. Fleet Management (Assets)
Vehicle Repository (CRUD):
Add Vehicle:
Plate Number, Make, Model, Year, Color.
Ownership Tag: Dropdown (Owned vs Partner).
Consumption Master (Crucial for Billing):
Input: Fuel Average (KM/L) for In-City.
Input: Fuel Average (KM/L) for Out-Station.
Logic: The invoicing engine divides GPS distance by this number.
QR Generation: Button to generate/print the PDF QR Sticker for this vehicle.
Driver Management:
Tab 1: Shuttle Drivers (Private):
Action: "Create Account" (Username/Password).
Assignment: Link Driver to a specific Vehicle_ID.
Tab 2: Chauffeur Drivers (Public Queue):
View List: "Pending Signups".
Action: Click to view License/CNIC/Car Photos.
Decision: Approve (Activates account) or Reject.
5. Operations: Shuttle (Fixed Route)
Visible only if at least one client has Shuttle Service enabled.
Route Builder:
Map Interface: Google Maps API.
Action: Draw Polyline (Route Path).
Stops: Click map to drop "Pins". Name the stops (e.g., "NIPA", "Civic Center").
Timings: Set standard ETA for each stop.
Route Assignment:
Select Route.
Assign Client (Who owns this route?).
Assign Driver + Vehicle.
6. Operations: Chauffeur (Dispatch)
Visible only if at least one client has Chauffeur Service enabled.
God-View Map:
Real-time view of all active Chauffeur cars.
Filter: Available vs In-Trip.
Manual Booking (Override):
Super Admin can create a booking on behalf of a Company.
Same flow as Company Admin: Select Company -> Select Passenger -> Book.
7. Financial Engine (Invoicing)
Invoice Generation:
Select Company.
Select Month.
Action: "Generate Invoice".
The Logic (Backend Preview):
Shuttle Invoice: Lists all assigned vehicles for that client. Sums up Fixed Monthly Amount.
Chauffeur Invoice: Aggregates all completed trips. Applies the Rate Card logic (Base + OT + Fuel).
Output: Download PDF (Formatted like DFML/Cybernet sample).


Module: Company Admin Portal (The Client)
Primary Goal: Manage their specific "Tenant" slice of the platform.
1. Dashboard & Access Control
Service Toggles (Frontend Logic):
Check Company_Profile.services_enabled (set by Super Admin).
Condition: If shuttle_enabled == false, hide "Route Roster" and "Shuttle Reports" from the sidebar.
Condition: If chauffeur_enabled == false, hide "Book a Ride" and "Chauffeur Reports".
2. Employee Management (Roster)
View Directory: Data table of Employees linked to this Company ID.
Action - Edit Employee:
Update Phone or Email.
Constraint: Cannot change Employee_ID (Unique Key).
Action - Deactivate:
Toggle Status to Inactive.
Backend Effect: Immediate token revocation for the Employee App (User cannot log in).
3. Chauffeur Booking Engine (The "Order" Form)
Vehicle Selection (Whitelist Logic):
Fetch Allowed_Vehicles array for this Company (e.g., ['Corolla', 'Fortuner']).
UI: Dropdown shows only these models.
Validation: API rejects booking if a non-whitelisted car_type is sent.
Booking Parameters:
Passenger: Select from Employee List.
Trip Type: In-City or Out-Station (Triggers different rates in the Contract Engine).
Package:
Spot: 5hr / 10hr / 24hr.
Monthly: 10hr / 24hr.
Schedule: Date/Time picker.
Live Status:
View active bookings.
Status Polling: Searching -> Driver Assigned -> Arrived -> In Progress -> Completed.
4. Financial Reporting (View Only)
Shuttle Report:
List of completed trips per Route.
Matches Invoice 1150: Shows "Route Name", "Date", "Vehicle".
Chauffeur Report:
List of completed trips.
Matches Invoice 1151: Shows breakdown of "Package Cost" vs "Fuel Cost" (Calculated estimate).


Module: Chauffeur Driver App (Gig/Public)
Primary Goal: Execute trips and capture data for "Invoice 1151".
1. Authentication & Profile
Signup Flow (Public):
Inputs: Name, Phone (OTP), CNIC, License No.
Vehicle Inputs: Make, Model, Year, Plate No.
Document Upload: Camera capture for License Front/Back, Reg Book.
State: Account Status = Pending_Approval. (Login blocked until Super Admin approves).
2. Job Acceptance (Dispatch)
Duty Toggle: Switch is_online (True/False).
Job Card (Popup):
Shows: Pickup Address, Distance to Pickup, Car Requested (to ensure they are in the right car).
Actions: Accept (locks job) or Reject.
3. Trip Workflow (The Invoice Data Collector)
Stage 1: Navigate to Pickup: Google Maps SDK integration.
Stage 2: Arrival: Tap "I have Arrived".
Action: Sends Push Notification to Employee ("Driver is waiting").
Stage 3: Onboarding (Start Billable Time):
Tap "Start Trip".
Backend Action: Capture Start_Timestamp.
Backend Action: Start GPS Tracking (Log lat/long every 100m).
Stage 4: Execution: Driver drives. App calculates cumulative distance.
Stage 5: Offboarding (End Billable Time):
Tap "End Trip".
Backend Action: Capture End_Timestamp.
Backend Action: Stop GPS. Save Total_Distance_Km.
4. Expense Entry (Crucial for Invoice 1151)
Post-Trip Popup:
Toll Tax: Numeric Input Field (Default 0).and toll pic as well
Parking: Numeric Input Field (Default 0).
Validation: Cannot be negative.
Summary Screen: Shows "Earnings" (Note: This is Driver Earnings, not Client Invoice Cost).







Module: Chauffeur Driver App (Gig/Public)
Primary Goal: Execute trips and capture data for "Invoice 1151".
1. Authentication & Profile
Signup Flow (Public):
Inputs: Name, Phone (OTP), CNIC, License No.
Vehicle Inputs: Make, Model, Year, Plate No.
Document Upload: Camera capture for License Front/Back, Reg Book.
State: Account Status = Pending_Approval. (Login blocked until Super Admin approves).
2. Job Acceptance (Dispatch)
Duty Toggle: Switch is_online (True/False).
Job Card (Popup):
Shows: Pickup Address, Distance to Pickup, Car Requested (to ensure they are in the right car).
Actions: Accept (locks job) or Reject.
3. Trip Workflow (The Invoice Data Collector)
Stage 1: Navigate to Pickup: Google Maps SDK integration.
Stage 2: Arrival: Tap "I have Started".
Action: Sends Push Notification to Employee ("Driver is started").
Stage 3: Onboarding (Start Billable Time):
Tap "I have Arrived".
Backend Action: Capture Arrived_Timestamp.
Backend Action: Start GPS Tracking (Log lat/long every 100m).
Stage 4: Execution: Driver drives. App calculates cumulative distance.
Stage 5: Offboarding (End Billable Time):
Tap "End Trip".
Backend Action: Capture End_Timestamp.
Backend Action: Stop GPS. Save Total_Distance_Km.
4. Expense Entry (Crucial for Invoice 1151)
Post-Trip Popup:
Toll Tax: Numeric Input Field (Default 0).
Parking: Numeric Input Field (Default 0).
Validation: Cannot be negative.
Summary Screen: Shows "Earnings" (Note: This is Driver Earnings, not Client Invoice Cost).

🚌 Module: Shuttle Driver App (Fixed Route)
Primary Goal: Validate passengers and log "Trips" for "Invoice 1150".
1. Authentication
Login Only: Username/Password provided by Cort Ops. No signup.
Vehicle Check: System displays "Assigned Vehicle: Van-88". Driver confirms.
2. The Route Interface
My Route: Fetch Route_Details (Stops, Lat/Longs).
Manifest: Fetch list of Assigned_Employees for this route.
3. Morning Workflow (Pickup)
Logic: Standard Order (Stop 1 -> Stop 2 -> Office).
Validation:
Driver App displays QR Code (or Scanner).
As employees scan, their card on the Manifest turns Green.
Goal: Get everyone on board.
4. Evening Workflow (Return - Critical Logic)
Logic: Reverse Order (Office -> Stop 2 -> Stop 1).
The Interlock (Start Constraint):
Initial State: "Start Ride" button is DISABLED (Grey).
Requirement: All employees on the manifest must be accounted for.
Action: Driver scans Employee QRs.
Exception Handling: If Ali is missing, Driver taps Ali's name -> Selects Mark Absent -> Reason: "Left Early".
Unlock: When 100% of names are status Boarded or Absent, Button becomes ENABLED (Green).
Drop-Off Logic:
Driver reaches Stop 1.
App detects Geofence.
Prompt: "Confirm Drop-off for: Hashir, Bilal?"
Action: Tap Confirm.
Backend Action: Save Drop_Off_Timestamp.
5. Trip Completion
End Route: Tap "Complete Route".
Backend Action: Increment Trip Count for this Route/Client (This adds "1 Quantity" to Invoice 1150).

📱 Module: Employee App (Passenger)
Primary Goal: Simple validation token.
1. Dashboard
My Shuttle:
Displays Route Name (e.g., "Clifton to Tower").
Live Map: Shows location of the assigned Shuttle Vehicle.
My Chauffeur:
Condition: Only visible if a booking exists with passenger_id == current_user.
Shows: Driver Name, Car Model, Plate No, ETA.
2. Scan-to-Board (The Key)
Action: Tap "Board Shuttle".
Camera: Opens Scanner.
Validation Logic:
Scans Driver's QR.
Check 1: Is User.assigned_route == Driver.current_route?
Check 2: Is User_GPS close to Driver_GPS (<50m)?
Result: Success Screen (Green Checkmark).



