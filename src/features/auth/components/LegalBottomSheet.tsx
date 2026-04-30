import React, { useCallback, useMemo, forwardRef } from 'react';
import { StyleSheet, Text } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../../core/theme';

export type LegalDocumentType = 'terms' | 'privacy';

type Props = {
  type: LegalDocumentType;
};

export const LegalBottomSheet = forwardRef<BottomSheetModal, Props>(({ type }, ref) => {
  const snapPoints = useMemo(() => ['90%'], []);
  const insets = useSafeAreaInsets();

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
      />
    ),
    []
  );

  const title = type === 'terms' ? 'Terms of Use' : 'Privacy Policy';
  const termsContent = `Terms & Conditions

These terms and conditions apply to the Traflinq app (hereby referred to as "Application") for mobile devices that was created by Cort Technologies (hereby referred to as "Service Provider") as a Free service.

Upon downloading or utilizing the Application, you are automatically agreeing to the following terms. It is strongly advised that you thoroughly read and understand these terms prior to using the Application.

Unauthorized copying, modification of the Application, any part of the Application, or our trademarks is strictly prohibited. Any attempts to extract the source code of the Application, translate the Application into other languages, or create derivative versions are not permitted. All trademarks, copyrights, database rights, and other intellectual property rights related to the Application remain the property of the Service Provider.

The Service Provider is dedicated to ensuring that the Application is as beneficial and efficient as possible. As such, they reserve the right to modify the Application or charge for their services at any time and for any reason. The Service Provider assures you that any charges for the Application or its services will be clearly communicated to you.

The Application stores and processes personal data that you have provided to the Service Provider in order to provide the Service. It is your responsibility to maintain the security of your phone and access to the Application. The Service Provider strongly advise against jailbreaking or rooting your phone, which involves removing software restrictions and limitations imposed by the official operating system of your device. Such actions could expose your phone to malware, viruses, malicious programs, compromise your phone's security features, and may result in the Application not functioning correctly or at all.

Please note that the Application utilizes third-party services that have their own Terms and Conditions. Below are the links to the Terms and Conditions of the third-party service providers used by the Application:

Google Play Services
Expo

Please be aware that the Service Provider does not assume responsibility for certain aspects. Some functions of the Application require an active internet connection, which can be Wi-Fi or provided by your mobile network provider. The Service Provider cannot be held responsible if the Application does not function at full capacity due to lack of access to Wi-Fi or if you have exhausted your data allowance.

If you are using the application outside of a Wi-Fi area, please be aware that your mobile network provider's agreement terms still apply. Consequently, you may incur charges from your mobile provider for data usage during the connection to the application, or other third-party charges. By using the application, you accept responsibility for any such charges, including roaming data charges if you use the application outside of your home territory (i.e., region or country) without disabling data roaming. If you are not the bill payer for the device on which you are using the application, they assume that you have obtained permission from the bill payer.

Similarly, the Service Provider cannot always assume responsibility for your usage of the application. For instance, it is your responsibility to ensure that your device remains charged. If your device runs out of battery and you are unable to access the Service, the Service Provider cannot be held responsible.

In terms of the Service Provider's responsibility for your use of the application, it is important to note that while they strive to ensure that it is updated and accurate at all times, they do rely on third parties to provide information to them so that they can make it available to you. The Service Provider accepts no liability for any loss, direct or indirect, that you experience as a result of relying entirely on this functionality of the application.

The Service Provider may wish to update the application at some point. The application is currently available as per the requirements for the operating system (and for any additional systems they decide to extend the availability of the application to) may change, and you will need to download the updates if you want to continue using the application. The Service Provider does not guarantee that it will always update the application so that it is relevant to you and/or compatible with the particular operating system version installed on your device. However, you agree to always accept updates to the application when offered to you. The Service Provider may also wish to cease providing the application and may terminate its use at any time without providing termination notice to you. Unless they inform you otherwise, upon any termination, (a) the rights and licenses granted to you in these terms will end; (b) you must cease using the application, and (if necessary) delete it from your device.

Changes to These Terms and Conditions
The Service Provider may periodically update their Terms and Conditions. Therefore, you are advised to review this page regularly for any changes. The Service Provider will notify you of any changes by posting the new Terms and Conditions on this page.

These terms and conditions are effective as of 2026-04-25

Contact Us
If you have any questions or suggestions about the Terms and Conditions, please do not hesitate to contact the Service Provider at corttechnologies@gmail.com.`;
  const privacyContent = `Privacy Policy
Effective as of 2026-04-25

This privacy policy is applicable to the Traflinq app (hereinafter referred to as "Application") for mobile devices, which was developed by Cort Technologies (hereinafter referred to as "Service Provider") as a Free service. This service is provided "AS IS".

What information does the Application obtain and how is it used?
The Application acquires the information you supply when you download and register the Application. Registration with the Service Provider is not mandatory. However, bear in mind that you might not be able to utilize some of the features offered by the Application unless you register with them.

The Service Provider may also use the information you provided them to contact you from time to time to provide you with important information, required notices and marketing promotions.

What information does the Application collect automatically?
In addition, the Application may collect certain information automatically, including, but not limited to, the type of mobile device you use, your mobile devices unique device ID, the IP address of your mobile device, your mobile operating system, the type of mobile Internet browsers you use, and information about the way you use the Application.

Does the Application collect precise real time location information of the device?
This Application collects your device's location, which helps the Service Provider determine your approximate geographical location and make use of in below ways:

Geolocation Services: The Service Provider utilizes location data to provide features such as personalized content, relevant recommendations, and location-based services.
Analytics and Improvements: Aggregated and anonymized location data helps the Service Provider to analyze user behavior, identify trends, and improve the overall performance and functionality of the Application.
Third-Party Services: Periodically, the Service Provider may transmit anonymized location data to external services. These services assist them in enhancing the Application and optimizing their offerings.

Does the Application use Artificial Intelligence (AI) technologies?
The Application does not use Artificial Intelligence (AI) technologies to process your data or provide features.

Do third parties see and/or have access to information obtained by the Application?
Only aggregated, anonymized data is periodically transmitted to external services to aid the Service Provider in improving the Application and their service. The Service Provider may share your information with third parties in the ways that are described in this privacy statement.

Please note that the Application utilizes third-party services that have their own Privacy Policy about handling data. Below are the links to the Privacy Policy of the third-party service providers used by the Application:

Google Play Services
Expo

The Service Provider may disclose User Provided and Automatically Collected Information:

as required by law, such as to comply with a subpoena, or similar legal process;
when they believe in good faith that disclosure is necessary to protect their rights, protect your safety or the safety of others, investigate fraud, or respond to a government request;
with their trusted services providers who work on their behalf, do not have an independent use of the information we disclose to them, and have agreed to adhere to the rules set forth in this privacy statement.

What are my opt-out rights?
You can halt all collection of information by the Application easily by uninstalling the Application. You may use the standard uninstall processes as may be available as part of your mobile device or via the mobile application marketplace or network.

What is the data retention policy and how can you manage your information?
The Service Provider will retain User Provided data for as long as you use the Application and for a reasonable time thereafter. The Service Provider will retain Automatically Collected information for up to 24 months and thereafter may store it in aggregate. If you'd like the Service Provider to delete User Provided Data that you have provided via the Application, please contact them at corttechnologies562@gmail.com and we will respond in a reasonable time.

How does the Application address children's privacy?
The Service Provider does not use the Application to knowingly solicit data from or market to children under the age of 13. The Application does not address anyone under the age of 13. In the case the Service Provider discover that a child under 13 has provided personal information, the Service Provider will immediately delete this from their servers. If you are a parent or guardian and you are aware that your child has provided us with personal information, please contact the Service Provider (contact@traflinq.com) so that they will be able to take the necessary actions.

How is your information kept secure?
The Service Provider are concerned about safeguarding the confidentiality of your information. The Service Provider provide physical, electronic, and procedural safeguards to protect information we process and maintain. For example, we limit access to this information to authorized employees and contractors who need to know that information in order to operate, develop or improve their Application.

How will you be informed of changes to this Privacy Policy?
This Privacy Policy may be updated from time to time for any reason. The Service Provider will notify you of any changes to the Privacy Policy by updating this page with the new Privacy Policy. You are advised to consult this Privacy Policy regularly for any changes, as continued use is deemed approval of all changes.

How do you give your consent?
By using the Application, you are giving your consent to the Service Provider processing of your information as set forth in this Privacy Policy now and as amended by us. "Processing," means using cookies on a computer/hand held device or using or touching information in any way, including, but not limited to, collecting, storing, deleting, using, combining and disclosing information.

How can you contact us?
If you have any questions regarding privacy while using the Application, or have questions about the practices, please contact the Service Provider via email at contact@traflinq.com`;
  const content = type === 'terms' ? termsContent : privacyContent;

  return (
    <BottomSheetModal
      ref={ref}
      index={1}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
      topInset={insets.top}
    >
      <BottomSheetScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingTop: 16, paddingBottom: insets.bottom + 24 },
        ]}
      >
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.contentText}>{content}</Text>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: colors.text,
  },
  scroll: {
    flex: 1,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
    opacity: 0.8,
  },
});
