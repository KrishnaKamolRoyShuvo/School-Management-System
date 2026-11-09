/**
 * @file translations.ts
 * @description Bilingual localization dictionary supporting English (`en`) and Bengali (`bn`).
 * Covers all navigation labels, BCN banner prompts, table headers, status badges, modal dialogs, and error messages.
 */

export type Language = 'en' | 'bn';

export const translations = {
  en: {
    // Brand & Header
    schoolName: "Onnorokom Ideal School",
    tagline: "Admission Management System · Academic Session 2026",
    admissionPortal: "Admission Portal",
    administration: "Administration",
    checkStatus: "Check Application Status",
    myApplications: "My Applications",
    classesNav: "Available Classes",
    
    // BCN Banner
    bcnPromptLabel: "Student Identification (Birth Certificate Number / BCN)",
    bcnPlaceholder: "Enter 17-digit birth certificate number (e.g. 20101234567890123)",
    setBcn: "Set BCN",
    changeBcn: "Change BCN",
    clearBcn: "Clear",
    bcnRequiredWarning: "Please enter a valid 17-digit birth certificate number to proceed with admission applications.",
    bcnMaskHint: "Toggle visibility",
    bcnActiveLabel: "Active BCN:",

    // Class Listing & Filters
    portalTitle: "School Admission Portal",
    portalSubtitle: "Select an open class to reserve a temporary seat for 10 minutes while you confirm your application.",
    filterSearchPlaceholder: "Search by class name or code...",
    filterClassAll: "All classes (Default)",
    filterShiftAll: "All shifts (Default)",
    filterConditionAll: "All conditions (Default)",
    filterReset: "Reset filters",
    filterTabAll: "All",
    filterTabAvailable: "Available",
    filterTabAlmostFull: "Almost full",
    filterTabEmpty: "Empty classes",
    filterTabFull: "Full",
    showingClasses: "Showing {count} of {total} classes",
    
    // Table Headers
    colCode: "CODE",
    colClassName: "CLASS NAME",
    colShift: "SHIFT",
    colTotalSeats: "TOTAL SEATS",
    colConfirmed: "CONFIRMED",
    colHeld: "HELD",
    colAvailable: "AVAILABLE",
    colOccupancy: "OCCUPANCY",
    colCondition: "CONDITION",
    colAction: "ACTION",
    
    // Shifts & Status
    shiftMorning: "Morning",
    shiftDay: "Day",
    statusOpen: "Open",
    statusAlmostFull: "Almost full",
    statusEmpty: "Empty class",
    statusFull: "Full",
    statusHeld: "HELD",
    statusConfirmed: "CONFIRMED",
    statusExpired: "EXPIRED",
    statusCancelled: "CANCELLED",
    
    // Actions
    btnApplySeat: "Apply for a seat",
    btnConfirmSeat: "Confirm Seat",
    btnCancelReservation: "Cancel Reservation",
    btnViewApplication: "View Application",
    btnBackHome: "Back to Class List",
    btnNewApplication: "New Application",
    
    // Countdown Screen
    reservationActiveTitle: "Seat Temporarily Reserved",
    reservationDesc: "Your seat has been reserved. Please confirm your application before the timer expires.",
    timeRemaining: "Time remaining to confirm:",
    holdExpiresAt: "Expires at:",
    holdCreated: "Created:",
    holdClass: "Class & Shift:",
    holdStudentId: "Student BCN:",
    confirmSuccessTitle: "Admission Application Confirmed!",
    confirmSuccessDesc: "Your seat is now confirmed in the academic roster.",
    holdExpiredTitle: "Reservation Expired",
    holdExpiredDesc: "Your temporary seat hold has expired and the seat has been released to other applicants.",
    holdCancelledTitle: "Reservation Cancelled",
    holdCancelledDesc: "You have cancelled this seat hold.",
    
    // Admin
    adminTitle: "Admission Administration",
    adminSubtitle: "Manage class capacity and review student admission applications.",
    tabClassesCapacity: "Classes & Capacity",
    tabApplications: "Applications",
    btnAddClass: "Add class",
    statClasses: "CLASSES",
    statTotalSeats: "TOTAL SEATS",
    statConfirmed: "CONFIRMED",
    statHeld: "HELD",
    statAvailable: "AVAILABLE",
    
    // Add Class Modal
    modalAddClassTitle: "Add New Class",
    modalSelectClass: "Select Class",
    modalSelectShift: "Select Shift",
    modalTotalSeats: "Total Seats",
    modalTotalSeatsPlaceholder: "Choose between 1 to 120",
    modalAvailableSeats: "Available Seats",
    modalAvailableSeatsPlaceholder: "Initial seats available (0 to Total)",
    modalCancel: "Cancel",
    modalSubmit: "Create Class",
    
    // Warning Dialogs
    warningZeroSeatsTitle: "Zero Available Seats Warning",
    warningZeroSeatsBody: "There are no available seats for application in this class (Available Seats = 0). Do you really want to add this class?",
    btnConfirmAddClassAnyway: "Yes, create class anyway",
    
    // Errors
    networkError: "We could not connect to the server. Please try again.",
    existingHeldApp: "You already have an ongoing application. Redirecting you to it.",
    existingConfirmedApp: "You already have a confirmed admission and cannot apply again.",
    noSeatsAvailable: "No seats are currently available in this class.",
  },
  bn: {
    // Brand & Header
    schoolName: "অন্যরকম আইডিয়াল স্কুল",
    tagline: "ভর্তি ব্যবস্থাপনা সিস্টেম · শিক্ষাবর্ষ ২০২৬",
    admissionPortal: "ভর্তি পোর্টাল",
    administration: "প্রশাসন (/admin)",
    checkStatus: "আবেদনের অবস্থা যাচাই",
    myApplications: "আমার আবেদনসমূহ",
    classesNav: "শ্রেণির তালিকা",
    
    // BCN Banner
    bcnPromptLabel: "শিক্ষার্থীর জন্ম নিবন্ধন নম্বর (BCN)",
    bcnPlaceholder: "১৭ ডিজিটের জন্ম নিবন্ধন নম্বর লিখুন (যেমন: ২০১০১২৩৪৫৬৭৮৯০১২৩)",
    setBcn: "দাখিল করুন",
    changeBcn: "নম্বর পরিবর্তন",
    clearBcn: "মুছুন",
    bcnRequiredWarning: "ভর্তি আবেদন সম্পন্ন করার জন্য অনুগ্রহ করে আপনার ১৭ ডিজিটের জন্ম নিবন্ধন নম্বর প্রদান করুন।",
    bcnMaskHint: "নম্বর লুকান/দেখান",
    bcnActiveLabel: "সক্রিয় নিবন্ধন নম্বর:",

    // Class Listing & Filters
    portalTitle: "ভর্তি পোর্টাল",
    portalSubtitle: "আবেদন নিশ্চিত করার জন্য যেকোনো খালি শ্রেণিতে ১০ মিনিটের জন্য সাময়িক আসন সংরক্ষণ করুন।",
    filterSearchPlaceholder: "শ্রেণির নাম দিয়ে খুঁজুন...",
    filterClassAll: "সব শ্রেণি (ডিফল্ট)",
    filterShiftAll: "সব শিফট (ডিফল্ট)",
    filterConditionAll: "সব অবস্থা (ডিফল্ট)",
    filterReset: "সব ফিল্টার রিসেট করুন",
    filterTabAll: "সকল",
    filterTabAvailable: "খালি আছে",
    filterTabAlmostFull: "প্রায় পূর্ণ",
    filterTabEmpty: "সম্পূর্ণ খালি",
    filterTabFull: "আসন পূর্ণ",
    showingClasses: "দেখানো হচ্ছে {count} মোট {total} টি শ্রেণি",
    
    // Table Headers
    colCode: "কোড",
    colClassName: "শ্রেণির নাম",
    colShift: "শিফট",
    colTotalSeats: "মোট আসন",
    colConfirmed: "নিশ্চিত",
    colHeld: "হোল্ড",
    colAvailable: "খালি আসন",
    colOccupancy: "পূরণকৃত হার",
    colCondition: "আসনের অবস্থা",
    colAction: "পদক্ষেপ",
    
    // Shifts & Status
    shiftMorning: "প্রভাত",
    shiftDay: "দিবা",
    statusOpen: "খালি আছে",
    statusAlmostFull: "প্রায় পূর্ণ",
    statusEmpty: "সম্পূর্ণ খালি",
    statusFull: "আসন পূর্ণ",
    statusHeld: "হোল্ড",
    statusConfirmed: "নিশ্চিত",
    statusExpired: "মেয়াদোত্তীর্ণ",
    statusCancelled: "বাতিলকৃত",
    
    // Actions
    btnApplySeat: "আবেদন করুন",
    btnConfirmSeat: "আসন নিশ্চিত করুন",
    btnCancelReservation: "সংরক্ষণ বাতিল করুন",
    btnViewApplication: "আবেদন দেখুন",
    btnBackHome: "হোমপেজে ফিরে যান",
    btnNewApplication: "অন্য শিক্ষার্থীর আবেদন",
    
    // Countdown Screen
    reservationActiveTitle: "সাময়িক আসন সংরক্ষিত হয়েছে",
    reservationDesc: "আপনার আসন সাময়িকভাবে সংরক্ষিত হয়েছে। সময় শেষ হওয়ার আগেই আপনার আবেদন নিশ্চিত করুন।",
    timeRemaining: "নিশ্চিত করার বাকি সময়:",
    holdExpiresAt: "মেয়াদ শেষ হবে:",
    holdCreated: "আবেদনের সময়:",
    holdClass: "শ্রেণি ও শিফট:",
    holdStudentId: "শিক্ষার্থীর জন্ম নিবন্ধন নম্বর:",
    confirmSuccessTitle: "ভর্তি নিশ্চিতকরণ সফল হয়েছে!",
    confirmSuccessDesc: "আপনার আসনটি শিক্ষাবর্ষের মূল তালিকায় নিশ্চিত করা হয়েছে।",
    holdExpiredTitle: "আবেদনের মেয়াদ শেষ হয়ে গেছে",
    holdExpiredDesc: "আপনার ১০ মিনিটের সাময়িক সংরক্ষণের মেয়াদ শেষ হওয়ায় আসনটি অন্যদের জন্য উন্মুক্ত করা হয়েছে।",
    holdCancelledTitle: "আবেদন বাতিল করা হয়েছে",
    holdCancelledDesc: "আপনি সাময়িক আসন সংরক্ষণ বাতিল করেছেন।",
    
    // Admin
    adminTitle: "ভর্তি প্রশাসন প্যানেল",
    adminSubtitle: "শ্রেণির আসন সংখ্যা পরিচালনা এবং শিক্ষার্থীদের আবেদন পর্যবেক্ষণ করুন।",
    tabClassesCapacity: "শ্রেণি ও আসন",
    tabApplications: "সকল আবেদন",
    btnAddClass: "নতুন শ্রেণি যোগ করুন",
    statClasses: "শ্রেণি সংখ্যা",
    statTotalSeats: "মোট আসন",
    statConfirmed: "নিশ্চিত",
    statHeld: "হোল্ড",
    statAvailable: "খালি আসন",
    
    // Add Class Modal
    modalAddClassTitle: "নতুন শ্রেণি যোগ করুন",
    modalSelectClass: "শ্রেণি নির্বাচন করুন",
    modalSelectShift: "শিফট নির্বাচন করুন",
    modalTotalSeats: "মোট আসন",
    modalTotalSeatsPlaceholder: "১ থেকে ১২০ এর মধ্যে বেছে নিন",
    modalAvailableSeats: "খালি আসন",
    modalAvailableSeatsPlaceholder: "প্রাথমিক খালি আসন (০ থেকে মোট আসন)",
    modalCancel: "বাতিল",
    modalSubmit: "শ্রেণি তৈরি করুন",
    
    // Warning Dialogs
    warningZeroSeatsTitle: "কোনো আসন খালি নেই সতর্কবার্তা",
    warningZeroSeatsBody: "এই শ্রেণিতে আবেদনের জন্য কোনো আসন খালি রাখা হয়নি (খালি আসন = ০)। আপনি কি সত্যিই এই শ্রেণিটি যোগ করতে চান?",
    btnConfirmAddClassAnyway: "হ্যাঁ, তবুও যোগ করুন",
    
    // Errors
    networkError: "সার্ভারে যোগাযোগ করা সম্ভব হয়নি। অনুগ্রহ করে পুনরায় চেষ্টা করুন।",
    existingHeldApp: "এই শিক্ষার্থীর নামে ইতিমধ্যে একটি আবেদন চলমান রয়েছে।",
    existingConfirmedApp: "এই শিক্ষার্থীর একটি আসন ইতিমধ্যে নিশ্চিত করা হয়েছে। নতুন আবেদন সম্ভব নয়।",
    noSeatsAvailable: "এই শ্রেণিতে বর্তমানে কোনো আসন খালি নেই।",
  }
};
