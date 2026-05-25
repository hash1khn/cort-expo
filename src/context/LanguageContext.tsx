import React, { createContext, useContext, useState, useCallback } from 'react';

export type Language = 'en' | 'ur';

// ─── Translations ────────────────────────────────────────────────────────────

const translations = {
  en: {
    getStarted: 'Get Started',
    byClickingGetStarted: 'By clicking Get Started, you agree to our',
    termsOfUse: 'Terms of Use',
    and: 'and',
    privacyPolicy: 'Privacy Policy',
    loginToYourAccount: 'Login to your account!',
    emailAddress: 'Email address',
    password: 'Password',
    forgotPassword: 'Forgot password?',
    logIn: 'Log in',
    wantToJoinFleet: 'Want to join our fleet?',
    applyAsChauffeur: 'Apply as Chauffeur',
    chauffeurApplication: 'Chauffeur Application',
    submitDetails: 'Submit your details for admin approval',
    fullName: 'Full Name',
    emailOptional: 'Email (optional)',
    phone: 'Phone',
    cnic: 'CNIC',
    licenseNumber: 'License number',
    carMake: 'Car make',
    carModel: 'Car model',
    modelYear: 'Model year',
    confirmApplication: 'Confirm Application',
    applicationSubmitted: 'Application Submitted!',
    ourTeamWillReview: 'Our team will review your application and contact you shortly.',
    forAnyQueries: 'For any queries, contact ',
    done: 'Done',
    profilePicture: 'Profile picture',
    drivingLicenseFront: 'Driving license (front)',
    drivingLicenseBack: 'Driving license (back)',
    cnicFront: 'CNIC (front)',
    cnicBack: 'CNIC (back)',
    carPhoto: 'Car photo',
    carRegistrationDoc: 'Car registration paper (photo)',
    tapToCapture: 'Tap to capture',
    tapToRetake: 'Tap to retake',
    saving: 'Saving…',
    optional: 'Optional',
  },
  ur: {
    getStarted: 'شروع کریں',
    byClickingGetStarted: '"شروع کریں" پر کلک کرکے آپ ہماری شرائط سے متفق ہوتے ہیں',
    termsOfUse: 'استعمال کی شرائط',
    and: 'اور',
    privacyPolicy: 'رازداری کی پالیسی',
    loginToYourAccount: 'اپنے اکاؤنٹ میں لاگ ان کریں!',
    emailAddress: 'ای میل ایڈریس',
    password: 'پاس ورڈ',
    forgotPassword: 'پاس ورڈ بھول گئے؟',
    logIn: 'لاگ ان',
    wantToJoinFleet: 'ہمارے فلیٹ میں شامل ہونا چاہتے ہیں؟',
    applyAsChauffeur: 'شوفر کے طور پر درخواست دیں',
    chauffeurApplication: 'شوفر کی درخواست',
    submitDetails: 'ایڈمن کی منظوری کے لیے اپنی تفصیلات جمع کرائیں',
    fullName: 'پورا نام',
    emailOptional: 'ای میل (اختیاری)',
    phone: 'فون',
    cnic: 'شناختی کارڈ نمبر',
    licenseNumber: 'لائسنس نمبر',
    carMake: 'گاڑی بنانے والی کمپنی',
    carModel: 'گاڑی کا ماڈل',
    modelYear: 'ماڈل کا سال',
    confirmApplication: 'درخواست کی تصدیق کریں',
    applicationSubmitted: 'درخواست جمع کر دی گئی!',
    ourTeamWillReview: 'ہماری ٹیم آپ کی درخواست کا جائزہ لے گی اور جلد ہی آپ سے رابطہ کرے گی۔',
    forAnyQueries: 'کسی بھی سوال کے لیے، رابطہ کریں ',
    done: 'ہو گیا',
    profilePicture: 'پروفائل تصویر',
    drivingLicenseFront: 'ڈرائیونگ لائسنس (سامنے)',
    drivingLicenseBack: 'ڈرائیونگ لائسنس (پیچھے)',
    cnicFront: 'شناختی کارڈ (سامنے)',
    cnicBack: 'شناختی کارڈ (پیچھے)',
    carPhoto: 'گاڑی کی تصویر',
    carRegistrationDoc: 'گاڑی کے رجسٹریشن پیپر (تصویر)',
    tapToCapture: 'تصویر لینے کے لیے ٹیپ کریں',
    tapToRetake: 'دوبارہ لینے کے لیے ٹیپ کریں',
    saving: 'محفوظ ہو رہا ہے...',
    optional: 'اختیاری',
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

// ─── Context ─────────────────────────────────────────────────────────────────

interface LanguageContextValue {
  language: Language;
  isRTL: boolean;
  t: (key: TranslationKey) => string;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  isRTL: false,
  t: (key) => translations.en[key],
  setLanguage: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      return translations[language][key] ?? translations.en[key];
    },
    [language]
  );

  const isRTL = language === 'ur';

  return (
    <LanguageContext.Provider value={{ language, isRTL, t, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLanguage() {
  return useContext(LanguageContext);
}
