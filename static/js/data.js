// Data for the entire portfolio website
export const portfolioData = {
    personal: {
        name: "Dharshan Keba Morris",
        title: "Biomedical Engineer",
        subtitle: "Advancing Medical Technologies through Robotics & AI",
        university: "University of Dundee",
        degree: "Masters in Biomedical Engineering",
        email: "dharshan.keba.2000@gmail.com",
        professional_email: "dharshankeba.universityofdundee@gmail.com",
        linkedin: "www.linkedin.com/in/dharshan-keba-432512168",
        github: "https://github.com/Dharshan212",
        researchgate: "https://www.researchgate.net/profile/Dharshan-Keba-Morris?ev=hdr_xprf"
    },
    
    skills: [
        {
            category: "Programming",
            items: ["Python", "SQL", "MATLAB"]
        },
        {
            category: "Robotics",
            items: ["ROS (Robot Operating System)", "Control Systems", "Automation"]
        },
        {
            category: "AI & ML",
            items: ["Machine Learning", "Data Analysis", "Predictive Modeling"]
        },
        {
            category: "Medical Technology",
            items: ["Medical Device Development", "Patient Monitoring", "Anesthesia Systems"]
        }
    ],

    publications: [
        // Your existing publications
        // Inside portfolioData.projects array in data.js

        {
            id: 1,
            title: "Automated Anesthesia Control System With Patient Monitoring",
            year: "2023", 
            journal: "<strong>ResearchGate</strong>",
            url: "https://www.researchgate.net/publication/364667455_Automated_Anesthesia_Control_System_With_Patient_Monitoring",
            abstract: "Providing painless surgery and delivering an accurate dose of anesthesia to the patient plays a very crucial role in any major surgeries. Failing in providing an accurate dose to the patient may show adverse effects and postoperative complications. In case of major surgeries which could take a longer period, the complete dosage of anesthesia could not be administered in a single dose to the patient since it may show lethal complications. Administering less dose of anesthesia makes the patient regain consciousness during the surgery. It is not easy for the anesthetist to deliver an accurate dose of anesthesia at regular intervals of time. To overcome such complications during surgeries a computer-controlled syringe is designed to deliver an accurate dose of anesthesia at regular intervals of time with constant speed. Therefore this project aims to introduce an automatic anesthesia control system integrating with monitoring parameters using Arduino Uno.",
            tags: ["Arduino", "Open Source", "Medical Technology"]
        },
        {
            id: 2,
            title: "Open-Source Control Platform for Medical Robot Using Standard Components",
            year: "2025", 
            journal: "<strong>ResearchGate</strong>",
            url: "https://www.researchgate.net/publication/395442742_OPEN-SOURCE_CONTROL_PLATFORM_FOR_MEDICAL_ROBOT_USING_STANDARD_COMPONENTS",
            abstract: "Colonoscopy is the gold standard for colorectal cancer screening but requires extensive training on simulators that are often prohibitively expensive. This project bridges that gap by designing, implementing, and validating a fully open-source hardware and software control platform. Our system utilizes an ESP32-WROOM-32D microcontroller to process inputs from a Bluetooth-connected Xbox controller via the Bluepad32 library. It features interrupt-driven servo control for smooth motion, input filtering to eliminate jitter, and a real-time serial data output for performance validation",
            tags: ["Robotics", "Open Source", "Medical Technology"]
        },
    ],

    projects: [
        // Your general projects
        {
            id: 1,
            title: "Intelligent Anesthesia Monitoring System",
            description: "Advanced patient monitoring system with automated anesthesia control using machine learning algorithms for optimal drug delivery.",
            technologies: ["Python", "Machine Learning", "ROS", "Medical Sensors"],
            status: "Published Research",
            link: "https://www.researchgate.net/publication/364667455_Automated_Anesthesia_Control_System_With_Patient_Monitoring"
        },
        {
            id: 2,
            title: "Medical Robot Control Platform",
            description: "Open-source control platform designed for medical robotics using standard components, making advanced medical robotics more accessible.",
            technologies: ["ROS", "Python", "Control Systems", "Embedded Systems"],
            status: "Published Research", 
            link: "https://www.researchgate.net/publication/395442742_OPEN-SOURCE_CONTROL_PLATFORM_FOR_MEDICAL_ROBOT_USING_STANDARD_COMPONENTS"
        },
        {
            id: 3, // Ensure this ID matches the one you use for the detail page link!
            title: "PROJECT MYELIN — Behavioral Telemetry & Focus-Regulation System",
            description: "A research-grade desktop telemetry platform built to monitor digital distraction patterns in real time. Unlike standard screen-time trackers, MYELIN models cognitive recovery dynamics by measuring return-to-focus latency using an adaptive mathematical dopamine-regulation model.",
            technologies: ["Python 3.13", "pywin32 / psutil", "SQLite", "matplotlib", "Control Theory"],
            status: "In Progress",
            link: "myelin-hub.html" // Replace with your actual repository link when ready
        }
     
    ]
};