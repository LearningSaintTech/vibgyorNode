// Profile completion step constants and utilities

export const PROFILE_STEPS = {
  BASIC_INFO: 'basic_info',
  GENDER: 'gender', 
  PRONOUNS: 'pronouns',
  LIKES_INTERESTS: 'likes_interests',
  PREFERENCES: 'preferences',
  ID_UPLOAD: 'id_upload',
  LOCATION: 'location',
  COMPLETED: 'completed'
};

export const PROFILE_STEP_ORDER = [
  PROFILE_STEPS.BASIC_INFO,
  PROFILE_STEPS.GENDER,
  PROFILE_STEPS.PRONOUNS,
  PROFILE_STEPS.LIKES_INTERESTS,
  PROFILE_STEPS.PREFERENCES,
  PROFILE_STEPS.ID_UPLOAD,
  PROFILE_STEPS.LOCATION,
  PROFILE_STEPS.COMPLETED
];

export const PROFILE_STEP_CONFIG = {
  [PROFILE_STEPS.BASIC_INFO]: {
    title: 'Basic Information',
    description: 'Tell us about yourself',
    fields: ['fullName', 'username', 'email', 'dob', 'bio'],
    required: true
  },
  [PROFILE_STEPS.GENDER]: {
    title: 'Your Gender',
    description: 'How do you identify?',
    fields: ['gender'],
    required: true
  },
  [PROFILE_STEPS.PRONOUNS]: {
    title: 'Your Pronouns',
    description: 'How should people refer to you?',
    fields: ['pronouns'],
    required: true
  },
  [PROFILE_STEPS.LIKES_INTERESTS]: {
    title: 'Likes & Interests',
    description: 'What are you into?',
    fields: ['likes', 'interests'],
    required: true
  },
  [PROFILE_STEPS.PREFERENCES]: {
    title: 'Your Preferences',
    description: 'Tell us your preferences',
    fields: ['preferences.hereFor', 'preferences.primaryLanguage', 'preferences.secondaryLanguage'],
    required: true
  },
  [PROFILE_STEPS.ID_UPLOAD]: {
    title: 'Identity Verification',
    description: 'Upload your ID for verification',
    fields: ['idProofUrl'],
    required: true
  },
  [PROFILE_STEPS.LOCATION]: {
    title: 'Your Location',
    description: 'Where are you based?',
    fields: ['location'],
    required: true
  }
};

// Validation functions for each step
export const validateStep = (step, userData) => {
  switch (step) {
    case PROFILE_STEPS.BASIC_INFO:
      return !!(userData.fullName && userData.username && userData.email && userData.dob && userData.bio);
    
    case PROFILE_STEPS.GENDER:
      return !!(userData.gender);
    
    case PROFILE_STEPS.PRONOUNS:
      return !!(userData.pronouns);
    
    case PROFILE_STEPS.LIKES_INTERESTS:
      return !!(userData.likes && userData.likes.length > 0 && userData.interests && userData.interests.length > 0);
    
    case PROFILE_STEPS.PREFERENCES:
      return !!(userData.preferences && userData.preferences.hereFor && userData.preferences.primaryLanguage);
    
    case PROFILE_STEPS.ID_UPLOAD:
      return !!(userData.idProofUrl);
    
    case PROFILE_STEPS.LOCATION:
      return !!(userData.location && userData.location.city && userData.location.country);
    
    default:
      return false;
  }
};

// Get the next step in the flow
export const getNextStep = (currentStep) => {
  const currentIndex = PROFILE_STEP_ORDER.indexOf(currentStep);
  if (currentIndex === -1 || currentIndex >= PROFILE_STEP_ORDER.length - 1) {
    return PROFILE_STEPS.COMPLETED;
  }
  return PROFILE_STEP_ORDER[currentIndex + 1];
};

// Get the previous step in the flow
export const getPreviousStep = (currentStep) => {
  const currentIndex = PROFILE_STEP_ORDER.indexOf(currentStep);
  if (currentIndex <= 0) {
    return null;
  }
  return PROFILE_STEP_ORDER[currentIndex - 1];
};

// Get step progress percentage
export const getStepProgress = (currentStep) => {
  const currentIndex = PROFILE_STEP_ORDER.indexOf(currentStep);
  if (currentIndex === -1) return 0;
  return Math.round((currentIndex / (PROFILE_STEP_ORDER.length - 1)) * 100);
};
