**Software Requirements Specification** 

Version: 2.1

**By:**   
Luka Specter  
Ben Neeman  
Henry Shannon   
Tasnim Rahman  
Ruchika Mehta   
Max Iticovici  
Luke Ricciardi

**Advisor:**   
Jeffrey Segall  
**Table of Contents**

[1\. Document History	3](#document-history)

[2\. Introduction	4](#introduction)

[2.1. Purpose	4](#2.1.-purpose)

[2.2. Overview	4](#2.2.-overview)

[2.3. Scope	4](#2.3.-scope)

[2.4. Definitions	5](#2.4.-definitions)

[2.5. Requirements Prioritization	6](#2.5.-requirements-prioritization)

[3\. Functional Requirements	8](#functional-requirements)

[4\. Non-functional Requirements	14](#non-functional-requirements)

[4.1. Human Factors	14](#human-factors)

[4.2. Hardware	14](#hardware)

[4.3. Software	14](#software)

[4.4. Performance	15](#performance)

[4.5. Errors	15](#errors)

[5\. System Evolution	16](#system-evolution)

1. ### **Document History** {#document-history}

| Version  | Date | Modified By | Updates |
| ----- | ----- | ----- | ----- |
| 1.0 | 19 October 2024 | Ruchika Mehta | Initial document setup |
| 1.1 | 26 October 2024 | Luka Specter, Ruchika Mehta | Initial functional requirements and Glossary revision. Addition of the introduction section. |
| 1.2 | 27 October 2024 | Tasnim Rahman | Initial Data Management Requirements |
| 1.3 | 11 November 2024 | Luka Specter | Revised language to clarify event from tournament, revised functional requirements |
| 1.4 | 13 November 2024 | Ben Neeman | Added requirements for tournaments, revised others |
| 1.5 | 14 November 2024 | Luke Ricciardi | Add data flow diagrams  |
| 1.6 | 14 November 2024 | Luka Specter | Converted non-functional and data requirements to list |
| 1.7 | 18 November 2024 | Luka Specter | Complete non-functional requirements |
| 1.8 | 19 November 2024 | Luka Specter | Revise functional requirements |
| 1.9 | 21 November 2024 | Ben Neeman | Added Visuals, updated some requirements and re-worded things |
| 2.0 | 1 December 2024 | Luka Specter, Ruchika Mehta | Formatting pass |
| 2.1 | 4 December 2024 | Luka Specter | Updated intro and requirements to reflect the change from client/server to client with embedded server |

2. ### **Introduction** {#introduction}

#### **2.1. Purpose** {#2.1.-purpose}

TournaFence is designed to improve the management of fencing tournaments by fixing the shortcomings of existing fencing software. It provides an easy-to-use platform for organizers, referees, and participants to create, referee, and view tournaments. To support these goals, we will focus on automating tournament management, in-app bout scoring, providing publicly accessible real-time bout results, and an affordable companion scoring box. This project ensures that the whole process of the tournament, from seeding and pool management to direct elimination (DE) stages, operates as seamlessly as possible, while still adhering to USA Fencing rules.

This document outlines TournaFence's functional and non-functional requirements. It serves as a vital resource for developers during implementation and offers testers a comprehensive guide for validating system features. Furthermore, it provides stakeholders, including tournament organizers and referees, with a clear framework for understanding how the system will enhance and support tournament operations.

#### **2.2. Overview** {#2.2.-overview}

This project involves the development of a comprehensive software solution for fencing tournament management. It supports multiple tournament formats such as pool bouts and direct elimination tables, and integrates features for fencer seeding, score tracking, and referee actions. Key functionalities include:

* **Tournament Creation**: Auto-generation or user-defined naming of tournaments, adding fencers, seeding, and tournament structure setup.

* **Tournament Viewing**: Real-time viewing of pool results, bout order, direct elimination tables, and fencer rankings.

* **Bout Refereeing**: A user-friendly module allowing referees to track bout scores, assign penalties, control timers, and enforce rules.

* **Scoring Box**: A modular scoring box that adheres to USA Fencing rules, providing visual and auditory feedback for scored touches and optional Bluetooth connectivity for automatic score and time synchronization.

#### **2.3. Scope** {#2.3.-scope}

This document represents the software requirements for TournaFence. The first release of this document shall result in providing a fully functional solution for managing fencing tournaments according to the standards set by USA Fencing. Developers will implement the system according to this document so that it is developed per the functional specifications contained herein, while testers will validate the existence of features/functionalities. This document also serves tournament organizers, referees, and other end-users who are interested in knowing how to rely on the system while efficiently managing tournaments underpinning a vision for extending future features.

#### **2.4. Definitions** {#2.4.-definitions}

* **Tournament**: A collection of one or more fencing events held at a venue.

* **Event**: A competitive fencing event where participants (fencers) are grouped into pools or brackets and compete in individual bouts. The tournament progresses through different stages, including pool rounds and direct elimination.

* **Round**: A phase of an event, either a pool or DE

* **Pool**: A round-robin group within an event where fencers compete against each other. Results from pool bouts are used to seed fencers for subsequent elimination rounds.

* **Direct Elimination (DE)**: A knockout stage in an event where fencers progress through a (typically) single elimination bracket. The winner of the bracket wins the event.

* **Bye**: If the number of fencers don't perfectly fit into a DE table, the top fencer(s) will be granted a bye, which lets them skip the first DE.

* **Barrage**: A tie-breaker for events in which the final round is pools, and multiple fencers have secured the same number of bout wins.

* **Seeding**: The process of ranking fencers in an event based on prior performance (e.g., pool results) or external criteria, such as rankings from USA Fencing. Seeding determines match pairings, and is re-calculated after every round based on the fencer's performance.

* **Bout**: A single fencing match between two fencers, typically within a pool or elimination round. The bout consists of several touches and is overseen by a referee.

* **Referee**: The official who oversees a fencing bout, ensuring rules are followed, scoring is tracked accurately, and penalties are assigned where necessary.

* **Scoring Box**: A physical device used to track the score, time, and penalties during a fencing bout. It provides visual and auditory feedback when a touch is scored.

* **USA Fencing**: The national governing body that sets the rules and standards for fencing in the United States.

* **Yellow Card**: A penalty warning issued to a fencer for minor rule infractions. Multiple yellow cards can result in escalation to more severe penalties.

* **Red Card**: A penalty issued to a fencer for significant rule violations, resulting in the opponent being awarded a point.

* **Black Card**: The most severe penalty, disqualifying a fencer from the entire event or tournament.

* **Non-combativity:** If a touch is not scored within a minute, both fencers receive a P-yellow for non-combativity. The next occurrence in the bout will result in a P-red for both fencers. The third occurrence will result in a P-black to the fencer behind on score, or if scores are equal, the lower seeded fencer. A P-black does not eject a fencer from an event like a regular black card.

* **Priority**: A random assignment made by the referee to one of the two fencers in case of a tie at the end of a bout. If a minute passes without a single touch being scored, the fencer with priority wins.

* **Compass Bracket**: A non-elimination format where fencers advance to different brackets depending on whether they win or lose their bouts. 

* **Double Elimination**: An elimination format where a fencer is only eliminated after losing two bouts, rather than a single loss as in a typical DE format.

* **Sharks and Minnows**: An informal tournament format where stronger participants (sharks) face off against weaker participants (minnows).

* **Bluetooth Low Energy (BLE)**: A wireless communication protocol used for transmitting data over short distances, which is energy efficient and used for connecting devices like the scoring box and referee’s app.

* **NFC (Near Field Communication)**: A short-range wireless communication technology that enables devices, like phones or scoring boxes, to exchange information when brought close together, often used for pairing Bluetooth devices.

* **Bracket**: The structure used to organize bouts in elimination stages. It visually represents which fencers will compete based on their results from previous rounds and their seeding.

* **Touch**: A valid hit scored by a fencer on their opponent, registered through the scoring box. The first fencer to land the required number of touches, or has the highest number of touches when time expires, wins the bout.

#### **2.5. Requirements Prioritization** {#2.5.-requirements-prioritization}

* **MUST**: Core functionalities that are essential to the operation of the tournament management system.   
    
* **SHOULD**: Secondary features that enhance the system’s functionality and user experience but are not required for the initial release.

* **MAY**: Features that would further extend the system’s capabilities but are considered optional and will be addressed in future releases based on user demand and project scope.

* Requirements written without the above bolded keywords inherit their parent's priority

3. ### **Functional Requirements** {#functional-requirements}

**Tournament Creation**

1. Users **MUST** be able to create a tournament  
   1. **MUST** have the user input a tournament name  
      2. **MUST** require at least one event be added  
      3. Users **MUST** be able to create events within tournaments they have created

                                
---

**Tournament Management**

2. Users **MUST** be able to manage tournaments   
   1. **MUST** require all events be completed before the tournament is ended  
      1. Events can progress independently of each other  
         2. Events can be ended independently of other events  
      2. Users **MUST** be able to delete a tournament they have created  
      3. Users **MUST** be able to view tournaments in progress after creation  
      4. Users **MUST** be able to invite referees to tournaments  
      5. Users **SHOULD** be able to see old tournaments saved under History  
      6. **MUST** be able to enable the embedded server to allow referees and viewers to join a tournament  
         1. The server **SHOULD** advertise itself on the local network so that other TournaFence instances can find and connect to it  
      7. Users **MAY** be able to be export tournaments as an SQL, JSON, or CSV file

---

**Event Management**

3. Users **MUST** be able to create events for a tournament  
   1. Users **MUST** be able to view created events  
      2. **MUST** generate event name using the format "Age Gender Weapon"  
      3. **MUST** require the user to add at least one round of either pools or DEs  
      4. **MUST** be able to add an arbitrary number of fencers to the event  
      5. **MUST** create a DE (Direct Elimination) table  
         1. Seed using the USAFencing [Seeding Principles](https://assets.contentstack.io/v3/assets/blteb7d012fc7ebef7f/blt66443121e8bc8091/USA%20Fencing%20Athlete%20Handbook%202024-25.pdf) (p. 34\)  
      6. **MUST** allow fencer names to be entered, or selected from a list of existing fencers  
      7. **SHOULD** support additional formats:  
         1. Compass  
         2. Double Elimination  
         3. Sharks and Minnows  
      8. Users **MUST** be able to delete events within tournaments they have created

---

**Pools/DE Management**          

4. The user **MUST** create one or more pools from a list of fencers  
   1. **MUST** Create a bout order in adherence to the official [Order of Bouts](https://teamusa-org-migration.s3.amazonaws.com/USA%20Fencing/Migration/Documents/bout_order.pdf)  
      1. Fencers have a number associated with their name  
      2. **MUST** Allow a referee to select a specific bout and...  
         1. Launch and score from the Bout Refereeing Module  
         2. Manually input the final score for each fencer  
         3. Only allow one referee to have a bout open at a time  
         4. **SHOULD** be able to resume reffing if exiting the app by accident  
      3. **MUST** have a "End Pools" button that locks the pool results and progresses to the next round  
         1. The button must be disabled unless all bouts are complete  
      4. **MUST** allow a DE table to be created once all pool bouts have been completed  
      5. **MUST** generate a results page after all bouts are completed and the pool has been ended

   5. The app must **MUST** create a DE tableau from a list of fencers  
      1. If there was a prior round of fencing, use those results for seeding  
      2. If there was no prior round of fencing, use the seeding method specified during event creation  
      3. **MUST** grant "Byes" to fencers if there aren't enough to perfectly fit a table of 8/16/32/etc 

   6. **MAY** allow a viewer to select a fencer to "follow", highlighting their name in the UI  
   7. **MUST** generate a results page after the final round has been ended

                   
---

**Scoring Module**

8. The app **MUST** allow a user to referee a fencing bout  
   1. **MUST** allow the referee to increment and decrement each fencer's score  
      2. **MUST** allow the referee to start and stop the clock  
      3. **MUST** have a 1 minute passivity timer that is manually reset by the  
      4. **MUST** allow the referee to set the clock to presets of 1, 3, and 5 minutes  
      5. **MUST** allow the referee to assign yellow, red, and black cards to fencers, with a visual indicator  
      6. **MUST** allow the referee to randomly assign priority to a fencer  
      7. **MUST** require the referee to manually select a winner when ending a bout  
      8. **SHOULD** allow the referee to wirelessly connect to a scoring box to track time, score, and fencer names  
      9. **SHOULD** use the event's weapon if the module was launched from one, and if not, allow the weapon to be freely set  
      10. **SHOULD** hide UI elements not needed for the selected weapon  
          1. Double touch button (Epee Only)  
          2. Passivity Timer (Epee and Foil Only)

---

**Referee Management**

9. Users **MUST** be able to invite referees to referee tournaments  
   1. There **MUST** be a link for referees to open in-app to join the tournament  
      2. The tournament creator **MUST** be able to create a whitelist for referees  
         1. the whitelist **MUST** contain a unique device ID and a nickname for the referee  
         2. The user **MUST** be able to disable the ability for non-whitelisted referees to attempt to join  
         3. If a non-whitelisted referee attempts to join, the tournament creator **MUST** be added to a "pending" table with their device ID and provided nickname, which they can verify by looking at the referee's device  
         4. The tournament creator **MUST** be able to add and remove referees  
         5. The tournament creator **SHOULD** be able to change a referees nickname

---

**Scoring Box**

10. There **MUST** be a scoring box users can build themselves using provided instructions  
    1. **MUST** conform to all requirements described in the [USA Fencing Rules](https://teamusa-org-migration.s3.amazonaws.com/USA%20Fencing/Migration/Documents/2023-01_USA_Fencing_Rules.pdf)  
       1. **MUST** conform to Foil requirements (p. 179\)  
          2. **MUST** conform to Epee requirements (p. 182\)  
          3. **MUST** conform to Saber requirements (p. 183\)  
       2. **MUST** play a loud audible sound when a touch is scored  
          1. **SHOULD** allow the sound to be customized  
       3. **SHOULD** allow light colors to be customized  
          1. **MUST** include a red-green colorblind option  
       4. **SHOULD** pair via Bluetooth with the app to share score, time, and fencer names  
          1. **MAY** allow the app to establish the bluetooth connection via NFC   
       5. **SHOULD** have a modular design, where the timer, score boxes, and name displays are all separate "modules" that connect via usb interface to the main score box

---

**Database Requirements**

11. A SQLite database **MUST** be used to store all data in the app  
    1. **MUST** use primary keys and foreign keys to ensure data integrity across tables  
       2. **MUST** use a Write-Ahead-Log to prevent database readers from blocking writers  
       3. **MUST** detect database changes and update the UI for:  
          1. Bout scores  
          2. If a tournament/event/pool is waiting to start, is in progress, has ended  
       4. **SHOULD** store scoring box configurations  
          1. Light color  
          2. Sound effects  
       5. **MAY** create rolling backups that update every X minutes and are retained for X \[hours/days\]  
       6. **MUST** create an audit log of important database interactions:  
          1. Modifying bout scores  
          2. Creating tournaments and events  
          3. Deleting tournaments and events  
          4. Ending a round in an event  
       7. **MUST** allow referees to view the audit log in a table format  
       8. **MUST** detect when data from the scoring box and referee module do not match and prompt the user to select the correct information  
       9. **SHOULD** include an option to export tournament data to an external format (e.g., CSV or JSON) for additional backup or external reporting needs.

4. ### **Non-functional Requirements** {#non-functional-requirements}

   1. #### **Human Factors** {#human-factors}

      1. Types of Users  
         1. Referees who want to run a tournament  
         2. Users who want to view the current state of a tournament  
      2. Technical Proficiency  
         1. Users are expected to know how to:  
            1. Operate their client device  
            2. Pair their client device to another device via bluetooth

   2. #### **Hardware** {#hardware}

      1. The client must have:  
         1. A pointing device:  
            1. Touchscreen  
            2. Mouse  
            3. Trackpad  
         2. Wireless connectivity:  
            1. Bluetooth  
            2. Internet  
            3. NFC (optional)  
      2. The scoring box must:  
         1. Be based off of an Arduino (or similar) microcontroller  
      3. Be modular, with the following modules connected by USB C interface:  
         1. Scoring Lights (the bare minimum for the system)  
         2. A bout clock  
         3. Name lights

   3. #### **Software** {#software}

      1. The client must support the SQLite database  
         2. The client should run on  
            1. The latest supported MacOS  
            2. The latest supported Windows  
            3. A reasonably modern Linux distribution  
            4. The latest version of Docker

   4. #### **Performance**  {#performance}

      1. Pages should load within half a second  
      2. Database queries should take less than half a second to execute

   5. #### **Errors** {#errors}

      1. Client errors should   
         1. Be displayed to the user  
         2. Require user acknowledgement to dismiss  
         3. Allow errors to be reported to the developer

5. ### **System Evolution** {#system-evolution}

**Data Flow Diagram**

**Use Case Diagram**  
**High-Level System Architecture Diagram**

note: The relay server is an early concept, not included in the initial iteration of the SRS

**Scoring Box Circuit Diagram**  
