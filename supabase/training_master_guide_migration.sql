-- =====================================================================
-- DXE Solutions — Master Guide training content
--
-- Adds the firm's real-world construction/permitting process guide
-- (previously only a slide deck) as training_steps rows under
-- project_type = 'General', continuing after the existing 14 rows
-- (sort_order 1-14, which cover the DXE Solutions *app/portal*
-- workflow, not the physical construction process — no overlap).
-- =====================================================================

insert into public.training_steps (project_type, title, description, sort_order) values

('General', 'MEP Plan Check', $d$You can submit in person or through eplans — mostly done through eplans these days.
If in person: schedule a day for submission.
If eplan submittal: submit via Angelino account (scan hard copies if you don't have the electronic version).

Plan Review Questions:
Call Center (213) 473-3231
IT Support (213) 275-3434
https://dbs.lacity.gov/services$d$, 15),

('General', 'If You Fail to Plan, You Plan to Fail', $d$Before the day ends, gather your notes/thoughts and prepare for tomorrow. Making an agenda for the day helps you be productive, organized, and able to reach out or communicate with whoever you need to in a timely manner.

1. Look at the calendar
2. Go through the previous meeting's To-Do list
3. Talk to the team
4. Figure out what needs to be done at all projects for the next day (what's urgent)
5. Schedule/reach out to City, Subs, Deliveries, etc. in a timely manner
6. Follow through until the end$d$, 16),

('General', 'The Process — 16 Phase Overview', $d$1. Demo/Grading
2. Pre-Construction
3. Foundation
4. Utilities
5. Framing
6. Meter Spots
7. Rough Mechanics (Plumbing, HVAC, Electrical)
8. Solar Panel Process
9. Exterior Lath
10. Roofing
11. Drywall
12. Stucco
13. Finish Carpentry
14. Kitchen Cabinets
15. Hardscape/Landscape
16. Finals$d$, 17),

('General', 'Grading Bond Contact', 'Grading Bond: 818-881-1011', 18),

('General', 'Before Construction', $d$Pull the RTI permit and then we begin.

- Site check: overhead wire, tree pruning, neighbor fence, etc.
- Team meeting on Mondays / precon project meeting
- Any upcoming events — post on the calendar (even if just meeting w/ a sub)
- Communicate with the team on the group chat
- Always get any confirmation on text or email before taking action
- Take lots of pictures when visiting projects and inspect them at each visit
- Be aware of who is at the project and what they're there for
- If unsure, have questions, or simply don't know something — communicate with Herbert
- If you encounter a situation and solve it, write down how it was solved so we know what to do next time (let Dixie know to put it in the SQC Guide book)$d$, 19),

('General', 'Pre-Construction — Office (In House)', $d$- Insert ALL permit numbers into your LADBS app & make sure Field does too
- Create "Permits & Document" and "Receipts & Invoices" folders for the office
- Update the SQC/RA Drive with new project folders (correct folder — RA or SQC): Accounting, Invoices, Material Takeoff, Project Documents, Project Managers
- Scan permits and any other documents Herbert has into the drive
- Make copies/scan the approved set of plans
- Start foundation takeoff & get a quote (Paul-Ganahl)
- Send plans to all subcontractors (check w/ Herb first)$d$, 20),

('General', 'Pre-Construction — Office (City Work)', $d$- If demo needed, call DigAlert (811 or (800) 422-4133) — communicate with field to mark the location in white spray paint before DigAlert goes out
- Apply for parking permit & no-parking signs (LADOT)
- Get temporary power pole permit (LADBS) and pay with LADWP
- Order temporary power pole (Porta Kan) — confirm w/ Herbert first if owner or us is ordering
- Order portable toilets w/ sink (West Coast Sanitation)
- Start utilities
- Start highway dedication
- Start CofO process for all clearances
- Pull an A-Permit if tree pruning is required
- Start the electrical process with DWP if it's a 600 amp project
- Apply for temp fire hydrant water service if needed (check w/ Field first)
- Check with Field if any overhead wire at the site needs to be relocated$d$, 21),

('General', 'Pre-Construction — Field (Part 1)', $d$- Insert ALL permit numbers into your LADBS app (ask Office if you don't know them)
- If demo needed, spray the demo area in white paint for DigAlert before they go to site
- Check for overhead wire clearance — let the Office team know if overhead wire is a problem
- Install chain & lock on property gates
- Get boundary survey from Amin (pick up the WET stamped document)
- Check: gas meter/line abandoned, electrical meter & service removed, water services on property working
- Make sure the grading worker knows where survey points are & be careful with them$d$, 22),

('General', 'Pre-Construction — Field (Part 2)', $d$- Call soil engineer for compaction report
- Have plumber install water pipe for hose
- Mark where the temp pole is locating
- Post LADBS construction site notice
- Remind Herbert to get us the SQC marketing sign
- Take pictures & measure sewer line location from property line
- Verify w/ grading sub if temporary fire hydrant water service is needed — if so, let office know
- Check if portable toilet w/ sink is on site (check w/ office team first)$d$, 23),

('General', 'Construction — Foundation (Inspections)', $d$For inspections, take the document folder & approved plans.

- Arrive early to make sure we're ready and nothing prevents us from passing inspections
- Make sure there's parking for the inspector; if someone is parked on our property, call to tow (parking permit # in drive, call (213) 485-4184)
- While waiting, in spare time, look over the to-do list and move any other jobs you have control over — make calls/texts/emails
- If it passes, let office know to cancel any upcoming inspections not needed

Use spare time to go over each document in the folder to learn and be aware — see it as an opportunity to understand the process of a project from start to end.$d$, 24),

('General', 'Foundation — Office (Part 1)', $d$- Verify if any document/permit is needed for the inspection folder & make sure they're scanned in the drive (talk to Herbert first)
- Schedule foundation material delivery after trenching
- Start framing takeoff and get a quote (Paul-Ganahl)
- Start utilities
- Follow up on temp pole delivery — owner handles delivery and payment (check w/ Herb first)
- Verify inspector released power for the temp pole
- Ask inspector for "verification sent" on CofO clearances & contact Public Works or the work requested for CofO
- Call sewer sub if public works needed (Mike or Jesse)$d$, 25),

('General', 'Foundation — Office (Part 2)', $d$- Start CofO process for all clearances
- Get load calc & single line diagram from Perfect Design
- Get quotes for window/sliding door takeoff, verify T24
- Verify all inspections are approved in the system
- If any inspections aren't approved or are only partially approved, follow up with Field: see if anything is needed from your end, confirm they've scheduled whoever is needed to fix the correction, make sure the next inspection has been scheduled (coordinate with Field/Herb first)

During construction, if you need to reach out to any subcontractors for field work, talk to Field & Herbert first. Let's prevent miscommunication, unnecessary communication, and any chance of making the company look unprofessional.$d$, 26),

('General', 'Foundation — Field (Part 1)', $d$- Verify setback dimensions & all pad/footing sizes before excavating
- Verify pad/grade beam trench size for structural steel (if needed)
- Schedule foundation form survey & elevation point marked on the property after forming
- Confirm foundation material delivered and correct
- Schedule underground plumbing in a timely manner
- Ask electrician sub for underground service electrical pipe locations
- Ask electrician sub for slab electrical pipe location for kitchen islands (if any)
- Structural inspection sheet — foundation
- Foundation quality control checklist
- Rent concrete vibrator for footing pour day
- Get 2x4's for concrete raking on slab pour day$d$, 27),

('General', 'Foundation — Field (Part 2)', $d$- Coordinate with the project framer to see if anything is needed
- Towards the end of foundation, start planning all subcontractors needed for the framing process

If slab: order gravel, schedule concrete subs/finishers, etc. Underground plumbing quality control list (Drive - Proj Mngr - Proj - 4th Tab)

If steel: get the deputy inspection form for steel drypack/welding & material certification; take photos of structural steel attachment before installing the rest of the grade beam; verify structural steel columns are level after being placed$d$, 28),

('General', 'Construction — Framing (Overview)', $d$Types of buildings: slab and raised.

At this point there are a few more tasks to keep in mind. During Monday meetings, Office & Field should coordinate on tasks needed from each other to complete their work. Follow through until the end with reminders, doing favors for one another, and communicating. It's important to be on the same page — we're a team, so let's work as a team.$d$, 29),

('General', 'Framing — Office (Part 1)', $d$- Schedule framing delivery (talk to Field/Herb first)
- Order windows/sliding doors at the beginning of framing with the best vendor bid (stay on top of long lead-time windows) & schedule delivery after framing
- Order smoke vents/roof hatches (the 2-in-1, or one of each per unit on the top floor)
- Order exterior doors & locks (if special order) — speak to owner on door design
- Send plans to the solar panel subcontractor for bid (Nate)

If raised: underground plumbing quality control checklist (Drive - Proj Mngr - Proj - 4th Tab); verify all inspections approved (mechanical, insulation, subfloor plywood)$d$, 30),

('General', 'Framing — Office (Part 2)', $d$- Schedule second and third story lumber according to the framing schedule (Paul Ganahl) — talk to Field/Herb first
- Start finish carpentry material at the beginning of framing to have it done in a timely manner
- Schedule electrical meter spot w/ ESR when framing finishes (do in-house work as of the beginning of framing)
- Schedule gas meter spot w/ Field Planner when framing finishes (do in-house work as of the beginning of framing)
- Follow up on water meter installation
- Verify all inspections approved at every stage of framing
- Confirm height survey was scheduled when the roof is finished
- Check the BOE portal for all clearances needed (A-Perm, S-Perm, Hwy Ded, etc.)$d$, 31),

('General', 'Framing — Field (Part 1)', $d$- Disperse & remove remaining dirt/materials
- Clean the site for framers to begin
- Make sure framing material was delivered and is correct
- Install drywall between stairs and wall for fire walls
- Mark W's on the sidewalk curb once Office gets notice of payment received from LADWP
- Make sure the meter spot is NOT in the parking area & has 3' clearance in front
- Measure heights of all floor elevations at each framing stage (1st floor, 2nd floor, 3rd floor, roof elevation)
- Order scaffolds (when scaffolds come down, let Office know to schedule gas installation and have the trench ready for SoCalGas)
- Measure headers and window elevations (confirm egress windows)
- Coordinate with Solar to install Flex$d$, 32),

('General', 'Framing — Field (Part 2)', $d$- Check roof slopes (take marbles) & plywood nailing
- Schedule height survey when the roof is finished
- Framing quality control checklist at all framing floor stages
- Structural inspection sheet — 1st floor, 2nd floor, etc. (it's important to check the framing at each stage to make fixes before it's too late)
- Level doors, windows, etc. to have the framer fix
- Call for inspections when needed
- Schedule all subs in a timely manner (fire sprinkler, plumber, HVAC, electrical, solar, roof gutters, steel if any, etc.)
- Coordinate with Herbert on when to start pavers
- Communicate with the paver guy about LID before they begin (talk to Office)
- Prepare for finish carpentry$d$, 33),

('General', 'Temporary Power', $d$Note: check https://bizfileonline.sos.ca.gov/search/business for the Secretary of State # and owner info (business LLC name).

LADBS portion:
1. Confirm if the owner will take care of this or if we are (check the contract)
2. Pull the LADBS electrical permit for the temp pole (Express Permit): https://dbs.lacity.gov/services/plan-review-permitting/plan-check-permit/express-permits
3. Owner is responsible for ALL city fees — send owner a payment link
4. Once owner pays, place it in the drive & text the team the permit number so everyone can insert it into their LADBS app
5. Schedule Porta Kan for pole delivery & complete the DWP temp pole process

LADWP portion:
1. Create temp service for temp meter: https://www.ladwp.com/small-temporary-electric-service-request
2. Send owner the temp power pole forms (found in drive)
3. To start temp meter service, owner must provide a check before your DWP visit & take all docs — schedule or walk in at 2417 Daly St, Los Angeles, CA 90031 (bring electrical temp pole permit, all completed temp pole forms, owner's check & your ID)
4. After service is paid, before leaving LADWP with the receipt, request the meter install work request number
5. Once the temp pole is installed on site, reach out to ESR for temp meter install: https://www.ladwp.com/construction-services/construction-and-renovation-electric-service-requests/find-right-person$d$, 34),

('General', 'Temporary Power Pole', $d$1. Call Porta Kan to schedule a pole delivery — 562-463-8282. Have the owner fill out the card authorization form (in drive) & email it to portakansiteservices@gmail.com. Owner is responsible for pole rental unless Herb says otherwise.
2. Communicate with the PM and have them mark the temp pole location on site before Porta Kan goes out — have the PM send you a picture of the temp pole location.
3. After the temp pole is installed on site, call LADBS inspection under the temp pole permit — schedule on the LADBS app or website (https://www.ladbsservices2.lacity.org/OnlineServices/?service=rfi), schedule for final and service release, text details in the inspector group chat & update the calendar.
4. Once the inspector releases power, reach out to LADWP ESR for temp meter install and get a date and time: https://www.ladwp.com/construction-services/construction-and-renovation-electric-service-requests/find-right-person$d$, 35),

('General', 'DWP Links', $d$Click "Track Service Requests" to view the progress of your installation.

Find the right person: https://www.ladwp.com/construction-services/construction-and-renovation-electric-service-requests/find-right-person

"Guide to Electric Service" provides an overview of the process for requesting new or revised electric service.

Other helpful links: Temporary Service, Solar Installation, EV Charger(s) Installation, Encroachment Permits, Electric Inspection Request, Codes and Specifications, Upcoming Events/Workshops$d$, 36),

('General', 'DWP — Electrical Service Removal / Overhead Wire', $d$DWP website: https://www.ladwp.com/construction-services/construction-and-renovation-electric-service-requests/removal-electric-facilities
Contact the LADWP Connection Center at (213) 367-6937.

Meter and service removal: call the LADWP Customer Contact Center at 1-800-DIAL-DWP (1-800-342-5397).

LADWP pole or wire removal: submit an encroachment application (see Encroachment Permits).

Other LADWP facilities removal (transformer or other equipment on private property): submit a removal request letter from the property owner, a site plan identifying the facilities to be removed, and a Service Planning Information Form, via email. Projects north of Mulholland Drive: PowerNewBusinessVSP@ladwp.com. Projects south of Mulholland Drive: PowerNewBusinessMSP@ladwp.com.$d$, 37),

('General', 'LADWP — Encroachment', 'https://www.ladwp.com/doing-business-ladwp/real-estate/encroachments', 38),

('General', 'LADWP Electrical Meter (400 Amp)', $d$Create the load calc & single line diagram before filling out the application. Keep in mind we might need to change the T24 HVAC and water heaters — speak to Herbert first (EV chargers, garage doors, unit addresses, and unit area sqft are found on the plans).

If it's a 400 amp project, email the assigned ESR the following documents and request a date/time for a meter spot:
a. Apply on LADWP for the electrical meter (refer to your load calc): https://myaccount.ladwp.com/ladwp/faces/wcnav_externalId/r-cs-rq-meterspot
b. Service Planning Information Form
c. Load Schedule
d. Plot Plan (site plan page in plans)
e. Single Line Diagram

Find the assigned ESR via LADWP "Find the Right Person": https://www.ladwp.com/construction-services/electric-services/find-right-person$d$, 39),

('General', 'LADWP 600 Amp Electrical Meter', $d$If it's a 600 amp project, you need to create electrical plans and get them approved by LADBS/the city.

For the LADWP process, apply here: https://www.ladwp.com/construction-services/construction-and-renovation-electric-service-requests
1. Residential & Subdivision
2. Single Family Residence
3. Fill out the application and refer to the project's load calc
4. Email the LADWP engineer

Find the assigned DWP engineer via "Find the Right Person": https://www.ladwp.com/construction-services/electric-services/find-right-person$d$, 40),

('General', 'Tracking the Project for Electrical Meter Installation', $d$LADWP tracker: https://wmis.powersystem.ladwp.com/
Electrical Service Manual: https://www.ladwp.com/sites/default/files/2024-05/Electric%20Service%20Requirements%20Manual.pdf

Once the work request has been released to the construction department, call that department depending on the project district. Ask if the project has been assigned — if so, what crew #, crew lead info, and any additional work request info you should have.

- Palms District: 213-367-5500
- Central Const. Dist.: 213-367-6321
- Service Planning: 213-367-6000
- (Missing Lincoln & West district numbers)$d$, 41),

('General', 'LADWP — Temp Meter Extension / Closeout', $d$If you need to extend the temp meter rental period, call Water New Business at (213) 367-2130 at least two weeks before the scheduled removal date. To close out the account once you're done, call Customer Service at (800) 342-5397.$d$, 42),

('General', 'LADWP Water Meters — Limits & Sizing', $d$All projects are allowed up to 5 water meters (4 new water lines plus the existing). Talk to Herbert to confirm the sizes and amount before submitting the application.

Sizes offered: 1", 1-1/2", 2", and 3". Projects needing a 2"+ water line require a plumbing permit.

If the project exceeds 5 units:
1. Contact a licensed plumber to pull the plumbing permit requesting the size of water service needed, and email the project's water LADWP representative the permit so they can provide a cost letter. Our plumber attaches pipes to each unit and the owner creates their own water billing system for each tenant.
OR
2. Talk to Herb & the owner about making the existing water line and as many of the new 4 lines as possible 1-1/2" — our plumber attaches individual pipes to the remaining units, and the owner still creates their own billing system for each tenant.$d$, 43),

('General', 'LADWP Water Meters — Application Steps', $d$1. Using the owner's information, fill out the water service request form online: https://myaccount.ladwp.com/ladwp/faces/wcnav_externalId/p-cs-ws-iu-sml-ser-frm
2. Send the owner the cost letter & SDRF (Street Damage Restoration Fee — sent after the cost letter is paid). Field needs to mark W's at the site with a spray can (5ft from the driveway, 3ft from any post).
3. Once assigned to a field rep, schedule a day/time for the field rep to do the work and put it in the shared calendar.

This process can take weeks to months depending on how fast owners pay and how quickly the field rep responds.
Tracker: https://mywaterservice.waterapps.ladwp.com/JobTracking.aspx

LADWP Water New Business: 213-367-2130
LADWP Power Connection Center: 213-367-6937$d$, 44),

('General', 'SoCalGas Gas Meter — Application', $d$1. Application (never need an estimate, go straight to the application): https://gis.socalgas.com/CostEstimator/#/residential-application
2. Contract — sent to owner; follow up to make sure they got it, since they need to sign & pay.
3. Payment — owner must pay, then we follow up with SoCalGas.

Address verification: use the Multiple Application Worksheet if the project is 4 units or more; otherwise call SoCalGas and verify over the phone.$d$, 45),

('General', 'SoCalGas — Gas Line Installation & Manifold', $d$Schedule gas line installation once the scaffolds are down:
- Request to install the manifold the same day as the gas line installation
- Our guys dig the trench for SoCalGas to do the installation — provide sandbags in case the crew requests them (trench must be ~30 inches deep and 12 inches wide)
- Make sure address/billing info has been sent
- Call the crew back out for the manifold if they didn't want to install it during gas line installation
- Follow up with LADBS for houseline release during final

Abandoning a gas line for demolition: https://www.socalgas.com/business/builder-services$d$, 46),

('General', 'Main Websites for CofO', $d$LADBS: https://www.ladbs.org/
BOE: https://engineering.lacity.gov/permits
LID: https://lid.lacitysan.org/
Navigate LA (to determine clearances): https://navigatela.lacity.org/navigatela/$d$, 47),

('General', 'S-Permit', $d$This permit is subcontracted out — coordinate with the PM to schedule the work.

- Best to get this out of the way at the beginning of the project or after scaffolds come down
- Remind the PM to have the plumber stub out the sewer line ready for the S-Perm sub
- Get a quote and confirm with the owner first before proceeding (have it documented)
- Request the S-Perm from the sub the moment payment is made (owner pays this permit unless Herb says otherwise)
- Follow up with the sub on progress for clearance
- Once they pass their final, clear the permit on the BOE virtual counter: https://engpermits.lacity.org/public/Home/Services
- Have ALL building permits & the S-Perm ready to provide
- Before logging off from a meeting, check the LADBS building permit status for clearance: https://www.ladbsservices2.lacity.org/OnlineServices/?service=plr

Bureau of Contract Administration dispatch: https://bca.lacity.org/dispatch
City of Los Angeles, Dept. of Public Works, Bureau of Contract Administration
1149 S. Broadway Suite 300, Los Angeles, CA 90015
Main Office (213) 847-1922 — BCA.Webmaster@lacity.org$d$, 48),

('General', 'A-Permit', $d$Pull the permit through BOE: https://engineering.lacity.gov/ — Permits & Services > Customer Portal/Services > Construction A-Permit. Use "Customer Service Request" for questions/requests, or "Virtual Counter" for immediate assistance on a virtual call.

Schedule an A-Permit inspection by calling (213) 485-5080 or online: https://bcainspection.lacity.org/bcaapp/scheduling

Design standards: https://engpermitmanual.lacity.org/construction-permits/design-standards
- Driveway Design Standards: http://eng2.lacity.org/techdocs/stdplans/s-400/S-440-4.pdf
- Standard Plan S-442-6 (Curb Ramps): https://eng2.lacity.org/techdocs/stdplans/s-400/S-442-6.pdf
- Codes: https://codelibrary.amlegal.com/codes/los_angeles/latest/lamc/0-0-0-158067

Traffic control can be determined on Navigate LA (https://navigatela.lacity.org/navigatela). All traffic control permits require a draft submitted — it does not need to be stamped or professional. Reference: https://ladot.lacity.gov/sites/default/files/documents/standard-plans_2-lanes-each-no-bike_0.pdf$d$, 49),

('General', 'Urban Forest Tree Permit — Check Status', $d$https://myla311.lacity.org/portal/faces/home/service/search-sr
https://myla311.lacity.org/portal/faces/home$d$, 50),

('General', 'Parks & Rec CofO', $d$Keep in mind: ADUs are not subject to the Recreation and Parks Fee. Reach out to rap.parkfees@lacity.org / (213) 202-2682 and let them know it's an ADU, providing the permit number and project address for clearance.

For the rec and park CofO to clear, it needs to be paid. Email rap.parkfees@lacity.org & Eng.lapermits@lacity.org — an application needs to be completed with a copy of the building permit and demolition permit attached. Application: https://www.laparks.org/planning/park-fees

If you have the demo permit numbers but not the permit itself, pull the doc here: https://www.ladbs.org/services/check-status/online-building-records — search by document number, look for "Building Permit" under Document Type, click the digital image icon, then the hyperlink in the popup to get the PDF.$d$, 51),

('General', 'Highway Dedication', $d$Highway Dedication is the amount of footage the city requires from the project to widen the street in the future — that property amount becomes part of the sidewalk. It's shown on the site plans; confirm on the BOE service request portal by sending a message: https://dscsr.lacity.org/Home. Clear Highway Dedication BEFORE getting the A-Permit.

Need the IOD (Irrevocable Offer to Dedicate). Flow chart: https://engpermitmanual.lacity.org/other-boe-permitsprocesses/technical-procedures/01-dedication-processing
1. Paperwork
2. Fees
3. Investigation & investigation letter
4. Sent to Survey department
5. Survey department sends it to Real Estate Division (Lee or Jorge)
6. Back to BOE to get the IOD$d$, 52),

('General', 'Rent Control Clearance', $d$This usually comes up when applying for a temporary power pole/electrical permit/ADU conversion through the LADBS Express Permit.

1. Schedule an appointment (no same-day virtual counter option): https://appointments.lacity.org/apptsys/Public
2. Fill out the service: Agency/Department = LADBS, Service = Express Permit, Office = Virtual Counter
3. Fill out requested info: Reason for appointment = "Rent Control Clearance", Explanation (e.g. "Need Temporary Power Pole Permit"), Project Address
4. Attach the 3 required documents (talk to Dixie, she has them on her desktop):
   - Primary Renovation Work: https://housing2.lacity.org/wp-content/uploads/2020/12/Primary-Renovation-Work-Checklist.pdf
   - Signature Declaration Form: https://ladbs.org/docs/default-source/forms/plan-check-2014/signature-declaration.pdf
   - Electrical Permit: https://ladbs.org/docs/default-source/forms/plan-check-2017/application-for-electrical-permit-pc-elec-app-02.pdf
5. Choose the soonest available date and put it on the SQC shared calendar$d$, 53),

('General', 'LA Sanitation — Clear LID', $d$Apply on LID for the project: https://lid.lacitysan.org/CFO/SubmitApplication

Needed: Virtual Counter, SOR Form (there's a small-scale version for 4 units or less, and a big-scale version for 5+ units — the big scale requires the designer to sign and stamp it), pictures, and approved LID plans.$d$, 54),

('General', 'Landscaping Amount for Rain Barrels', $d$All rain barrels must have a paver base or 2 inches of gravel under each gallon. They require vegetation (landscape) around them for irrigation. If the plans don't show the sqft of landscape needed, use this equation: Gallons Required ÷ 3 = SQFT of Landscaping$d$, 55),

('General', 'Public Works — Flood Clearance', $d$Submit the LADBS building permit application, the stamped plans from the flood clearance plan review, and the filled-out Elevation Certificate (EC) for review.

Photo notes for the EC document:
1. Include the date each photo was taken (approximate dates OK)
2. Only finished construction photos are acceptable
3. Photos of all flood vents with tape measurement showing the bottom of each vent is within 12 inches of adjacent grade
4. Photos of all electrical equipment/machinery with a measuring tape to the bottom of the equipment
5. All measuring-tape photos need a close-up so the exact height is visible
6. On EC pages with photos, insert only 1 photo per box (max 2 photos per page), enlarged to maximize space

If you received flood clearance during the permit review phase and haven't completed the EC, download it from FEMA's website (National Flood Insurance Program Underwriting Forms). Section D must be stamped and signed by a CA licensed Land Surveyor or Civil Engineer.$d$, 56),

('General', 'LADOT', $d$https://docs.google.com/forms/d/e/1FAIpQLSc_1X63w1f-qlUUNYmZH4ily8f6WilURtFQhZ0ITMpUfsrDqA/viewform
https://ladot.lacity.gov/businesses/traffic-engineering-design-plans$d$, 57),

('General', 'Building Permit Update (Contractor Change)', $d$If we need to change the contractor info on an existing building permit and the plan checker says to do it via Express Permit:
- Create an appointment for each permit
- Fill out applications (other city forms: https://www.ladbs.org/search-results?indexCatalogue=site-search&searchQuery=building%20application&wordsMode=AnyWord)
- Building Permit Application: https://ladbs.org/docs/default-source/forms/plan-check-2023/application-for-building-permitor-grading-and-certificate-of-occupancy-pc-str-app01.pdf
- Signature of Declaration Attachment Form: https://ladbs.org/docs/default-source/forms/plan-check-2014/signature-declaration.pdf$d$, 58),

('General', 'Alhambra Projects — City Portal', $d$1. Google "City of Alhambra Building & Safety": https://www.cityofalhambra.org/192/Building-Division
2. Building Division Inspection Request
3. Mark on the SQC shared calendar$d$, 59),

('General', 'Pasadena Projects — City Portal', $d$1. Google "Pasadena Building & Safety": https://www.cityofpasadena.net/planning/permit-center/permit-center-online/
   Or: https://epicla.lacounty.gov/energov_prod/selfservice — Login: Hfconst@yahoo.com / PW: SQConstruction2231
2. Click Inspection Portal
3. Type in the permit or address
4. Make sure the correct permit is inserted when scheduling an inspection
5. Once everything is finaled, a CofO application must be submitted for CofO to be issued for new construction — within 90 days after final; application takes 7-10 business days.
   - Ariana: (626) 744-6903, aechaveste@cityofpasadena.net
   - Harry (Bldg Inspector Supervisor): (626) 744-4204, aitchyan@cityofpasadena.net

Pasadena — Electrical & Water: field reps can only be contacted through the city. Utilities Service Planning: (626) 744-4495 (Option 1: Electrical, Option 2: Water). For Electrical, contact Edison through their portal: https://projectportal.sce.com/activity-submit/wfi/36998/4#Submitter$d$, 60),

('General', 'South Pasadena — Inspection Request', $d$Inspection request form: https://forms.office.com/pages/responsepage.aspx?id=193mw8R0a0arI5O2DdY0cFwCCYhwLEBBoALOxSlNp51URTFGT0hQOERIWllGUVQzRUxQV0NSNE8zQi4u&route=shorturl

Edison for meter spot: (800) 655-4555$d$, 61),

('General', 'Southern California Edison — Portal', 'https://projectportal.sce.com/activity-submit/wfi/36998/4#Submitter', 62),

('General', 'Long Beach — Accessing Existing Floor Plans', $d$1. View plans in person: architecturally-drawn plans aren't available online. Visit the Resource Center at the City of Long Beach Permit Center, 411 W. Ocean Blvd., 2nd Floor, Long Beach, CA 90802, to search the database and view plans.
2. Request duplication: plans are public records for viewing but subject to copyright — to get copies you need a "Plan Duplication Application" plus written permission from both the current property owner and the original architect/engineer of record. If you're the current owner, complete the owner authorization form. If the original professional isn't available, discuss other options with Permit Center staff.
3. Contact the Building & Safety Bureau for specific questions: 562.570.PMIT (7648)
4. Online permit records: search general permit history by address on the OpenLB portal (floor plans themselves aren't online, but this may show past renovations/additions that required permits)

If the city has no plans on file (common for very old homes or unpermitted work), you may need to hire a licensed architect or design professional to create new "as-built" plans of the current house.$d$, 63),

('General', 'Building & Safety — Department Services', $d$Development Services Centers: https://dbs.lacity.gov/our-organization/locations-offices
- Metro (Downtown): 201 and 221 N. Figueroa St.
- Van Nuys: 6262 Van Nuys Blvd
- West LA (L.A. One-Stop Rebuilding Center): 1828 Sawtelle Blvd
- South LA: 8475 S. Vermont Ave
- San Pedro: 638 S. Beacon St

Aside from utilities and public works clearances, make sure ALL open permits tied to the property are cleared: https://www.ladbsservices2.lacity.org/OnlineServices/?service=plr — coordinate with the PM but call final for all permits, and follow up with all inspectors on the open permit to see if any documents are needed from us to get CofO.$d$, 64);
